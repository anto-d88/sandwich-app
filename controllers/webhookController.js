const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const orderService = require('../services/orderService');
const teamOrderService = require('../services/teamOrderService');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handleWebhook = async (req, res) => {
  let event;

  try {
    const sig = req.headers['stripe-signature'];

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      console.log('💰 Paiement confirmé via webhook :', session.id);

      if (session.metadata?.type === 'team_order') {
        const teamOrderId = Number(session.metadata.team_order_id);

        if (!teamOrderId) {
          console.error('Webhook team_order sans team_order_id :', session.id);
          return res.status(200).send('OK');
        }

        const teamOrder = await teamOrderService.getTeamOrderById(teamOrderId);

        if (!teamOrder) {
          console.error('Commande équipe introuvable :', teamOrderId);
          return res.status(200).send('OK');
        }

        if (teamOrder.status !== 'payée') {
          await teamOrderService.decrementStockFromTeamOrder(teamOrderId);
          await teamOrderService.updateTeamOrderStatus(teamOrderId, 'payée');
          await teamOrderService.updateTeamOrderStripeSessionId(teamOrderId, session.id);

          console.log(`✅ Commande équipe #${teamOrderId} validée via webhook`);
        }

        return res.status(200).send('OK');
      }

      const existingOrder = await orderService.getOrderByStripeSessionId(session.id);

      if (!existingOrder) {
        const cart = JSON.parse(session.metadata.cart || '[]');

        const orderPayload = {
          customer_name: session.metadata.customer_name,
          customer_phone: session.metadata.customer_phone,
          customer_email: session.metadata.customer_email,
          company_name: session.metadata.company_name,
          delivery_address: session.metadata.delivery_address,
          delivery_slot: session.metadata.delivery_slot,
          total_amount: session.amount_total / 100,
          status: 'nouvelle',
          stripe_session_id: session.id
        };

        await orderService.createOrderWithItems(orderPayload, cart);
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).send('Webhook error');
  }
};