const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

// Dashboard
router.get('/dashboard', isAdmin, adminController.getDashboard);

// Users
router.get('/users', isAdmin, adminController.getUsers);
router.post('/users/create', isAdmin, adminController.createUser);
router.get('/users/delete/:id', isAdmin, adminController.deleteUser);

// Resources
router.get('/resources', isAdmin, adminController.getResources);
router.post('/resources', isAdmin, adminController.postResource);
router.get('/resources/delete/:id', isAdmin, adminController.deleteResource);
router.post('/resources/update/:id', isAdmin, adminController.updateResource);

// Bookings
router.get('/bookings', isAdmin, adminController.getBookings);
router.get('/bookings/:id/approve', isAdmin, adminController.approveBooking);
router.get('/bookings/:id/reject', isAdmin, adminController.rejectBooking);
router.post('/bookings/behalf', isAdmin, adminController.bookOnBehalf);

// Appointments
router.get('/appointments', isAdmin, adminController.getAppointments);

// Announcements
router.get('/announcements', isAdmin, adminController.getAnnouncements);
router.post('/announcements', isAdmin, adminController.postAnnouncement);
router.get('/announcements/delete/:id', isAdmin, adminController.deleteAnnouncement);

// Notifications
router.get('/notifications', isAdmin, notificationController.getNotifications);
router.get('/notifications/read/:id', isAdmin, notificationController.markAsRead);
router.get('/notifications/read-all', isAdmin, notificationController.markAllAsRead);

module.exports = router;