const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

router.get('/', cartController.getCartPage);
router.post('/add', cartController.addToCart);
router.post('/remove/:id', cartController.removeFromCart);
router.get('/checkout', cartController.getCheckoutPage);

module.exports = router;