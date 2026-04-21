const productService = require('../services/productService');

exports.getFormulePage = async (req, res) => {
  try {
    const products = await productService.getAllAvailableProducts();

    const sandwiches = products.filter(p => p.category === 'sandwich');
    const boissons = products.filter(p => p.category === 'boisson');
    const desserts = products.filter(p => p.category === 'dessert');

    res.render('formule', {
      title: 'Créer mon menu',
      sandwiches,
      boissons,
      desserts
    });
  } catch (error) {
    console.error('Erreur getFormulePage:', error);
    res.status(500).send('Erreur chargement formule');
  }
};

exports.addFormuleToCart = async (req, res) => {
  try {
    const products = await productService.getAllAvailableProducts();

    const sandwichId = Number(req.body.sandwich_id);
    const boissonId = Number(req.body.boisson_id);
    const dessertId = Number(req.body.dessert_id);

    const sandwich = products.find(p => p.id === sandwichId);
    const boisson = products.find(p => p.id === boissonId);
    const dessert = products.find(p => p.id === dessertId);

    if (!sandwich || !boisson || !dessert) {
      return res.status(400).send('Sélection incomplète');
    }

    const totalSepare =
      Number(sandwich.price) +
      Number(boisson.price) +
      Number(dessert.price);

    const prixFormule = Number((totalSepare - 0.20).toFixed(2));

    if (!req.session.cart) {
      req.session.cart = [];
    }

    req.session.cart.push({
      id: `formule-${Date.now()}`,
      name: `Formule : ${sandwich.name} + ${boisson.name} + ${dessert.name}`,
      price: prixFormule,
      quantity: 1,
      is_formula: true,
      formula_items: [
        { id: sandwich.id, name: sandwich.name, price: Number(sandwich.price), type: 'sandwich' },
        { id: boisson.id, name: boisson.name, price: Number(boisson.price), type: 'boisson' },
        { id: dessert.id, name: dessert.name, price: Number(dessert.price), type: 'dessert' }
      ]
    });

    res.redirect('/cart');
  } catch (error) {
    console.error('Erreur addFormuleToCart:', error);
    res.status(500).send('Erreur ajout formule');
  }
};