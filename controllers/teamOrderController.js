const productService = require('../services/productService');
const teamOrderService = require('../services/teamOrderService');
const stripeService = require('../services/stripeService');

const FORMULE_PRICE = 7.50;
const MAX_TEAM_ORDERS_PER_SLOT = 3;
const DELIVERY_SLOTS = ['11:00', '13:00', '15:00'];

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
  const slotsWithAvailability = [];

  for (const slotTime of DELIVERY_SLOTS) {
    const effectiveSlot = getEffectiveSlot(slotTime);
    const count = await teamOrderService.countTeamOrdersBySlot(effectiveSlot.value);
    const isFull = count >= MAX_TEAM_ORDERS_PER_SLOT;

    slotsWithAvailability.push({
      ...effectiveSlot,
      count,
      max: MAX_TEAM_ORDERS_PER_SLOT,
      isFull,
      isClosed: false,
      isUnavailable: isFull
    });
  }

  return slotsWithAvailability;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

function buildSandwichOptions(product, body, basePrice) {
  let finalPrice = Number(basePrice);
  const options = [];

  const isJambon = (product.name || '').toLowerCase().includes('jambon');
  const sauceChoice = isJambon ? (body.sauce_choice || 'beurre') : null;
  const cruditesChoice = body.crudites_choice || 'avec';
  const cruditesList = normalizeArray(body.crudites);
  const extraEgg = body.extra_egg === 'on';
  const extraCheese = body.extra_cheese === 'on';

  if (sauceChoice) {
    options.push(sauceChoice);
  }

  if (cruditesChoice === 'sans') {
    options.push('sans crudités');
  } else {
    if (cruditesList.length > 0) {
      options.push(`crudités: ${cruditesList.join(', ')}`);
    } else {
      options.push('avec crudités');
    }
  }

  if (extraEgg) {
    finalPrice += 0.50;
    options.push('œuf');
  }

  if (extraCheese) {
    finalPrice += 0.50;
    options.push('tranche de fromage');
  }

  return {
    finalPrice,
    productNameWithOptions: `${product.name} (${options.join(', ')})`
  };
}

exports.getCreatePage = async (req, res) => {
  try {
    const slotsWithAvailability = await getSlotsWithAvailability();

    res.render('team-order-create', {
      title: 'Créer une commande d’équipe',
      error: null,
      old: {},
      slots: slotsWithAvailability
    });
  } catch (error) {
    console.error('Erreur getCreatePage:', error);
    res.status(500).send('Erreur chargement commande équipe');
  }
};

exports.createTeamOrder = async (req, res) => {
  try {
    const {
      team_name,
      contact_name,
      contact_phone,
      delivery_address,
      delivery_slot
    } = req.body;

    const slotsWithAvailability = await getSlotsWithAvailability();
    const selectedSlot = slotsWithAvailability.find(slot => slot.value === delivery_slot);

    if (!selectedSlot) {
      return res.status(400).render('team-order-create', {
        title: 'Créer une commande d’équipe',
        error: 'Créneau invalide. Merci de choisir un créneau disponible.',
        old: req.body,
        slots: slotsWithAvailability
      });
    }

    if (selectedSlot.isFull) {
      return res.status(400).render('team-order-create', {
        title: 'Créer une commande d’équipe',
        error: `Le créneau ${selectedSlot.label} est complet. Merci de choisir une autre heure.`,
        old: req.body,
        slots: slotsWithAvailability
      });
    }

    const teamOrder = await teamOrderService.createTeamOrder({
      team_name,
      contact_name,
      contact_phone,
      delivery_address,
      delivery_slot: selectedSlot.value,
      delivery_slot_label: selectedSlot.label,
      status: 'ouverte'
    });

    return res.redirect(`/team-order/${teamOrder.id}`);
  } catch (error) {
    console.error('Erreur createTeamOrder:', error);
    return res.status(500).send('Erreur création commande équipe');
  }
};

exports.getJoinPage = async (req, res) => {
  try {
    const teamOrderId = Number(req.params.id);
    const teamOrder = await teamOrderService.getTeamOrderById(teamOrderId);
    const products = await productService.getAllAvailableProducts();
    const items = await teamOrderService.getTeamOrderItems(teamOrderId);

    res.render('team-order-join', {
      title: `Commande équipe ${teamOrder.team_name}`,
      teamOrder,
      items,
      sandwiches: products.filter(p => p.category === 'sandwich'),
      boissons: products.filter(p => p.category === 'boisson'),
      desserts: products.filter(p => p.category === 'dessert')
    });
  } catch (error) {
    console.error('Erreur getJoinPage:', error);
    return res.status(500).send('Erreur chargement commande équipe');
  }
};

exports.addParticipantToTeamOrder = async (req, res) => {
  try {
    const teamOrderId = Number(req.params.id);
    const participantName = req.body.participant_name;
    const mode = req.body.mode;

    if (!participantName || !participantName.trim()) {
      return res.status(400).send('Nom participant obligatoire');
    }

    const products = await productService.getAllAvailableProducts();

    if (mode === 'sandwich' || mode === 'boisson' || mode === 'dessert') {
      const productId = Number(req.body.product_id);
      const quantity = Number(req.body.quantity) || 1;
      const product = products.find(p => p.id === productId);

      if (!product) {
        return res.redirect(`/team-order/${teamOrderId}`);
      }

      let finalPrice = Number(product.price);
      let finalName = product.name;

      if (mode === 'sandwich') {
        const sandwichOptions = buildSandwichOptions(product, req.body, product.price);
        finalPrice = sandwichOptions.finalPrice;
        finalName = sandwichOptions.productNameWithOptions;
      }

      await teamOrderService.addParticipantItem({
        team_order_id: teamOrderId,
        participant_name: participantName.trim(),
        product_id: product.id,
        item_type: 'single',
        product_name: finalName,
        unit_price: finalPrice,
        quantity
      });

      return res.redirect(`/team-order/${teamOrderId}`);
    }

    return res.redirect(`/team-order/${teamOrderId}`);
  } catch (error) {
    console.error('Erreur addParticipantToTeamOrder:', error);
    return res.status(500).send('Erreur ajout participant');
  }
};

exports.getTeamFormulePage = async (req, res) => {
  try {
    const teamOrderId = Number(req.params.id);
    const teamOrder = await teamOrderService.getTeamOrderById(teamOrderId);
    const products = await productService.getAllAvailableProducts();

    res.render('team-order-formule', {
      title: 'Formule équipe',
      teamOrder,
      sandwiches: products.filter(p => p.category === 'sandwich'),
      boissons: products.filter(p => p.category === 'boisson'),
      desserts: products.filter(p => p.category === 'dessert'),
      formulePrice: FORMULE_PRICE
    });
  } catch (error) {
    console.error('Erreur getTeamFormulePage:', error);
    res.status(500).send('Erreur chargement formule équipe');
  }
};

exports.addTeamFormule = async (req, res) => {
  try {
    const teamOrderId = Number(req.params.id);
    const products = await productService.getAllAvailableProducts();

    const participantName = req.body.participant_name;
    const sandwich = products.find(p => p.id === Number(req.body.sandwich_id));
    const boisson = products.find(p => p.id === Number(req.body.boisson_id));
    const dessert = products.find(p => p.id === Number(req.body.dessert_id));

    if (!participantName || !sandwich || !boisson || !dessert) {
      return res.status(400).send('Formule incomplète');
    }

    const sandwichOptions = buildSandwichOptions(sandwich, req.body, FORMULE_PRICE);

    await teamOrderService.addParticipantItem({
      team_order_id: teamOrderId,
      participant_name: participantName.trim(),
      product_id: sandwich.id,
      boisson_id: boisson.id,
      dessert_id: dessert.id,
      item_type: 'formule',
      product_name: `Formule : ${sandwichOptions.productNameWithOptions} + ${boisson.name} + ${dessert.name}`,
      unit_price: sandwichOptions.finalPrice,
      quantity: 1
    });

    return res.redirect(`/team-order/${teamOrderId}`);
  } catch (error) {
    console.error('Erreur addTeamFormule:', error);
    return res.status(500).send('Erreur ajout formule équipe');
  }
};

exports.getSummaryPage = async (req, res) => {
  try {
    const teamOrderId = Number(req.params.id);
    const teamOrder = await teamOrderService.getTeamOrderById(teamOrderId);
    const items = await teamOrderService.getTeamOrderItems(teamOrderId);

    const total = items.reduce((sum, item) => {
      return sum + Number(item.unit_price) * Number(item.quantity);
    }, 0);

    res.render('team-order-summary', {
      title: 'Résumé commande équipe',
      teamOrder,
      items,
      total
    });
  } catch (error) {
    console.error('Erreur getSummaryPage:', error);
    return res.status(500).send('Erreur résumé commande équipe');
  }
};

exports.createTeamOrderCheckoutSession = async (req, res) => {
  try {
    const teamOrderId = Number(req.params.id);
    const teamOrder = await teamOrderService.getTeamOrderById(teamOrderId);
    const items = await teamOrderService.getTeamOrderItems(teamOrderId);

    if (!items.length) {
      return res.redirect(`/team-order/${teamOrderId}/summary`);
    }

    const session = await stripeService.createTeamOrderCheckoutSession({
      teamOrder,
      items
    });

    await teamOrderService.updateTeamOrderStripeSessionId(teamOrderId, session.id);

    return res.redirect(session.url);
  } catch (error) {
    console.error('Erreur createTeamOrderCheckoutSession:', error);
    return res.status(500).send('Erreur paiement commande équipe');
  }
};

exports.handleTeamOrderPaymentSuccess = async (req, res) => {
  try {
    const teamOrderId = Number(req.params.id);
    const sessionId = req.query.session_id;

    if (!sessionId) {
      return res.status(400).send('Session Stripe manquante');
    }

    const stripeSession = await stripeService.retrieveCheckoutSession(sessionId);

    if (stripeSession.payment_status !== 'paid') {
      return res.status(400).send('Paiement non confirmé');
    }

    const teamOrder = await teamOrderService.getTeamOrderById(teamOrderId);

    if (teamOrder.status !== 'payée') {
      await teamOrderService.decrementStockFromTeamOrder(teamOrderId);
      await teamOrderService.updateTeamOrderStatus(teamOrderId, 'payée');
    }

    const updatedTeamOrder = await teamOrderService.getTeamOrderById(teamOrderId);
    const items = await teamOrderService.getTeamOrderItems(teamOrderId);

    const total = items.reduce((sum, item) => {
      return sum + Number(item.unit_price) * Number(item.quantity);
    }, 0);

    res.render('team-order-summary', {
      title: 'Commande équipe confirmée',
      teamOrder: updatedTeamOrder,
      items,
      total
    });
  } catch (error) {
    console.error('Erreur handleTeamOrderPaymentSuccess:', error);
    return res.status(500).send('Erreur confirmation paiement équipe');
  }
};