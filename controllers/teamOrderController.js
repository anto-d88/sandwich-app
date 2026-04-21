const productService = require('../services/productService');
const teamOrderService = require('../services/teamOrderService');
const stripeService = require('../services/stripeService');

exports.getCreatePage = (req, res) => {
  res.render('team-order-create', {
    title: 'Créer une commande d’équipe'
  });
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

    const slotCount = await teamOrderService.countTeamOrdersBySlot(delivery_slot);
    const MAX_TEAM_ORDERS_PER_SLOT = 3;

    if (slotCount >= MAX_TEAM_ORDERS_PER_SLOT) {
      return res.status(400).send('Ce créneau équipe est complet. Merci de choisir un autre horaire.');
    }

    const teamOrder = await teamOrderService.createTeamOrder({
      team_name,
      contact_name,
      contact_phone,
      delivery_address,
      delivery_slot,
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

    const sandwiches = products.filter(p => p.category === 'sandwich');
    const boissons = products.filter(p => p.category === 'boisson');
    const desserts = products.filter(p => p.category === 'dessert');

    res.render('team-order-join', {
      title: `Commande équipe ${teamOrder.team_name}`,
      teamOrder,
      items,
      sandwiches,
      boissons,
      desserts
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

    const products = await productService.getAllAvailableProducts();

        if (mode === 'sandwich' || mode === 'boisson' || mode === 'dessert') {
      const productId = Number(req.body.product_id);
      const quantity = Number(req.body.quantity) || 1;

      const product = products.find(p => p.id === productId);

      if (!product) {
        return res.redirect(`/team-order/${teamOrderId}`);
      }

      await teamOrderService.addParticipantItem({
        team_order_id: teamOrderId,
        participant_name: participantName,
        product_id: product.id,
        product_name: product.name,
        unit_price: Number(product.price),
        quantity
      });

      return res.redirect(`/team-order/${teamOrderId}`);
    }

    if (mode === 'formule') {
      const sandwichId = Number(req.body.sandwich_id);
      const boissonId = Number(req.body.boisson_id);
      const dessertId = Number(req.body.dessert_id);

      const sandwich = products.find(p => p.id === sandwichId);
      const boisson = products.find(p => p.id === boissonId);
      const dessert = products.find(p => p.id === dessertId);

      if (!sandwich || !boisson || !dessert) {
        return res.status(400).send('Formule incomplète');
      }

      const totalSepare =
        Number(sandwich.price) +
        Number(boisson.price) +
        Number(dessert.price);

      const prixFormule = Number((totalSepare - 0.20).toFixed(2));

      await teamOrderService.addParticipantItem({
        team_order_id: teamOrderId,
        participant_name: participantName,
        product_id: sandwich.id,
        product_name: `Formule : ${sandwich.name} + ${boisson.name} + ${dessert.name}`,
        unit_price: prixFormule,
        quantity: 1
      });

      return res.redirect(`/team-order/${teamOrderId}`);
    }

    return res.redirect(`/team-order/${teamOrderId}`);
  } catch (error) {
    console.error('Erreur addParticipantToTeamOrder:', error);
    return res.status(500).send('Erreur ajout participant');
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