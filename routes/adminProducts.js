const express = require('express');
const router = express.Router();
const adminProductsController = require('../controllers/adminProductsController');
const authAdmin = require('../middleware/authAdmin');

router.get('/', authAdmin, adminProductsController.getProducts);
router.get('/new', authAdmin, adminProductsController.getNewProductForm);
router.post('/new', authAdmin, adminProductsController.createProduct);

router.get('/:id/edit', authAdmin, adminProductsController.getEditProductForm);
router.post('/:id/edit', authAdmin, adminProductsController.updateProduct);

router.post('/:id/toggle-availability', authAdmin, adminProductsController.toggleProductAvailability);

module.exports = router;