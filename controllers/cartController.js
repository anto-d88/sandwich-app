const supabase = require('../config/supabaseClient');
const getCartTotal = require('../utils/getCartTotal');
const orderService = require('../services/orderService');

const SHOP_OPEN = false;

const MAX_ORDERS_PER_SLOT = 10;
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

    if (product.category === 'sandwich') {
      const sandwichOptions = buildSandwichOptions(product, req.body);
      finalPrice = sandwichOptions.finalPrice;
      finalName = sandwichOptions.finalName;
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

exports.getCheckoutPage = async (req, res) => {
  if (!SHOP_OPEN) {
    return res.render('checkout-closed', {
      title: 'Commandes fermées'
    });
  }

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
    res.status(500).send('Erreur checkout');
  }
};