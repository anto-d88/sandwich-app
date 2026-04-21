const express = require('express');
const router = express.Router();
const formuleController = require('../controllers/formuleController');

router.get('/', formuleController.getFormulePage);
router.post('/add', formuleController.addFormuleToCart);

module.exports = router;