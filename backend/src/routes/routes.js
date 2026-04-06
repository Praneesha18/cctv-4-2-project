const express = require('express');
const authController = require('../controllers/authcontroller');
const protect = require('../middleware/Protect');

const router = express.Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/validate-email', authController.validateEmail);
router.post('/validate-gmail', authController.validateEmail);
router.get('/me', protect, authController.me);


module.exports = router;
