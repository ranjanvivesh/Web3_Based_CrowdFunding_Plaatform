"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const google_auth_library_1 = require("google-auth-library");
const nodemailer_1 = __importDefault(require("nodemailer"));
const app = (0, express_1.default)();
const port = Number(process.env.PORT || 8787);
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const sessionSecret = process.env.SESSION_SECRET || 'development-only-change-me';
const db = new better_sqlite3_1.default(process.env.DATABASE_PATH || 'data.sqlite');
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT, google_id TEXT UNIQUE, is_email_verified INTEGER NOT NULL DEFAULT 0, wallet_address TEXT UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS otp_records (email TEXT PRIMARY KEY, otp_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, pending_name TEXT NOT NULL, pending_password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);`);
app.use((0, cors_1.default)({ origin: frontendUrl, credentials: true }));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
const publicUser = (row) => ({ id: row.id, name: row.name, email: row.email, walletAddress: row.wallet_address, memberSince: row.created_at });
const safeProfile = (row) => ({ name: row.name, walletAddress: row.wallet_address, memberSince: row.created_at });
const issueSession = (res, userId) => res.cookie('session', jsonwebtoken_1.default.sign({ userId }, sessionSecret, { expiresIn: '7d' }), { httpOnly: true, signed: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
const currentUser = (req) => { const token = req.cookies.session; if (!token)
    return null; try {
    return jsonwebtoken_1.default.verify(token, sessionSecret);
}
catch {
    return null;
} };
const requireAuth = (req, res, next) => { const session = currentUser(req); if (!session)
    return res.status(401).json({ error: 'Please log in first.' }); req.userId = session.userId; next(); };
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const otpAttempts = new Map();
const sendOtpEmail = async (email, otp) => {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    if (!smtpHost || !smtpUser || !smtpPassword) {
        if (process.env.NODE_ENV === 'production')
            throw new Error('Email delivery is not configured.');
        console.log(`[dev] OTP for ${email}: ${otp}`);
        return;
    }
    const transporter = nodemailer_1.default.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPassword },
    });
    await transporter.sendMail({
        from: process.env.SMTP_FROM || smtpUser,
        to: email,
        subject: 'Your Kindred Fund verification code',
        text: `Your verification code is ${otp}. It expires in 10 minutes.`,
    });
};
const createOtp = async (email, name, password) => { const now = Date.now(); const attempts = (otpAttempts.get(email) || []).filter((time) => now - time < 60_000); if (attempts.length >= 3)
    throw new Error('Too many codes requested. Please wait a minute and try again.'); attempts.push(now); otpAttempts.set(email, attempts); const otp = String(node_crypto_1.default.randomInt(100000, 1000000)); db.prepare('INSERT OR REPLACE INTO otp_records (email, otp_hash, expires_at, pending_name, pending_password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(email, await bcryptjs_1.default.hash(otp, 10), now + 10 * 60_000, name, await bcryptjs_1.default.hash(password, 10), now); await sendOtpEmail(email, otp); };
app.post('/api/auth/register', async (req, res) => { const { email, name, password, confirmPassword } = req.body; if (!validEmail(email || ''))
    return res.status(400).json({ error: 'Enter a valid email address.' }); if (!name?.trim())
    return res.status(400).json({ error: 'Enter your name.' }); if (!password || password.length < 8)
    return res.status(400).json({ error: 'Your password must be at least 8 characters.' }); if (password !== confirmPassword)
    return res.status(400).json({ error: 'Those passwords do not match.' }); if (db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase()))
    return res.status(409).json({ error: 'An account with that email already exists.' }); try {
    await createOtp(email.toLowerCase(), name.trim(), password);
    res.json({ pendingEmail: email.toLowerCase() });
}
catch (error) {
    res.status(429).json({ error: error.message });
} });
app.post('/api/auth/register/verify', async (req, res) => { const { email, otp } = req.body; const record = db.prepare('SELECT * FROM otp_records WHERE email = ?').get(email?.toLowerCase()); if (!record || Date.now() > record.expires_at || !(await bcryptjs_1.default.compare(otp || '', record.otp_hash)))
    return res.status(400).json({ error: 'That code is invalid or has expired.' }); const result = db.prepare('INSERT INTO users (email, name, password_hash, is_email_verified) VALUES (?, ?, ?, 1)').run(email.toLowerCase(), record.pending_name, record.pending_password_hash); db.prepare('DELETE FROM otp_records WHERE email = ?').run(email.toLowerCase()); const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid); issueSession(res, user.id); res.json({ user: publicUser(user) }); });
app.post('/api/auth/register/resend', async (req, res) => { const email = req.body.email?.toLowerCase(); const record = db.prepare('SELECT * FROM otp_records WHERE email = ?').get(email); if (!record)
    return res.status(400).json({ error: 'Start registration again to request a new code.' }); try {
    await createOtp(email, record.pending_name, 'temporary-password');
    const latest = db.prepare('SELECT pending_password_hash FROM otp_records WHERE email = ?').get(email);
    db.prepare('UPDATE otp_records SET pending_password_hash = ? WHERE email = ?').run(record.pending_password_hash || latest.pending_password_hash, email);
    res.json({ pendingEmail: email });
}
catch (error) {
    res.status(429).json({ error: error.message });
} });
app.post('/api/auth/login', async (req, res) => { const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email?.toLowerCase()); if (!user || !user.password_hash || !(await bcryptjs_1.default.compare(req.body.password || '', user.password_hash)))
    return res.status(401).json({ error: 'Invalid email or password.' }); if (!user.is_email_verified)
    return res.status(403).json({ error: 'Please verify your email before logging in.' }); issueSession(res, user.id); res.json({ user: publicUser(user) }); });
app.post('/api/auth/logout', (_req, res) => res.clearCookie('session').json({ ok: true }));
app.get('/api/auth/me', (req, res) => { const session = currentUser(req); if (!session)
    return res.status(401).json({ error: 'Not signed in.' }); const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId); return user ? res.json({ user: publicUser(user) }) : res.status(401).json({ error: 'Not signed in.' }); });
app.patch('/api/auth/me', requireAuth, (req, res) => { if (!req.body.name?.trim())
    return res.status(400).json({ error: 'Enter a name first.' }); db.prepare('UPDATE users SET name = ? WHERE id = ?').run(req.body.name.trim(), req.userId); res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId)) }); });
app.post('/api/auth/wallet-link', requireAuth, (req, res) => { const wallet = req.body.walletAddress?.toLowerCase(); if (!/^0x[a-f0-9]{40}$/.test(wallet || ''))
    return res.status(400).json({ error: 'That wallet address is not valid.' }); const existing = db.prepare('SELECT id FROM users WHERE wallet_address = ?').get(wallet); if (existing && existing.id !== req.userId)
    return res.status(409).json({ error: 'That wallet is already linked to another account.' }); db.prepare('UPDATE users SET wallet_address = ? WHERE id = ?').run(wallet, req.userId); res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId)) }); });
const oauth = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_CALLBACK_URL || `${frontendUrl.replace(':5173', ':8787')}/api/auth/google/callback`);
app.get('/api/auth/google/login', (req, res) => { if (!process.env.GOOGLE_CLIENT_ID)
    return res.status(503).send('Google sign-in is not configured yet.'); const state = node_crypto_1.default.randomBytes(24).toString('hex'); res.cookie('oauth_state', state, { httpOnly: true, signed: false, sameSite: 'lax' }); res.redirect(oauth.generateAuthUrl({ access_type: 'online', scope: ['openid', 'email', 'profile'], state })); });
app.get('/api/auth/google/callback', async (req, res) => { try {
    if (!req.query.state || req.query.state !== req.cookies.oauth_state)
        return res.status(400).send('Google sign-in could not be verified.');
    const { tokens } = await oauth.getToken(String(req.query.code));
    const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email)
        throw new Error('No email returned by Google.');
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(payload.email.toLowerCase());
    if (user) {
        db.prepare('UPDATE users SET google_id = ?, is_email_verified = 1 WHERE id = ?').run(payload.sub, user.id);
    }
    else {
        const result = db.prepare('INSERT INTO users (email, name, google_id, is_email_verified) VALUES (?, ?, ?, 1)').run(payload.email.toLowerCase(), payload.name || payload.email.split('@')[0], payload.sub);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }
    issueSession(res, user.id);
    res.redirect(`${frontendUrl}/profile`);
}
catch {
    res.status(400).send('Google sign-in could not be completed. Please try again.');
} });
app.get('/api/users/by-wallet/:address', (req, res) => { const user = db.prepare('SELECT name, wallet_address, created_at FROM users WHERE wallet_address = ?').get(req.params.address.toLowerCase()); return user ? res.json(safeProfile(user)) : res.status(404).json({ error: 'No linked account.' }); });
app.get('/api/users/:id', (req, res) => { const user = db.prepare('SELECT name, wallet_address, created_at FROM users WHERE id = ?').get(req.params.id); return user ? res.json(safeProfile(user)) : res.status(404).json({ error: 'Profile not found.' }); });
app.listen(port, () => console.log(`Auth server listening on http://localhost:${port}`));
