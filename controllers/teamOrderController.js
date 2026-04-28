const productService = require('../services/productService');
const teamOrderService = require('../services/teamOrderService');
const stripeService = require('../services/stripeService');

const FORMULE_PRICE = 7.50;

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
        const isJambon = (product.name || '').toLowerCase().includes('jambon');
        const sauceChoice = isJambon ? (req.body.sauce_choice || 'beurre') : null;
        const cruditesChoice = req.body.crudites_choice || 'avec';
        const rawCrudites = req.body.crudites;
        const extraCheese = req.body.extra_cheese === 'on';

        let cruditesList = [];

        if (Array.isArray(rawCrudites)) {
          cruditesList = rawCrudites;
        } else if (typeof rawCrudites === 'string') {
          cruditesList = [rawCrudites];
        }

        const options = [];

        if (sauceChoice) {
          options.push(sauceChoice);
        }

        if (cruditesChoice === 'sans') {
          options.push('sans crudités');
        } else {
          options.push('avec crudités');

          if (cruditesList.length > 0) {
            finalPrice += cruditesList.length * 0.50;
            options.push(`suppléments: ${cruditesList.join(', ')}`);
          }
        }

        if (extraCheese) {
          finalPrice += 0.50;
          options.push('tranche de fromage');
        }

        finalName = `${product.name} (${options.join(', ')})`;
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

    await teamOrderService.addParticipantItem({
      team_order_id: teamOrderId,
      participant_name: participantName.trim(),
      product_id: sandwich.id,
      boisson_id: boisson.id,
      dessert_id: dessert.id,
      item_type: 'formule',
      product_name: `Formule : ${sandwich.name} + ${boisson.name} + ${dessert.name}`,
      unit_price: FORMULE_PRICE,
      quantity: 1
    });

    res.redirect(`/team-order/${teamOrderId}`);
  } catch (error) {
    console.error('Erreur addTeamFormule:', error);
    res.status(500).send('Erreur ajout formule équipe');
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