/**
 * @brief Rutas al perfil del usuario
 * @param {*} profileController -> conexión el controlador de profile
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const isAuth = require('../utils/is-auth');
const bodyParser = require('body-parser');

const profileController = require('../controllers/profile_controller');

router.use(bodyParser.urlencoded({extended: false}));

router.post('/data', isAuth, profileController.postData); 
router.post('/password', isAuth, profileController.postPassword); 
router.get('/', isAuth, profileController.getProfile); 
router.post('/pass', isAuth, profileController.postPassword); 

module.exports = router;
