const getCartTotal = require('../utils/getCartTotal');
const orderService = require('../services/orderService');
const stripeService = require('../services/stripeService');

const MAX_ORDERS_PER_SLOT = 10;
const DELIVERY_SLOTS = ['11:00', '13:00', '15:00'];

function isSlotClosed(slotTime) {
  const now = new Date();

  const [hours, minutes] = slotTime.split(':').map(Number);

  const slotDate = new Date();
  slotDate.setHours(hours, minutes, 0, 0);

  const cutoffDate = new Date(slotDate.getTime() - 50 * 60 * 1000);

  return now >= cutoffDate;
}

async function getSlotsWithAvailability() {
  const slotsWithAvailability = [];

  for (const slot of DELIVERY_SLOTS) {
    const count = await orderService.countOrdersBySlot(slot);
    const isFull = count >= MAX_ORDERS_PER_SLOT;
    const isClosed = isSlotClosed(slot);

    slotsWithAvailability.push({
      time: slot,
      count,
      max: MAX_ORDERS_PER_SLOT,
      isFull,
      isClosed,
      isUnavailable: isFull || isClosed
    });
  }

  return slotsWithAvailability;
}

exports.getCheckoutPage = async (req, res) => {
  try {
    const cart = req.session.cart || [];

    if (!cart.length) {
      return res.redirect('/cart');
    }

    const total = getCartTotal(cart);
    const slots = await getSlotsWithAvailability();

    res.render('checkout', {
      title: 'Finaliser la commande',
      cart,
      total,
      slots,
      error: null,
      old: {}
    });
  } catch (error) {
    console.error('Erreur getCheckoutPage:', error);
    res.status(500).send('Erreur chargement paiement');
  }
};

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

    const slots = await getSlotsWithAvailability();
    const selectedSlot = slots.find(slot => slot.time === delivery_slot);
    const total = getCartTotal(cart);

    if (!selectedSlot) {
      return res.status(400).render('checkout', {
        title: 'Finaliser la commande',
        cart,
        total,
        slots,
        error: 'Créneau invalide. Merci de choisir un créneau disponible.',
        old: req.body
      });
    }

    if (selectedSlot.isClosed) {
      return res.status(400).render('checkout', {
        title: 'Finaliser la commande',
        cart,
        total,
        slots,
        error: `Les commandes pour ${delivery_slot.replace(':00', 'h')} sont clôturées 50 minutes avant la livraison. Merci de choisir un autre créneau.`,
        old: req.body
      });
    }

    if (selectedSlot.isFull) {
      return res.status(400).render('checkout', {
        title: 'Finaliser la commande',
        cart,
        total,
        slots,
        error: `Le créneau ${delivery_slot.replace(':00', 'h')} est complet. Merci de choisir une autre heure.`,
        old: req.body
      });
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

exports.handlePaymentSuccess = async (req, res) => {
  try {
    const sessionId = req.query.session_id;

    if (!sessionId) {
      return res.status(400).send('Session Stripe manquante');
    }

    const stripeSession = await stripeService.retrieveCheckoutSession(sessionId);

    if (stripeSession.payment_status !== 'paid') {
      return res.status(400).send('Paiement non confirmé');
    }

    const existingOrder = await orderService.getOrderByStripeSessionId(sessionId);

    if (existingOrder) {
      req.session.cart = [];
      req.session.pendingOrder = null;

      return res.render('confirmation', {
        title: 'Commande confirmée',
        order: existingOrder
      });
    }

    const cart = req.session.cart || [];
    const pendingOrder = req.session.pendingOrder;

    if (!cart.length || !pendingOrder) {
      return res.redirect('/menu');
    }

    const order = await orderService.createOrderWithItems(
      {
        ...pendingOrder,
        status: 'nouvelle',
        stripe_session_id: sessionId
      },
      cart
    );

    req.session.cart = [];
    req.session.pendingOrder = null;

    res.render('confirmation', {
      title: 'Commande confirmée',
      order
    });
  } catch (error) {
    console.error('Erreur handlePaymentSuccess:', error);
    res.status(500).send('Erreur confirmation paiement');
  }
};

exports.handlePaymentCancel = (req, res) => {
  res.render('cancel', {
    title: 'Paiement annulé'
  });
};