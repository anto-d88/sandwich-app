const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.get('/contact', messageController.getContactPage);
router.post('/contact', messageController.sendCustomerMessage);

router.get('/demande-reunion', messageController.getMeetingRequestPage);
router.post('/demande-reunion', messageController.sendMeetingRequest);

module.exports = router;