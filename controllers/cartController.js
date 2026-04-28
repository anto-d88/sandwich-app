const supabase = require('../config/supabaseClient');
const getCartTotal = require('../utils/getCartTotal');

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
    const options = [];

    if (product.category === 'sandwich') {
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

      if (sauceChoice) {
        options.push(sauceChoice);
      }

      if (cruditesChoice === 'sans') {
        options.push('sans crudités');
      } else {
        options.push('avec crudités');

        if (cruditesList.length > 0) {
          options.push(`suppléments: ${cruditesList.join(', ')}`);
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
      }

      if (extraCheese) {
        finalPrice += 0.50;
        options.push('tranche de fromage');
      }

      finalName = `${product.name} (${options.join(', ')})`;
    }

    const existingItem = cart.find(item => {
      return (
        String(item.id) === String(product.id) &&
        item.name === finalName &&
        Number(item.price) === Number(finalPrice)
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
        name: finalName,
        price: finalPrice,
        quantity
      });
    }

    req.session.cart = cart;

    res.redirect('/cart');
  } catch (error) {
    console.error('Erreur addToCart:', error);
    res.status(500).send('Erreur panier');
  }
};

exports.removeFromCart = (req, res) => {
  const productId = req.params.id;

  req.session.cart = (req.session.cart || []).filter(item => {
    return String(item.id) !== String(productId);
  });

  res.redirect('/cart');
};

const orderService = require('../services/orderService');

const DELIVERY_SLOTS = ['11:00', '13:00', '15:00'];
const MAX_ORDERS_PER_SLOT = 10;

function isSlotClosed(slotTime) {
  const now = new Date();

  const [hours, minutes] = slotTime.split(':').map(Number);

  const slotDate = new Date();
  slotDate.setHours(hours, minutes, 0, 0);

  const cutoffDate = new Date(slotDate.getTime() - 50 * 60 * 1000);

  return now >= cutoffDate;
}

async function getSlotsWithAvailability() {
  const slots = [];

  for (const slot of DELIVERY_SLOTS) {
    const count = await orderService.countOrdersBySlot(slot);

    const isFull = count >= MAX_ORDERS_PER_SLOT;
    const isClosed = isSlotClosed(slot);

    slots.push({
      time: slot,
      count,
      max: MAX_ORDERS_PER_SLOT,
      isFull,
      isClosed,
      isUnavailable: isFull || isClosed
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

    const total = cart.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    const slots = await getSlotsWithAvailability(); // 🔥 IMPORTANT

    res.render('checkout', {
      title: 'Finaliser la commande' ,
      cart,
      total,
      slots,   // 🔥 MANQUAIT
      error: null,
      old: {}
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur checkout');
  }
};