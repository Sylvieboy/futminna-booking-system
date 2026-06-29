const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Home page
router.get('/', authController.getHome);

// Register
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);

// Email verification
router.get('/verify-email', authController.verifyEmail);

// Login
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);

// Logout
router.get('/logout', authController.logout);

module.exports = router;