// Check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.flash('error_msg', 'Please log in to access this page');
    res.redirect('/login');
};

// Check if user is a student
const isStudent = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'student') {
        return next();
    }
    res.redirect('/login');
};

// Check if user is staff
const isStaff = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'staff') {
        return next();
    }
    res.redirect('/login');
};

// Check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.redirect('/login');
};
// Add unread notification count to every response
const addUnreadCount = async (req, res, next) => {
    if (req.session.user) {
        const supabase = require('../config/supabase');
        try {
            const { data } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', req.session.user.id)
                .eq('is_read', false);
            res.locals.unreadCount = data ? data.length : 0;
        } catch (e) {
            res.locals.unreadCount = 0;
        }
    } else {
        res.locals.unreadCount = 0;
    }
    next();
};
module.exports = { isAuthenticated, isStudent, isStaff, isAdmin, addUnreadCount };