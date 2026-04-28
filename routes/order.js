const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

console.log(orderController);

router.get('/checkout', orderController.getCheckoutPage);

router.post('/create-checkout-session', orderController.createCheckoutSession);

router.get('/success', orderController.handlePaymentSuccess);

router.get('/cancel', orderController.handlePaymentCancel);

module.exports = router;