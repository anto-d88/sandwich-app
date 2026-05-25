const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');


router.get('/checkout', orderController.getCheckoutPage);

router.post('/create-checkout-session', orderController.createCheckoutSession);

router.get('/success', orderController.handlePaymentSuccess);

router.get('/cancel', orderController.handlePaymentCancel);

router.get('/test-email', orderController.testEmail);

module.exports = router;