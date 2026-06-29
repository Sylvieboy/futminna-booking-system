const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { isStudent } = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');


// Dashboard
router.get('/dashboard', isStudent, studentController.getDashboard);

// Resources
router.get('/resources', isStudent, studentController.getResources);

// Bookings
router.get('/bookings', isStudent, studentController.getBookings);
router.post('/bookings', isStudent, studentController.postBooking);
router.get('/bookings/cancel/:id', isStudent, studentController.cancelBooking);

// Appointments
router.get('/appointments', isStudent, studentController.getAppointments);
router.post('/appointments', isStudent, studentController.postAppointment);

// Announcements
router.get('/announcements', isStudent, studentController.getAnnouncements);

// Notifications
router.get('/notifications', isStudent, notificationController.getNotifications);
router.get('/notifications/read/:id', isStudent, notificationController.markAsRead);
router.get('/notifications/read-all', isStudent, notificationController.markAllAsRead);

module.exports = router;