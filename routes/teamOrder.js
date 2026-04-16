const express = require('express');
const router = express.Router();
const teamOrderController = require('../controllers/teamOrderController');

router.get('/create', teamOrderController.getCreatePage);
router.post('/create', teamOrderController.createTeamOrder);

router.get('/:id', teamOrderController.getJoinPage);
router.post('/:id/add', teamOrderController.addParticipantToTeamOrder);

router.get('/:id/summary', teamOrderController.getSummaryPage);
router.post('/:id/checkout', teamOrderController.createTeamOrderCheckoutSession);
router.get('/:id/payment-success', teamOrderController.handleTeamOrderPaymentSuccess);

module.exports = router;