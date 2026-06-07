const adminProductsService = require('../services/adminProductsService');

exports.getProducts = async (req, res) => {
  try {
    const products = await adminProductsService.getAllProducts();

    res.render('admin/products', {
      title: 'Produits',
      products
    });
  } catch (error) {
    console.error('Erreur getProducts:', error);
    res.status(500).send('Erreur serveur');
  }
};

exports.getNewProductForm = (req, res) => {
  res.render('admin/product-form', {
    title: 'Nouveau produit',
    mode: 'create',
    product: null,
    error: null
  });
};

exports.createProduct = async (req, res) => {
  try {
    await adminProductsService.createProduct(req.body);
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Erreur createProduct:', error);

    res.status(400).render('admin/product-form', {
      title: 'Nouveau produit',
      mode: 'create',
      product: req.body,
      error: error.message || 'Erreur lors de la création du produit.'
    });
  }
};

exports.getEditProductForm = async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const product = await adminProductsService.getProductById(productId);

    if (!product) {
      return res.status(404).render('404', { title: 'Produit introuvable' });
    }

    res.render('admin/product-form', {
      title: `Modifier ${product.name}`,
      mode: 'edit',
      product,
      error: null
    });
  } catch (error) {
    console.error('Erreur getEditProductForm:', error);
    res.status(500).send('Erreur serveur');
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    await adminProductsService.updateProduct(productId, req.body);

    res.redirect('/admin/products');
  } catch (error) {
    console.error('Erreur updateProduct:', error);

    res.status(400).render('admin/product-form', {
      title: 'Modifier produit',
      mode: 'edit',
      product: {
        ...req.body,
        id: Number(req.params.id)
      },
      error: error.message || 'Erreur lors de la modification du produit.'
    });
  }
};

exports.toggleProductAvailability = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    await adminProductsService.toggleProductAvailability(productId);

    res.redirect('/admin/products');
  } catch (error) {
    console.error('Erreur toggleProductAvailability:', error);
    res.status(500).send('Erreur serveur');
  }
};