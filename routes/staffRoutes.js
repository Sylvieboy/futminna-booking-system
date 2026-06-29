const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { isStaff } = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');


// Dashboard
router.get('/dashboard', isStaff, staffController.getDashboard);

// Appointments
router.get('/appointments', isStaff, staffController.getAppointments);
router.get('/appointments/:id/approve', isStaff, staffController.approveAppointment);
router.get('/appointments/:id/reject', isStaff, staffController.rejectAppointment);

// Bookings
router.get('/bookings', isStaff, staffController.getBookings);
router.post('/bookings', isStaff, staffController.postBooking);

// Announcements
router.get('/announcements', isStaff, staffController.getAnnouncements);
router.post('/announcements', isStaff, staffController.postAnnouncement);
router.get('/announcements/delete/:id', isStaff, staffController.deleteAnnouncement);

// Notifications
router.get('/notifications', isStaff, notificationController.getNotifications);
router.get('/notifications/read/:id', isStaff, notificationController.markAsRead);
router.get('/notifications/read-all', isStaff, notificationController.markAllAsRead);

module.exports = router;