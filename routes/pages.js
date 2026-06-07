const express = require('express');
const router = express.Router();
const pagesController = require('../controllers/pagesController');

router.get('/', pagesController.getHomePage);
router.get('/menu', pagesController.getMenuPage);
router.get('/petit-dejeuner', pagesController.getBreakfastPage);
router.get('/product/:id', pagesController.getProductPage);
router.get('/login', pagesController.getLoginPage);

module.exports = router;