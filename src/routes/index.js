var express = require('express');
var router = express.Router();

var homeController = require('../controllers/homeController');

router.get('/', homeController.healthCheck);

module.exports = router;
