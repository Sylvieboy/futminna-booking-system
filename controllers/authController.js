const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// ── EMAIL TRANSPORTER ─────────────────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ── SEND VERIFICATION EMAIL ───────────────────────────────
const sendVerificationEmail = async (email, full_name, token) => {
    const verifyUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
    await transporter.sendMail({
        from: `"FUT Minna Booking System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your Email - FUT Minna IT Booking System',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #2d6a9f;">🎓 FUT Minna IT Department Booking System</h2>
                <p>Dear <strong>${full_name}</strong>,</p>
                <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
                <a href="${verifyUrl}" style="display:inline-block; background:#2d6a9f; color:white; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold; margin: 16px 0;">
                    Verify My Email
                </a>
                <p>Or copy and paste this link in your browser:</p>
                <p style="color:#666; font-size:0.85rem;">${verifyUrl}</p>
                <p style="color:#e74c3c; font-size:0.85rem;">⚠️ This link will expire in 24 hours.</p>
                <hr>
                <p style="font-size:0.8rem; color:#999;">If you did not register on this platform, please ignore this email.</p>
            </div>
        `
    });
};

// ── GET HOME ──────────────────────────────────────────────
const getHome = async (req, res) => {
    try {
        const { data: announcements } = await supabase
            .from('announcements')
            .select('*')
            .order('posted_at', { ascending: false })
            .limit(5);

        res.render('index', {
            title: 'FUT Minna - IT Department Booking System',
            announcements: announcements || []
        });
    } catch (error) {
        console.error(error);
        res.render('index', {
            title: 'FUT Minna - IT Department Booking System',
            announcements: []
        });
    }
};

// ── GET REGISTER ──────────────────────────────────────────
const getRegister = (req, res) => {
    if (req.session.user) {
        return res.redirect(`/${req.session.user.role}/dashboard`);
    }
    res.render('auth/register', { title: 'Register' });
};

// ── POST REGISTER ─────────────────────────────────────────
const postRegister = async (req, res) => {
    const {
        first_name, last_name, gender, email, phone,
        role, admin_code, matric_number, staff_id,
        department, faculty, password, confirm_password
    } = req.body;

    const full_name = `${first_name} ${last_name}`;

    // Basic validation
    if (!first_name || !last_name || !gender || !email || !password || !role || !department || !faculty) {
        req.flash('error_msg', 'Please fill in all required fields');
        return res.redirect('/register');
    }

    if (password !== confirm_password) {
        req.flash('error_msg', 'Passwords do not match');
        return res.redirect('/register');
    }

    if (password.length < 6) {
        req.flash('error_msg', 'Password must be at least 6 characters');
        return res.redirect('/register');
    }

    // Role-specific validation
    if (role === 'admin') {
        if (!admin_code || admin_code !== process.env.ADMIN_SECRET_CODE) {
            req.flash('error_msg', 'Invalid admin secret code. Contact the department to get the code.');
            return res.redirect('/register');
        }
    }

    if (role === 'student' && !matric_number) {
        req.flash('error_msg', 'Please enter your matric number');
        return res.redirect('/register');
    }

    if (role === 'staff' && !staff_id) {
        req.flash('error_msg', 'Please enter your staff ID');
        return res.redirect('/register');
    }

    try {
        // Check if email already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (existingUser) {
            req.flash('error_msg', 'Email address is already registered');
            return res.redirect('/register');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate email verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Insert new user (email_verified = false by default)
        const { error } = await supabase
            .from('users')
            .insert([{
                full_name,
                first_name,
                last_name,
                gender,
                email,
                password: hashedPassword,
                role,
                phone: phone || null,
                department,
                faculty,
                matric_number: role === 'student' ? matric_number : null,
                staff_id: role === 'staff' ? staff_id : null,
                email_verified: true,
                verification_token: verificationToken,
                token_expiry: tokenExpiry
            }]);

        if (error) throw error;

     // Email verification skipped for now
        // await sendVerificationEmail(email, full_name, verificationToken);
        
        req.flash('success_msg', '✅ Registration successful! You can now log in.');
        res.redirect('/login');

    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'An error occurred during registration. Please try again');
        res.redirect('/register');
    }
};

// ── VERIFY EMAIL ──────────────────────────────────────────
const verifyEmail = async (req, res) => {
    const { token } = req.query;

    if (!token) {
        req.flash('error_msg', 'Invalid verification link');
        return res.redirect('/login');
    }

    try {
        // Find user with this token
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('verification_token', token)
            .single();

        if (error || !user) {
            req.flash('error_msg', 'Invalid or expired verification link. Please register again.');
            return res.redirect('/register');
        }

        // Check if token has expired
        if (new Date() > new Date(user.token_expiry)) {
            req.flash('error_msg', 'Your verification link has expired. Please register again.');
            return res.redirect('/register');
        }

        // Mark email as verified
        await supabase
            .from('users')
            .update({
                email_verified: true,
                verification_token: null,
                token_expiry: null
            })
            .eq('id', user.id);

        req.flash('success_msg', '✅ Email verified successfully! You can now log in.');
        res.redirect('/login');

    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect('/login');
    }
};

// ── GET LOGIN ─────────────────────────────────────────────
const getLogin = (req, res) => {
    if (req.session.user) {
        return res.redirect(`/${req.session.user.role}/dashboard`);
    }
    res.render('auth/login', { title: 'Login' });
};

// ── POST LOGIN ────────────────────────────────────────────
const postLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        req.flash('error_msg', 'Please enter your email and password');
        return res.redirect('/login');
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            req.flash('error_msg', 'Invalid email or password');
            return res.redirect('/login');
        }

        // Check if email is verified
        if (!user.email_verified) {
            req.flash('error_msg', '⚠️ Please verify your email before logging in. Check your inbox for the verification link.');
            return res.redirect('/login');
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error_msg', 'Invalid email or password');
            return res.redirect('/login');
        }

        // Create session
        req.session.user = {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            department: user.department,
            faculty: user.faculty
        };

        req.flash('success_msg', `Welcome back, ${user.full_name}!`);
        res.redirect(`/${user.role}/dashboard`);

    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'An error occurred. Please try again');
        res.redirect('/login');
    }
};

// ── LOGOUT ────────────────────────────────────────────────
const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error(err);
        res.redirect('/login');
    });
};

module.exports = {
    getHome,
    getRegister,
    postRegister,
    verifyEmail,
    getLogin,
    postLogin,
    logout
};