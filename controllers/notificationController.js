const supabase = require('../config/supabase');

// GET Notifications
const getNotifications = async (req, res) => {
    try {
        const { data: notifications } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', req.session.user.id)
            .order('created_at', { ascending: false });

        const unreadCount = notifications ? notifications.filter(n => !n.is_read).length : 0;

        res.render('shared/notifications', {
            title: 'Notifications',
            user: req.session.user,
            notifications: notifications || [],
            unreadCount
        });
    } catch (error) {
        console.error(error);
        res.redirect(`/${req.session.user.role}/dashboard`);
    }
};

// Mark single notification as read
const markAsRead = async (req, res) => {
    try {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', req.params.id)
            .eq('user_id', req.session.user.id);

        res.redirect(`/${req.session.user.role}/notifications`);
    } catch (error) {
        console.error(error);
        res.redirect(`/${req.session.user.role}/notifications`);
    }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
    try {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', req.session.user.id);

        req.flash('success_msg', 'All notifications marked as read!');
        res.redirect(`/${req.session.user.role}/notifications`);
    } catch (error) {
        console.error(error);
        res.redirect(`/${req.session.user.role}/notifications`);
    }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };