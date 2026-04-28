const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/checkout',orderController.getCheckoutPage);
router.post('/create-checkout-session', orderController.createCheckoutSession);
router.get('/success', orderController.handleSuccess);
router.get('/cancel', orderController.handleCancel);

module.exports = router;