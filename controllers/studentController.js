const supabase = require('../config/supabase');

// GET Student Dashboard
const getDashboard = async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Get recent bookings
        const { data: bookings } = await supabase
            .from('bookings')
            .select('*, resources(resource_name, resource_type)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        // Get recent appointments
        const { data: appointments } = await supabase
            .from('appointments')
            .select('*, users!appointments_lecturer_id_fkey(full_name)')
            .eq('student_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        // Get announcements
        const { data: announcements } = await supabase
            .from('announcements')
            .select('*')
            .order('posted_at', { ascending: false })
            .limit(3);

        res.render('student/dashboard', {
            title: 'Student Dashboard',
            user: req.session.user,
            bookings: bookings || [],
            appointments: appointments || [],
            announcements: announcements || []
        });

    } catch (error) {
        console.error(error);
        res.redirect('/login');
    }
};

// GET Resources
const getResources = async (req, res) => {
    try {
        const { data: resources } = await supabase
            .from('resources')
            .select('*')
            .eq('status', 'available')
            .order('resource_type');

        res.render('student/resources', {
            title: 'Available Resources',
            user: req.session.user,
            resources: resources || []
        });
    } catch (error) {
        console.error(error);
        res.redirect('/student/dashboard');
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

        res.render('student/bookings', {
            title: 'My Bookings',
            user: req.session.user,
            resources: resources || [],
            bookings: bookings || []
        });
    } catch (error) {
        console.error(error);
        res.redirect('/student/dashboard');
    }
};

// POST Booking
const postBooking = async (req, res) => {
    const { resource_id, booking_date, start_time, end_time } = req.body;
    const userId = req.session.user.id;

    try {
        // Check for conflicts
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
            req.flash('error_msg', 'This resource is already booked for the selected time slot. Please choose another time.');
            return res.redirect('/student/bookings');
        }

        // Create booking
        const { error } = await supabase
            .from('bookings')
            .insert([{
                user_id: userId,
                resource_id,
                booking_date,
                start_time,
                end_time
            }]);

        if (error) throw error;

        req.flash('success_msg', 'Booking request submitted successfully! Awaiting approval.');
        res.redirect('/student/bookings');

    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect('/student/bookings');
    }
};

// Cancel Booking
const cancelBooking = async (req, res) => {
    try {
        await supabase
            .from('bookings')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.session.user.id);

        req.flash('success_msg', 'Booking cancelled successfully.');
        res.redirect('/student/bookings');
    } catch (error) {
        console.error(error);
        res.redirect('/student/bookings');
    }
};

// GET Appointments
const getAppointments = async (req, res) => {
    try {
        const { data: lecturers } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'staff');

        const { data: appointments } = await supabase
            .from('appointments')
            .select('*, users!appointments_lecturer_id_fkey(full_name)')
            .eq('student_id', req.session.user.id)
            .order('created_at', { ascending: false });

        res.render('student/appointments', {
            title: 'My Appointments',
            user: req.session.user,
            lecturers: lecturers || [],
            appointments: appointments || []
        });
    } catch (error) {
        console.error(error);
        res.redirect('/student/dashboard');
    }
};

// POST Appointment
const postAppointment = async (req, res) => {
    const { lecturer_id, appointment_date, appointment_time, purpose } = req.body;

    try {
        const { error } = await supabase
            .from('appointments')
            .insert([{
                student_id: req.session.user.id,
                lecturer_id,
                appointment_date,
                appointment_time,
                purpose
            }]);

        if (error) throw error;

        req.flash('success_msg', 'Appointment request submitted successfully! Awaiting approval.');
        res.redirect('/student/appointments');

    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect('/student/appointments');
    }
};

// GET Announcements
const getAnnouncements = async (req, res) => {
    try {
        const { data: announcements } = await supabase
            .from('announcements')
            .select('*')
            .order('posted_at', { ascending: false });

        res.render('student/announcements', {
            title: 'Announcements',
            user: req.session.user,
            announcements: announcements || []
        });
    } catch (error) {
        console.error(error);
        res.redirect('/student/dashboard');
    }
};

module.exports = {
    getDashboard, getResources, getBookings, postBooking,
    cancelBooking, getAppointments, postAppointment, getAnnouncements
};