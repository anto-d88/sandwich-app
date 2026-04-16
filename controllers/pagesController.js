const productService = require('../services/productService');

exports.getHomePage = (req, res) => {
  res.render('accueil', {
    title: 'Accueil'
  });
};

exports.getMenuPage = async (req, res) => {
  try {
    const products = await productService.getAllAvailableProducts();

    res.render('menu', {
      title: 'Menu',
      products
    });
  } catch (error) {
    console.error('Erreur getMenuPage:', error);
    res.status(500).send('Erreur serveur');
  }
};

exports.getProductPage = async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const product = await productService.getProductById(productId);

    if (!product) {
      return res.status(404).render('404', { title: 'Produit introuvable' });
    }

    res.render('product', {
      title: product.name,
      product
    });
  } catch (error) {
    console.error('Erreur getProductPage:', error);
    return res.status(404).render('404', { title: 'Produit introuvable' });
  }
};

exports.getLoginPage = (req, res) => {
  res.render('login', {
    title: 'Connexion admin',
    error: null
  });
};