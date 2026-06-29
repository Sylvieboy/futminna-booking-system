const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
// Helper: Create notification
const createNotification = async (userId, message) => {
    try {
        await supabase
            .from('notifications')
            .insert([{ user_id: userId, message, is_read: false }]);
    } catch (err) {
        console.error('Notification error:', err);
    }
};

// GET Admin Dashboard
const getDashboard = async (req, res) => {
    try {
        const { data: users } = await supabase.from('users').select('id');
        const { data: resources } = await supabase.from('resources').select('id');
        const { data: bookings } = await supabase.from('bookings').select('id').eq('status', 'pending');
        const { data: announcements } = await supabase.from('announcements').select('id');

        const { data: recentBookings } = await supabase
            .from('bookings')
            .select('*, users(full_name), resources(resource_name)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            user: req.session.user,
            totalUsers: users ? users.length : 0,
            totalResources: resources ? resources.length : 0,
            pendingBookings: bookings ? bookings.length : 0,
            totalAnnouncements: announcements ? announcements.length : 0,
            recentBookings: recentBookings || []
        });

    } catch (error) {
        console.error(error);
        res.redirect('/login');
    }
};

// GET Users
const getUsers = async (req, res) => {
    try {
        const { data: users } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        res.render('admin/users', {
            title: 'Manage Users',
            user: req.session.user,
            users: users || []
        });
    } catch (error) {
        console.error(error);
        res.redirect('/admin/dashboard');
    }
};

// POST Create User (Admin creates account for student or lecturer)
const createUser = async (req, res) => {
    const {
        first_name, last_name, gender, email, phone,
        role, matric_number, staff_id, department, faculty, password
    } = req.body;

    const full_name = `${first_name} ${last_name}`;

    if (!first_name || !last_name || !email || !password || !role || !department || !faculty) {
        req.flash('error_msg', 'Please fill in all required fields');
        return res.redirect('/admin/users');
    }

    if (password.length < 6) {
        req.flash('error_msg', 'Password must be at least 6 characters');
        return res.redirect('/admin/users');
    }

    try {
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (existingUser) {
            req.flash('error_msg', 'Email address is already registered');
            return res.redirect('/admin/users');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { error } = await supabase
            .from('users')
            .insert([{
                full_name,
                first_name,
                last_name,
                gender: gender || null,
                email,
                password: hashedPassword,
                role,
                phone: phone || null,
                department,
                faculty,
                matric_number: role === 'student' ? matric_number : null,
                staff_id: role === 'staff' ? staff_id : null,
                email_verified: true
            }]);

        if (error) throw error;

        req.flash('success_msg', `Account created successfully for ${full_name}!`);
        res.redirect('/admin/users');

    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect('/admin/users');
    }
};

// Delete User
const deleteUser = async (req, res) => {
    try {
        await supabase.from('users').delete().eq('id', req.params.id);
        req.flash('success_msg', 'User deleted successfully.');
        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/users');
    }
};

// GET Resources
const getResources = async (req, res) => {
    try {
        const { data: resources } = await supabase
            .from('resources')
            .select('*')
            .order('created_at', { ascending: false });

        res.render('admin/resources', {
            title: 'Manage Resources',
            user: req.session.user,
            resources: resources || []
        });
    } catch (error) {
        console.error(error);
        res.redirect('/admin/dashboard');
    }
};

// POST Resource
const postResource = async (req, res) => {
    const { resource_name, resource_type, description, capacity } = req.body;

    try {
        const { error } = await supabase
            .from('resources')
            .insert([{ resource_name, resource_type, description, capacity }]);

        if (error) throw error;

        req.flash('success_msg', 'Resource added successfully.');
        res.redirect('/admin/resources');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect('/admin/resources');
    }
};

// Update Resource
const updateResource = async (req, res) => {
    const { resource_name, resource_type, description, capacity, status } = req.body;

    try {
        await supabase
            .from('resources')
            .update({ resource_name, resource_type, description, capacity, status })
            .eq('id', req.params.id);

        req.flash('success_msg', 'Resource updated successfully.');
        res.redirect('/admin/resources');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/resources');
    }
};

// Delete Resource
const deleteResource = async (req, res) => {
    try {
        await supabase.from('resources').delete().eq('id', req.params.id);
        req.flash('success_msg', 'Resource deleted successfully.');
        res.redirect('/admin/resources');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/resources');
    }
};

// GET Bookings
const getBookings = async (req, res) => {
    try {
        const { data: bookings } = await supabase
            .from('bookings')
            .select('*, users(full_name, email), resources(resource_name, resource_type)')
            .order('created_at', { ascending: false });

        const { data: lecturers } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('role', 'staff');

        const { data: resources } = await supabase
            .from('resources')
            .select('*')
            .eq('status', 'available');

        res.render('admin/bookings', {
            title: 'Manage Bookings',
            user: req.session.user,
            bookings: bookings || [],
            lecturers: lecturers || [],
            resources: resources || []
        });
    } catch (error) {
        console.error(error);
        res.redirect('/admin/dashboard');
    }
};

// Approve Booking
// Approve Booking
const approveBooking = async (req, res) => {
    try {
        const { data: booking } = await supabase
            .from('bookings')
            .select('*, users(full_name)')
            .eq('id', req.params.id)
            .single();

        await supabase
            .from('bookings')
            .update({ status: 'approved' })
            .eq('id', req.params.id);

        // Send notification to user
        if (booking) {
            await createNotification(
                booking.user_id,
                `✅ Your booking for ${booking.booking_date} has been approved!`
            );
        }

        req.flash('success_msg', 'Booking approved successfully.');
        res.redirect('/admin/bookings');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/bookings');
    }
};

// Reject Booking
const rejectBooking = async (req, res) => {
    try {
        const { data: booking } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', req.params.id)
            .single();

        await supabase
            .from('bookings')
            .update({ status: 'rejected' })
            .eq('id', req.params.id);

        // Send notification to user
        if (booking) {
            await createNotification(
                booking.user_id,
                `❌ Your booking for ${booking.booking_date} has been rejected.`
            );
        }

        req.flash('success_msg', 'Booking rejected.');
        res.redirect('/admin/bookings');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/bookings');
    }
};


// POST Book on behalf of lecturer
const bookOnBehalf = async (req, res) => {
    const { lecturer_id, resource_id, booking_date, start_time, end_time, purpose } = req.body;

    if (!lecturer_id || !resource_id || !booking_date || !start_time || !end_time) {
        req.flash('error_msg', 'Please fill in all required fields');
        return res.redirect('/admin/bookings');
    }

    try {
        const { data: conflict } = await supabase
            .from('bookings')
            .select('*')
            .eq('resource_id', resource_id)
            .eq('booking_date', booking_date)
            .eq('status', 'approved')
            .or(`start_time.lte.${end_time},end_time.gte.${start_time}`);

        if (conflict && conflict.length > 0) {
            req.flash('error_msg', 'Scheduling conflict detected! This resource is already booked for that time slot.');
            return res.redirect('/admin/bookings');
        }

        const { error } = await supabase
            .from('bookings')
            .insert([{
                user_id: req.session.user.id,
                resource_id,
                booking_date,
                start_time,
                end_time,
                purpose: purpose || 'Booked by Admin on behalf of lecturer',
                status: 'approved',
                booked_for: lecturer_id
            }]);

        if (error) throw error;

        req.flash('success_msg', 'Booking created successfully on behalf of lecturer!');
        res.redirect('/admin/bookings');

    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect('/admin/bookings');
    }
};

// GET Appointments
const getAppointments = async (req, res) => {
    try {
        const { data: appointments } = await supabase
            .from('appointments')
            .select(`
                *,
                users!appointments_student_id_fkey(full_name),
                users!appointments_lecturer_id_fkey(full_name)
            `)
            .order('created_at', { ascending: false });

        res.render('admin/appointments', {
            title: 'All Appointments',
            user: req.session.user,
            appointments: appointments || []
        });
    } catch (error) {
        console.error(error);
        res.redirect('/admin/dashboard');
    }
};

// GET Announcements
const getAnnouncements = async (req, res) => {
    try {
        const { data: announcements } = await supabase
            .from('announcements')
            .select('*')
            .order('posted_at', { ascending: false });

        res.render('admin/announcements', {
            title: 'Manage Announcements',
            user: req.session.user,
            announcements: announcements || []
        });
    } catch (error) {
        console.error(error);
        res.redirect('/admin/dashboard');
    }
};

// POST Announcement
const postAnnouncement = async (req, res) => {
    const { title, content } = req.body;

    try {
        const { error } = await supabase
            .from('announcements')
            .insert([{
                posted_by: req.session.user.id,
                posted_by_name: req.session.user.full_name,
                posted_by_role: req.session.user.role,
                title,
                content
            }]);

        if (error) throw error;

        req.flash('success_msg', 'Announcement posted successfully.');
        res.redirect('/admin/announcements');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect('/admin/announcements');
    }
};

// Delete Announcement
const deleteAnnouncement = async (req, res) => {
    try {
        await supabase.from('announcements').delete().eq('id', req.params.id);
        req.flash('success_msg', 'Announcement deleted successfully.');
        res.redirect('/admin/announcements');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/announcements');
    }
};

module.exports = {
    getDashboard, getUsers, createUser, deleteUser,
    getResources, postResource, updateResource, deleteResource,
    getBookings, approveBooking, rejectBooking, bookOnBehalf,
    getAppointments, getAnnouncements, postAnnouncement, deleteAnnouncement
};