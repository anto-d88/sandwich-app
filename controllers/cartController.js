const supabase = require('../config/supabaseClient');
const getCartTotal = require('../utils/getCartTotal');

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

function buildSandwichOptions(product, body) {
  let finalPrice = Number(product.price);
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
    finalName: `${product.name} (${options.join(', ')})`
  };
}

function safePositiveNumber(value, fallback = 0) {
  const number = Number(value || fallback);

  if (Number.isNaN(number) || number < 0) {
    return fallback;
  }

  return number;
}

function calculateBreakfastCustomPrice({
  croissants,
  painsChocolat,
  cafes,
  thes,
  jusOrange
}) {
  return (
    croissants * 1.20 +
    painsChocolat * 1.30 +
    cafes * 1.50 +
    thes * 1.50 +
    jusOrange * 2.00
  );
}

function isBreakfastProduct(product) {
  const category = String(product.category || '').toLowerCase();
  return category === 'breakfast';
}

function getBreakfastDeliveryLabel(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;

  const [year, month, day] = dateValue.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const formattedDate = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const formattedTime = String(timeValue).replace(':00', 'h');

  return `${formattedDate} à ${formattedTime}`;
}

exports.getCartPage = (req, res) => {
  const cart = req.session.cart || [];
  const total = getCartTotal(cart);

  res.render('cart', {
    title: 'Panier',
    cart,
    total
  });
};

exports.addToCart = async (req, res) => {
  try {
    const productId = Number(req.body.id);
    const quantity = Number(req.body.quantity || 1);

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !product) {
      return res.redirect('/menu');
    }

    const stock = Number(product.stock_quantity || 0);

    if (stock <= 0) {
      return res.send('Produit en rupture de stock');
    }

    if (quantity > stock) {
      return res.send(`Stock insuffisant. Il reste seulement ${stock} produits.`);
    }

    const cart = req.session.cart || [];

    let finalPrice = Number(product.price);
    let finalName = product.name;
    let description = product.description || null;

    const breakfastDeliveryDate = req.body.breakfast_delivery_date || null;
    const breakfastDeliveryTime = req.body.breakfast_delivery_time || null;
    const breakfastDeliveryLabel = getBreakfastDeliveryLabel(
      breakfastDeliveryDate,
      breakfastDeliveryTime
    );

    if (isBreakfastProduct(product) && (!breakfastDeliveryDate || !breakfastDeliveryTime)) {
      return res.send('Merci de choisir une date et un créneau de livraison pour le petit-déjeuner.');
    }

    if (product.category === 'sandwich') {
      const sandwichOptions = buildSandwichOptions(product, req.body);
      finalPrice = sandwichOptions.finalPrice;
      finalName = sandwichOptions.finalName;
    }

    const existingItem = cart.find(item => {
      return (
        String(item.id) === String(product.id) &&
        item.name === finalName &&
        Number(item.price) === Number(finalPrice) &&
        String(item.delivery_date || '') === String(breakfastDeliveryDate || '') &&
        String(item.delivery_time || '') === String(breakfastDeliveryTime || '')
      );
    });

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;

      if (newQty > stock) {
        return res.send(`Stock insuffisant. Max : ${stock}`);
      }

      existingItem.quantity = newQty;
    } else {
      cart.push({
        id: product.id,
        product_id: product.id,
        name: finalName,
        price: finalPrice,
        quantity,
        category: product.category || null,
        is_custom: false,
        description,
        delivery_date: breakfastDeliveryDate,
        delivery_time: breakfastDeliveryTime,
        delivery_label: breakfastDeliveryLabel
      });
    }

    req.session.cart = cart;
    res.redirect('/cart');
  } catch (error) {
    console.error('Erreur addToCart:', error);
    res.status(500).send('Erreur panier');
  }
};

exports.addBreakfastCustomToCart = async (req, res) => {
  try {
    const peopleCount = safePositiveNumber(req.body.people_count, 5);
    const croissants = safePositiveNumber(req.body.croissants, 0);
    const painsChocolat = safePositiveNumber(req.body.pains_chocolat, 0);
    const cafes = safePositiveNumber(req.body.cafes, 0);
    const thes = safePositiveNumber(req.body.thes, 0);
    const jusOrange = safePositiveNumber(req.body.jus_orange, 0);

    const deliveryDate = req.body.delivery_date;
    const deliveryTime = req.body.delivery_time;
    const deliveryLabel = getBreakfastDeliveryLabel(deliveryDate, deliveryTime);

    if (!deliveryDate || !deliveryTime) {
      return res.send('Merci de choisir une date et un créneau.');
    }

    if (peopleCount < 5) {
      return res.send('La formule personnalisée commence à partir de 5 personnes.');
    }

    const totalItems = croissants + painsChocolat + cafes + thes + jusOrange;

    if (totalItems <= 0) {
      return res.send('Ajoutez au moins un élément à la formule petit-déjeuner.');
    }

    const price = calculateBreakfastCustomPrice({
      croissants,
      painsChocolat,
      cafes,
      thes,
      jusOrange
    });

    const details = [
      `${peopleCount} personne(s)`,
      croissants > 0 ? `${croissants} croissant(s)` : null,
      painsChocolat > 0 ? `${painsChocolat} pain(s) au chocolat` : null,
      cafes > 0 ? `${cafes} café(s)` : null,
      thes > 0 ? `${thes} thé(s)` : null,
      jusOrange > 0 ? `${jusOrange} jus d'orange` : null
    ].filter(Boolean);

    const cart = req.session.cart || [];

    cart.push({
      id: `breakfast-custom-${Date.now()}`,
      product_id: null,
      name: 'Formule petit-déjeuner personnalisée',
      price,
      quantity: 1,
      category: 'breakfast',
      is_custom: true,
      description: details.join(' • '),
      delivery_date: deliveryDate,
      delivery_time: deliveryTime,
      delivery_label: deliveryLabel,
      breakfast_details: {
        people_count: peopleCount,
        croissants,
        pains_chocolat: painsChocolat,
        cafes,
        thes,
        jus_orange: jusOrange,
        delivery_date: deliveryDate,
        delivery_time: deliveryTime
      }
    });

    req.session.cart = cart;

    res.redirect('/cart');
  } catch (error) {
    console.error('Erreur addBreakfastCustomToCart:', error);
    res.status(500).send('Erreur formule petit-déjeuner');
  }
};

exports.removeFromCart = (req, res) => {
  const productId = req.params.id;

  req.session.cart = (req.session.cart || []).filter(item => {
    return String(item.id) !== String(productId);
  });

  res.redirect('/cart');
};

exports.getCheckoutPage = async (req, res) => {
  res.redirect('/order/checkout');
};