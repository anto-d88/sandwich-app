const productService = require('../services/productService');
const adminService = require('../services/adminService');

exports.getHomePage = (req, res) => {
  res.render('accueil', {
    title: 'Accueil'
  });
};

exports.getMenuPage = async (req, res) => {
  try {
    const settings = await adminService.getSettingsMap();

    if (settings.app_open === 'false') {
      return res.render('menu', {
        title: 'Menu',
        products: [],
        settings,
        appClosed: true
      });
    }

    const products = await productService.getAllAvailableProducts(settings);

    res.render('menu', {
      title: 'Menu',
      products,
      settings,
      appClosed: false
    });
  } catch (error) {
    console.error('Erreur getMenuPage:', error);
    res.status(500).send('Erreur serveur');
  }
};

exports.getBreakfastPage = async (req, res) => {
  try {
    const settings = await adminService.getSettingsMap();

    if (settings.app_open === 'false') {
      return res.redirect('/menu');
    }

    if (settings.breakfast_open !== 'true') {
      return res.redirect('/menu');
    }

    const products = await productService.getAllAvailableProducts(settings);

    const breakfastFormulas = products.filter((product) => {
      const category = String(product.category || '').toLowerCase();
      const name = String(product.name || '').toLowerCase();

      return category === 'breakfast' && name.includes('formule');
    });

    res.render('petit-dejeuner', {
      title: 'Petit-déjeuner entreprise',
      settings,
      breakfastFormulas
    });
  } catch (error) {
    console.error('Erreur getBreakfastPage:', error);
    res.status(500).send('Erreur serveur');
  }
};

exports.getProductPage = async (req, res) => {
  try {
    const settings = await adminService.getSettingsMap();

    if (settings.app_open === 'false') {
      return res.redirect('/menu');
    }

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