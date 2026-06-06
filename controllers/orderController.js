const getCartTotal = require("../utils/getCartTotal");
const orderService = require("../services/orderService");
const stripeService = require("../services/stripeService");
const customerService = require("../services/customerService");
const adminService = require("../services/adminService");
const { sendOrderConfirmationEmail } = require("../services/emailService");

const MAX_ORDERS_PER_SLOT = 10;

function getParisNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
}

function normalizeSlotTime(slotTime) {
  return String(slotTime).slice(0, 5);
}

function formatHour(slotTime) {
  const clean = normalizeSlotTime(slotTime);
  return clean.replace(":00", "h").replace(":", "h");
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createSlotDate(slotTime, dayOffset = 0) {
  const now = getParisNow();
  const cleanSlotTime = normalizeSlotTime(slotTime);
  const [hours, minutes] = cleanSlotTime.split(":").map(Number);

  const slotDate = new Date(now);
  slotDate.setDate(slotDate.getDate() + dayOffset);
  slotDate.setHours(hours, minutes, 0, 0);

  return slotDate;
}

function isTodaySlotClosed(slotTime, slotType) {
  const now = getParisNow();
  const slotDate = createSlotDate(slotTime, 0);

  let cutoffMinutes = 50;

  if (slotType === "lunch" && normalizeSlotTime(slotTime) === "12:30") {
    cutoffMinutes = 90;
  }

  if (slotType === "breakfast") {
    cutoffMinutes = 12 * 60; // Petit-déj : à commander la veille
  }

  const cutoffDate = new Date(slotDate.getTime() - cutoffMinutes * 60 * 1000);

  return now >= cutoffDate;
}

function getEffectiveSlot(slotTime, slotType) {
  const cleanSlotTime = normalizeSlotTime(slotTime);
  const closedToday = isTodaySlotClosed(cleanSlotTime, slotType);
  const dayOffset = closedToday ? 1 : 0;
  const slotDate = createSlotDate(cleanSlotTime, dayOffset);

  const dayLabel = dayOffset === 0 ? "Aujourd’hui" : "Demain";
  const hourLabel = formatHour(cleanSlotTime);
  const label = `${dayLabel} ${hourLabel}`;
  const value = `${getDateKey(slotDate)}|${cleanSlotTime}`;

  return {
    time: cleanSlotTime,
    value,
    label,
    dayLabel,
    hourLabel,
    dateKey: getDateKey(slotDate),
    isTomorrow: dayOffset === 1,
  };
}

function isBreakfastItem(item) {
  const category = String(item.category || "").toLowerCase();
  const name = String(item.name || "").toLowerCase();

  return (
    category === "breakfast" ||
    category === "petit_dejeuner" ||
    category === "petit-dejeuner" ||
    name.includes("petit-déjeuner") ||
    name.includes("petit dejeuner") ||
    name.includes("croissant") ||
    name.includes("pain au chocolat") ||
    name.includes("viennoiserie")
  );
}

function getCartSlotType(cart) {
  const hasBreakfast = cart.some(isBreakfastItem);
  return hasBreakfast ? "breakfast" : "lunch";
}

async function getSlotsWithAvailability(slotType) {
  const allSlots = await adminService.getDeliverySlots();

  const activeSlots = allSlots.filter(slot => {
    return slot.slot_type === slotType && slot.active === true;
  });

  const slots = [];

  for (const slot of activeSlots) {
    const slotTime = normalizeSlotTime(slot.slot_time);
    const effectiveSlot = getEffectiveSlot(slotTime, slotType);
    const count = await orderService.countOrdersBySlot(effectiveSlot.value);
    const isFull = count >= MAX_ORDERS_PER_SLOT;

    slots.push({
      ...effectiveSlot,
      id: slot.id,
      slotType,
      count,
      max: MAX_ORDERS_PER_SLOT,
      isFull,
      isClosed: false,
      isUnavailable: isFull,
    });
  }

  return slots;
}

exports.getCheckoutPage = async (req, res) => {
  try {
    const cart = req.session.cart || [];

    if (!cart.length) {
      return res.redirect("/cart");
    }

    const settings = await adminService.getSettingsMap();

    if (settings.app_open === "false") {
      return res.redirect("/menu");
    }

    const slotType = getCartSlotType(cart);
    const total = getCartTotal(cart);
    const slots = await getSlotsWithAvailability(slotType);

    res.render("checkout", {
      title: "Finaliser la commande",
      cart,
      total,
      slots,
      slotType,
      error: null,
      old: {},
    });
  } catch (error) {
    console.error("Erreur getCheckoutPage:", error);
    res.status(500).send("Erreur chargement paiement");
  }
};

exports.createCheckoutSession = async (req, res) => {
  try {
    const cart = req.session.cart || [];

    if (!cart.length) {
      return res.redirect("/cart");
    }

    const settings = await adminService.getSettingsMap();

    if (settings.app_open === "false") {
      return res.redirect("/menu");
    }

    const slotType = getCartSlotType(cart);

    const {
      customer_name,
      customer_phone,
      customer_email,
      company_name,
      delivery_address,
      delivery_slot,
    } = req.body;

    const slots = await getSlotsWithAvailability(slotType);
    console.log("DELIVERY SLOT RECU :", delivery_slot);

console.log(
  "SLOTS DISPONIBLES :",
  slots.map(s => s.value)
);
    const selectedSlot = slots.find((slot) => slot.value === delivery_slot);
    const total = getCartTotal(cart);

    if (!selectedSlot) {
      return res.status(400).render("checkout", {
        title: "Finaliser la commande",
        cart,
        total,
        slots,
        slotType,
        error: "Créneau invalide. Merci de choisir un créneau disponible.",
        old: req.body,
      });
    }

    if (selectedSlot.isFull) {
      return res.status(400).render("checkout", {
        title: "Finaliser la commande",
        cart,
        total,
        slots,
        slotType,
        error: `Le créneau ${selectedSlot.label} est complet. Merci de choisir une autre heure.`,
        old: req.body,
      });
    }

    const customer = {
      customer_name,
      customer_phone,
      customer_email,
      company_name,
      delivery_address,
      delivery_slot: selectedSlot.value,
      delivery_slot_label: selectedSlot.label,
    };

    req.session.pendingOrder = customer;

    const session = await stripeService.createCheckoutSession({
      cart,
      customer,
    });

    return res.redirect(session.url);
  } catch (error) {
    console.error("Erreur createCheckoutSession:", error);
    return res.status(500).send(error.message || "Erreur Stripe");
  }
};

exports.handlePaymentSuccess = async (req, res) => {
  try {
    const sessionId = req.query.session_id;

    if (!sessionId) {
      return res.status(400).send("Session Stripe manquante");
    }

    const stripeSession = await stripeService.retrieveCheckoutSession(sessionId);

    if (stripeSession.payment_status !== "paid") {
      return res.status(400).send("Paiement non confirmé");
    }

    const existingOrder = await orderService.getOrderByStripeSessionId(sessionId);

    if (existingOrder) {
      req.session.cart = [];
      req.session.pendingOrder = null;

      return res.render("confirmation", {
        title: "Commande confirmée",
        order: existingOrder,
      });
    }

    const cart = req.session.cart || [];
    const pendingOrder = req.session.pendingOrder;

    if (!cart.length || !pendingOrder) {
      return res.redirect("/menu");
    }

    const order = await orderService.createOrderWithItems(
      {
        ...pendingOrder,
        status: "nouvelle",
        stripe_session_id: sessionId,
      },
      cart
    );

    try {
      await customerService.registerCustomerActivity({
        full_name: pendingOrder.customer_name,
        phone: pendingOrder.customer_phone,
        email: pendingOrder.customer_email,
        company_name: pendingOrder.company_name,
        company_address: pendingOrder.delivery_address,
        category: "client",
        source: "commande_individuelle",
        interaction_type: "commande",
        message: `Commande ${order.id} — ${cart.length} produit(s) — ${pendingOrder.delivery_slot_label}`,
        notes: "Commande individuelle payée",
      });
    } catch (customerError) {
      console.error("Erreur enregistrement client, commande confirmée quand même :", customerError);
    }

    try {
      await sendOrderConfirmationEmail({
        customer_name: pendingOrder.customer_name,
        customer_email: pendingOrder.customer_email,
        customer_phone: pendingOrder.customer_phone,
        company: pendingOrder.company_name,
        delivery_address: pendingOrder.delivery_address,
        delivery_slot: pendingOrder.delivery_slot_label,
        total_amount: getCartTotal(cart),
      });
      console.log("✅ Mail de confirmation envoyé");
    } catch (emailError) {
      console.error("Erreur envoi mail, commande confirmée quand même :", emailError);
    }

    req.session.cart = [];
    req.session.pendingOrder = null;

    return res.render("confirmation", {
      title: "Commande confirmée",
      order,
    });
  } catch (error) {
    console.error("Erreur handlePaymentSuccess:", error);
    return res.status(500).send("Erreur confirmation paiement");
  }
};

exports.handlePaymentCancel = (req, res) => {
  res.render("cancel", {
    title: "Paiement annulé",
  });
};

exports.testEmail = async (req, res) => {
  try {
    await sendOrderConfirmationEmail({
      customer_name: "Antonio",
      customer_email: "TON_EMAIL_ICI@gmail.com",
      company: "Lixem",
      delivery_address: "3 allée de la marque Wasquehal",
      delivery_slot: "Aujourd’hui 11h",
      total_amount: 16.5,
    });

    return res.send("✅ Mail test envoyé");
  } catch (error) {
    console.error(error);
    return res.status(500).send("❌ Erreur test mail");
  }
};