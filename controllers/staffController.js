const supabase = require('../config/supabase');

// GET Staff Dashboard
const getDashboard = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const { data: pendingAppointments } = await supabase
            .from('appointments')
            .select('*, users!appointments_student_id_fkey(full_name, email)')
            .eq('lecturer_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        const { data: approvedAppointments } = await supabase
            .from('appointments')
            .select('*, users!appointments_student_id_fkey(full_name, email)')
            .eq('lecturer_id', userId)
            .eq('status', 'approved')
            .order('appointment_date', { ascending: true })
            .limit(5);

        const { data: announcements } = await supabase
            .from('announcements')
            .select('*')
            .order('posted_at', { ascending: false })
            .limit(3);

        res.render('staff/dashboard', {
            title: 'Staff Dashboard',
            user: req.session.user,
            pendingAppointments: pendingAppointments || [],
            approvedAppointments: approvedAppointments || [],
            announcements: announcements || []
        });

    } catch (error) {
        console.error(error);
        res.redirect('/login');
    }
};

// GET Appointments
const getAppointments = async (req, res) => {
    try {
        const { data: appointments } = await supabase
            .from('appointments')
            .select('*, users!appointments_student_id_fkey(full_name, email)')
            .eq('lecturer_id', req.session.user.id)
            .order('created_at', { ascending: false });

        res.render('staff/appointments', {
            title: 'Manage Appointments',
            user: req.session.user,
            appointments: appointments || []
        });
    } catch (error) {
        console.error(error);
        res.redirect('/staff/dashboard');
    }
};

// Approve Appointment
// Helper: Create notification
const createNotification = async (userId, message) => {
    const supabase = require('../config/supabase');
    try {
        await supabase
            .from('notifications')
            .insert([{ user_id: userId, message, is_read: false }]);
    } catch (err) {
        console.error('Notification error:', err);
    }
};

// Approve Appointment
const approveAppointment = async (req, res) => {
    try {
        const { data: apt } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', req.params.id)
            .single();

        await supabase
            .from('appointments')
            .update({ status: 'approved' })
            .eq('id', req.params.id)
            .eq('lecturer_id', req.session.user.id);

        if (apt) {
            await createNotification(
                apt.student_id,
                `✅ Your appointment request on ${apt.appointment_date} at ${apt.appointment_time} has been approved!`
            );
        }

        req.flash('success_msg', 'Appointment approved successfully.');
        res.redirect('/staff/appointments');
    } catch (error) {
        console.error(error);
        res.redirect('/staff/appointments');
    }
};

// Reject Appointment
const rejectAppointment = async (req, res) => {
    try {
        const { data: apt } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', req.params.id)
            .single();

        await supabase
            .from('appointments')
            .update({ status: 'rejected' })
            .eq('id', req.params.id)
            .eq('lecturer_id', req.session.user.id);

        if (apt) {
            await createNotification(
                apt.student_id,
                `❌ Your appointment request on ${apt.appointment_date} at ${apt.appointment_time} was not approved.`
            );
        }

        req.flash('success_msg', 'Appointment rejected.');
        res.redirect('/staff/appointments');
    } catch (error) {
        console.error(error);
        res.redirect('/staff/appointments');
    }
};




// GET Bookings
const getBookings = async (req, res) => {
    try {
        const { data: resources } = await supabase
            .from('resources')
            .select('*')
            .eq('status', 'available');

        const { data: bookings } = await supabase
            .from('bookings')
            .select('*, resources(resource_name, resource_type)')
            .eq('user_id', req.session.user.id)
            .order('created_at', { ascending: false });

        res.render('staff/bookings', {
            title: 'My Bookings',
            user: req.session.user,
            resources: resources || [],
            bookings: bookings || []
        });
    } catch (error) {
        console.error(error);
        res.redirect('/staff/dashboard');
    }
};

// POST Booking
const postBooking = async (req, res) => {
    const { resource_id, booking_date, start_time, end_time } = req.body;

    try {
        const { data: conflicts } = await supabase
            .from('bookings')
            .select('*')
            .eq('resource_id', resource_id)
            .eq('booking_date', booking_date)
            .neq('status', 'rejected');

        const hasConflict = conflicts && conflicts.some(booking => {
            return (start_time < booking.end_time && end_time > booking.start_time);
        });

        if (hasConflict) {
            req.flash('error_msg', 'This resource is already booked for the selected time. Please choose another slot.');
            return res.redirect('/staff/bookings');
        }

        const { error } = await supabase
            .from('bookings')
            .insert([{
                user_id: req.session.user.id,
                resource_id,
                booking_date,
                start_time,
                end_time
            }]);

        if (error) throw error;

        req.flash('success_msg', 'Booking request submitted successfully!');
        res.redirect('/staff/bookings');

    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect('/staff/bookings');
    }
};

// GET Announcements
const getAnnouncements = async (req, res) => {
    try {
        const { data: announcements } = await supabase
            .from('announcements')
            .select('*')
            .order('posted_at', { ascending: false });

        res.render('staff/announcements', {
            title: 'Announcements',
            user: req.session.user,
            announcements: announcements || []
        });
    } catch (error) {
        console.error(error);
        res.redirect('/staff/dashboard');
    }
};

// POST Announcement (Lecturer posts)
const postAnnouncement = async (req, res) => {
    const { title, content } = req.body;

    if (!title || !content) {
        req.flash('error_msg', 'Please fill in all fields');
        return res.redirect('/staff/announcements');
    }

    try {
        const { error } = await supabase
            .from('announcements')
            .insert([{
                posted_by: req.session.user.id,
                posted_by_name: req.session.user.full_name,
                posted_by_role: 'staff',
                title,
                content
            }]);

        if (error) throw error;

        req.flash('success_msg', 'Announcement posted successfully!');
        res.redirect('/staff/announcements');

    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect('/staff/announcements');
    }
};

// DELETE Announcement (only own announcements)
const deleteAnnouncement = async (req, res) => {
    try {
        await supabase
            .from('announcements')
            .delete()
            .eq('id', req.params.id)
            .eq('posted_by', req.session.user.id);

        req.flash('success_msg', 'Announcement deleted.');
        res.redirect('/staff/announcements');
    } catch (error) {
        console.error(error);
        res.redirect('/staff/announcements');
    }
};

module.exports = {
    getDashboard, getAppointments, approveAppointment,
    rejectAppointment, getBookings, postBooking,
    getAnnouncements, postAnnouncement, deleteAnnouncement
};