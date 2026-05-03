const getCartTotal = require('../utils/getCartTotal');
const orderService = require('../services/orderService');
const stripeService = require('../services/stripeService');

const MAX_ORDERS_PER_SLOT = 10;
const DELIVERY_SLOTS = ['11:00', '13:00', '15:00'];
const SHOP_OPEN= false;

function getParisNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
}

function formatHour(slotTime) {
  return slotTime.replace(':00', 'h');
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createSlotDate(slotTime, dayOffset = 0) {
  const now = getParisNow();
  const [hours, minutes] = slotTime.split(':').map(Number);

  const slotDate = new Date(now);
  slotDate.setDate(slotDate.getDate() + dayOffset);
  slotDate.setHours(hours, minutes, 0, 0);

  return slotDate;
}

function isTodaySlotClosed(slotTime) {
  const now = getParisNow();
  const slotDate = createSlotDate(slotTime, 0);
  const cutoffDate = new Date(slotDate.getTime() - 50 * 60 * 1000);

  return now >= cutoffDate;
}

function getEffectiveSlot(slotTime) {
  const closedToday = isTodaySlotClosed(slotTime);
  const dayOffset = closedToday ? 1 : 0;
  const slotDate = createSlotDate(slotTime, dayOffset);

  const dayLabel = dayOffset === 0 ? 'Aujourd’hui' : 'Demain';
  const hourLabel = formatHour(slotTime);
  const label = `${dayLabel} ${hourLabel}`;
  const value = `${getDateKey(slotDate)}|${slotTime}`;

  return {
    time: slotTime,
    value,
    label,
    dayLabel,
    hourLabel,
    dateKey: getDateKey(slotDate),
    isTomorrow: dayOffset === 1
  };
}

async function getSlotsWithAvailability() {
  const slots = [];

  for (const slotTime of DELIVERY_SLOTS) {
    const effectiveSlot = getEffectiveSlot(slotTime);
    const count = await orderService.countOrdersBySlot(effectiveSlot.value);
    const isFull = count >= MAX_ORDERS_PER_SLOT;

    slots.push({
      ...effectiveSlot,
      count,
      max: MAX_ORDERS_PER_SLOT,
      isFull,
      isClosed: false,
      isUnavailable: isFull
    });
  }

  return slots;
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
  if (!SHOP_OPEN) {
  return res.redirect('/checkout');
}
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
    const selectedSlot = slots.find(slot => slot.value === delivery_slot);
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

    if (selectedSlot.isFull) {
      return res.status(400).render('checkout', {
        title: 'Finaliser la commande',
        cart,
        total,
        slots,
        error: `Le créneau ${selectedSlot.label} est complet. Merci de choisir une autre heure.`,
        old: req.body
      });
    }

    const customer = {
      customer_name,
      customer_phone,
      customer_email,
      company_name,
      delivery_address,
      delivery_slot: selectedSlot.value,
      delivery_slot_label: selectedSlot.label
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
          console.log("🔥 SUCCESS CALLBACK TRIGGERED");
      console.log("SESSION ID:", req.query.session_id);
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