const productService = require('../services/productService');

const FORMULE_PRICE = 7.50;

exports.getFormulePage = async (req, res) => {
  try {
    const products = await productService.getAllAvailableProducts();

    res.render('formule', {
      title: 'Composer ma formule',
      sandwiches: products.filter(p => p.category === 'sandwich'),
      boissons: products.filter(p => p.category === 'boisson'),
      desserts: products.filter(p => p.category === 'dessert'),
      formulePrice: FORMULE_PRICE
    });
  } catch (error) {
    console.error('Erreur getFormulePage:', error);
    res.status(500).send('Erreur chargement formule');
  }
};

exports.addFormuleToCart = async (req, res) => {
  try {
    const products = await productService.getAllAvailableProducts();

    const sandwich = products.find(p => p.id === Number(req.body.sandwich_id));
    const boisson = products.find(p => p.id === Number(req.body.boisson_id));
    const dessert = products.find(p => p.id === Number(req.body.dessert_id));

    if (!sandwich || !boisson || !dessert) {
      return res.status(400).send('Formule incomplète');
    }

    if (!req.session.cart) req.session.cart = [];

    req.session.cart.push({
      id: `formule-${Date.now()}`,
      name: `Formule : ${sandwich.name} + ${boisson.name} + ${dessert.name}`,
      price: FORMULE_PRICE,
      quantity: 1,
      is_formula: true,
      formula_items: [
        { id: sandwich.id, name: sandwich.name, type: 'sandwich' },
        { id: boisson.id, name: boisson.name, type: 'boisson' },
        { id: dessert.id, name: dessert.name, type: 'dessert' }
      ]
    });

    res.redirect('/cart');
  } catch (error) {
    console.error('Erreur addFormuleToCart:', error);
    res.status(500).send('Erreur ajout formule');
  }
};