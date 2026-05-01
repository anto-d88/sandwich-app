const express = require('express');
const router = express.Router();
const adminMessagesController = require('../controllers/adminMessagesController');

router.get('/admin/messages', adminMessagesController.getMessagesPage);
router.post('/admin/messages/:id/status', adminMessagesController.updateStatus);

module.exports = router;