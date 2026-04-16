const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authAdmin = require('../middleware/authAdmin');

router.get('/dashboard', authAdmin, adminController.getDashboard);

router.get('/orders', authAdmin, adminController.getOrders);
router.get('/orders/:id', authAdmin, adminController.getOrderDetails);
router.post('/orders/:id/status', authAdmin, adminController.updateOrderStatus);

router.get('/team-orders', authAdmin, adminController.getTeamOrders);
router.get('/team-orders/:id', authAdmin, adminController.getTeamOrderDetails);
router.post('/team-orders/:id/status', authAdmin, adminController.updateTeamOrderStatus);

module.exports = router;