const productService = require('../services/productService');

const FORMULE_PRICE = 7.50;

exports.getFormulePage = async (req, res) => {
  try {
    const products = await productService.getAllAvailableProducts();

    res.render('formule', {
      title: 'Composer une formule',
      sandwiches: products.filter(product => product.category === 'sandwich'),
      boissons: products.filter(product => product.category === 'boisson'),
      desserts: products.filter(product => product.category === 'dessert'),
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

    const sandwich = products.find(product => product.id === Number(req.body.sandwich_id));
    const boisson = products.find(product => product.id === Number(req.body.boisson_id));
    const dessert = products.find(product => product.id === Number(req.body.dessert_id));

    if (!sandwich || !boisson || !dessert) {
      return res.status(400).send('Formule incomplète');
    }

    let finalPrice = FORMULE_PRICE;
    const options = [];

    const isJambon = (sandwich.name || '').toLowerCase().includes('jambon');
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

    const sandwichNameWithOptions = `${sandwich.name} (${options.join(', ')})`;

    const formulaName = `Formule : ${sandwichNameWithOptions} + ${boisson.name} + ${dessert.name}`;

    const cart = req.session.cart || [];

    const existingItem = cart.find(item => {
      return item.is_formula === true && item.name === formulaName && Number(item.price) === Number(finalPrice);
    });

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: `formule-${sandwich.id}-${boisson.id}-${dessert.id}-${Date.now()}`,
        name: formulaName,
        price: finalPrice,
        quantity: 1,
        is_formula: true,
        formula_items: [
          {
            id: sandwich.id,
            name: sandwich.name,
            category: 'sandwich'
          },
          {
            id: boisson.id,
            name: boisson.name,
            category: 'boisson'
          },
          {
            id: dessert.id,
            name: dessert.name,
            category: 'dessert'
          }
        ]
      });
    }

    req.session.cart = cart;

    res.redirect('/cart');
  } catch (error) {
    console.error('Erreur addFormuleToCart:', error);
    res.status(500).send('Erreur ajout formule');
  }
};