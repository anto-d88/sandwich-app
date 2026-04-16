const getCartTotal = require('../utils/getCartTotal');
const orderService = require('../services/orderService');
const stripeService = require('../services/stripeService');

exports.createCheckoutSession = async (req, res) => {
  try {
    const cart = req.session.cart || [];

    if (!cart.length) {
      return res.redirect('/cart');
    }

    const {
      customer_name,
      customer_phone,
      customer_email,
      company_name,
      delivery_address,
      delivery_slot
    } = req.body;

    const slotCount = await orderService.countOrdersBySlot(delivery_slot);
    const MAX_ORDERS_PER_SLOT = 10;

    if (slotCount >= MAX_ORDERS_PER_SLOT) {
      return res.status(400).send('Ce créneau est complet. Merci de choisir un autre horaire.');
    }

    const customer = {
      customer_name,
      customer_phone,
      customer_email,
      company_name,
      delivery_address,
      delivery_slot
    };

    req.session.pendingOrder = customer;

    const session = await stripeService.createCheckoutSession({
      cart,
      customer
    });

    return res.redirect(session.url);
  } catch (error) {
    console.error('Erreur createCheckoutSession:', error);
    return res.status(500).send(error.message || 'Erreur Stripe');
  }
};

exports.handleSuccess = async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    const cart = req.session.cart || [];

    if (!sessionId) {
      return res.status(400).send('Session Stripe manquante');
    }

    const stripeSession = await stripeService.retrieveCheckoutSession(sessionId);

    if (stripeSession.payment_status !== 'paid') {
      return res.status(400).send('Paiement non confirmé');
    }

    if (!cart.length) {
      return res.redirect('/menu');
    }

     const existingOrder = await orderService.getOrderByStripeSessionId(stripeSession.id);

    if (existingOrder) {
      req.session.cart = [];
      req.session.pendingOrder = null;

      return res.render('confirmation', {
        title: 'Commande confirmée',
        order: existingOrder
      });
    }

    const total = getCartTotal(cart);

    const pendingOrder = req.session.pendingOrder || {};

    const orderPayload = {
      customer_name: pendingOrder.customer_name || stripeSession.metadata.customer_name,
      customer_phone: pendingOrder.customer_phone || stripeSession.metadata.customer_phone,
      customer_email: pendingOrder.customer_email || stripeSession.metadata.customer_email,
      company_name: pendingOrder.company_name || stripeSession.metadata.company_name,
      delivery_address: pendingOrder.delivery_address || stripeSession.metadata.delivery_address,
      delivery_slot: pendingOrder.delivery_slot || stripeSession.metadata.delivery_slot,
      total_amount: total,
      status: 'nouvelle',
      stripe_session_id: stripeSession.id
    };

    const order = await orderService.createOrderWithItems(orderPayload, cart);

    
    req.session.cart = [];
    req.session.pendingOrder = null;

    return res.render('confirmation', {
      title: 'Commande confirmée',
      order
    });
  } catch (error) {
    console.error('Erreur handleSuccess:', error);
    return res.status(500).send('Erreur confirmation paiement');
  }
};

exports.handleCancel = async (req, res) => {
  return res.render('cancel', {
    title: 'Paiement annulé'
  });
};