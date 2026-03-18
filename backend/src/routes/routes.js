const express = require('express');
const authController = require('../controllers/authcontroller');
const protect = require('../middleware/Protect');

const router = express.Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', protect, authController.me);


module.exports = router;
