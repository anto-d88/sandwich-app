const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const orderService = require('../services/orderService');

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