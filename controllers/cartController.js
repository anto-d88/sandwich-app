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
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;

      if (newQty > stock) {
        return res.send(`Stock insuffisant. Max : ${stock}`);
      }

      existingItem.quantity = newQty;
    } else {
  const cruditesChoice = req.body.crudites_choice || 'avec crudités';
const extraCrudites = req.body.extra_crudites === 'on';
const extraCheese = req.body.extra_cheese === 'on';

let finalPrice = Number(product.price);
const options = [];

options.push(cruditesChoice);

if (extraCrudites) {
  finalPrice += 0.50;
  options.push('supplément crudités');
}

if (extraCheese) {
  finalPrice += 0.50;
  options.push('tranche de fromage');
}

cart.push({
  id: product.id,
  name: `${product.name} (${options.join(', ')})`,
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
  const productId = Number(req.params.id);

  req.session.cart = (req.session.cart || []).filter(item => item.id !== productId);

  res.redirect('/cart');
};

exports.getCheckoutPage = (req, res) => {
  const cart = req.session.cart || [];

  if (!cart.length) {
    return res.redirect('/cart');
  }

  const total = getCartTotal(cart);

  res.render('checkout', {
    title: 'Commande',
    cart,
    total
  });
};