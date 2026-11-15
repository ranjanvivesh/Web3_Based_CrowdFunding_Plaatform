import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';

const app = express();
const port = Number(process.env.PORT || 8787);
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const sessionSecret = process.env.SESSION_SECRET || 'development-only-change-me';
const db = new Database(process.env.DATABASE_PATH || 'data.sqlite');
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT, google_id TEXT UNIQUE, is_email_verified INTEGER NOT NULL DEFAULT 0, wallet_address TEXT UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS otp_records (email TEXT PRIMARY KEY, otp_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, pending_name TEXT NOT NULL, pending_password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);`);

app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());

type PublicUser = { id: number; name: string; email: string; walletAddress: string | null; memberSince: string };
const publicUser = (row: any): PublicUser => ({ id: row.id, name: row.name, email: row.email, walletAddress: row.wallet_address, memberSince: row.created_at });
const safeProfile = (row: any) => ({ name: row.name, walletAddress: row.wallet_address, memberSince: row.created_at });
const issueSession = (res: Response, userId: number) => res.cookie('session', jwt.sign({ userId }, sessionSecret, { expiresIn: '7d' }), { httpOnly: true, signed: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
const currentUser = (req: Request) => { const token = req.cookies.session; if (!token) return null; try { return jwt.verify(token, sessionSecret) as { userId: number }; } catch { return null; } };
const requireAuth = (req: Request, res: Response, next: NextFunction) => { const session = currentUser(req); if (!session) return res.status(401).json({ error: 'Please log in first.' }); (req as any).userId = session.userId; next(); };
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const otpAttempts = new Map<string, number[]>();
const sendOtpEmail = async (email: string, otp: string) => {
	const smtpHost = process.env.SMTP_HOST;
	const smtpUser = process.env.SMTP_USER;
	const smtpPassword = process.env.SMTP_PASSWORD;
	if (!smtpHost || !smtpUser || !smtpPassword) {
		if (process.env.NODE_ENV === 'production') throw new Error('Email delivery is not configured.');
		console.log(`[dev] OTP for ${email}: ${otp}`);
		return;
	}
	const transporter = nodemailer.createTransport({
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
const createOtp = async (email: string, name: string, password: string) => { const now = Date.now(); const attempts = (otpAttempts.get(email) || []).filter((time) => now - time < 60_000); if (attempts.length >= 3) throw new Error('Too many codes requested. Please wait a minute and try again.'); attempts.push(now); otpAttempts.set(email, attempts); const otp = String(crypto.randomInt(100000, 1000000)); db.prepare('INSERT OR REPLACE INTO otp_records (email, otp_hash, expires_at, pending_name, pending_password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(email, await bcrypt.hash(otp, 10), now + 10 * 60_000, name, await bcrypt.hash(password, 10), now); await sendOtpEmail(email, otp); };

app.post('/api/auth/register', async (req, res) => { const { email, name, password, confirmPassword } = req.body; if (!validEmail(email || '')) return res.status(400).json({ error: 'Enter a valid email address.' }); if (!name?.trim()) return res.status(400).json({ error: 'Enter your name.' }); if (!password || password.length < 8) return res.status(400).json({ error: 'Your password must be at least 8 characters.' }); if (password !== confirmPassword) return res.status(400).json({ error: 'Those passwords do not match.' }); if (db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())) return res.status(409).json({ error: 'An account with that email already exists.' }); try { await createOtp(email.toLowerCase(), name.trim(), password); res.json({ pendingEmail: email.toLowerCase() }); } catch (error: any) { res.status(429).json({ error: error.message }); } });
app.post('/api/auth/register/verify', async (req, res) => { const { email, otp } = req.body; const record: any = db.prepare('SELECT * FROM otp_records WHERE email = ?').get(email?.toLowerCase()); if (!record || Date.now() > record.expires_at || !(await bcrypt.compare(otp || '', record.otp_hash))) return res.status(400).json({ error: 'That code is invalid or has expired.' }); const result: any = db.prepare('INSERT INTO users (email, name, password_hash, is_email_verified) VALUES (?, ?, ?, 1)').run(email.toLowerCase(), record.pending_name, record.pending_password_hash); db.prepare('DELETE FROM otp_records WHERE email = ?').run(email.toLowerCase()); const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid); issueSession(res, user.id); res.json({ user: publicUser(user) }); });
app.post('/api/auth/register/resend', async (req, res) => { const email = req.body.email?.toLowerCase(); const record: any = db.prepare('SELECT * FROM otp_records WHERE email = ?').get(email); if (!record) return res.status(400).json({ error: 'Start registration again to request a new code.' }); try { await createOtp(email, record.pending_name, 'temporary-password'); const latest: any = db.prepare('SELECT pending_password_hash FROM otp_records WHERE email = ?').get(email); db.prepare('UPDATE otp_records SET pending_password_hash = ? WHERE email = ?').run(record.pending_password_hash || latest.pending_password_hash, email); res.json({ pendingEmail: email }); } catch (error: any) { res.status(429).json({ error: error.message }); } });
app.post('/api/auth/login', async (req, res) => { const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email?.toLowerCase()); if (!user || !user.password_hash || !(await bcrypt.compare(req.body.password || '', user.password_hash))) return res.status(401).json({ error: 'Invalid email or password.' }); if (!user.is_email_verified) return res.status(403).json({ error: 'Please verify your email before logging in.' }); issueSession(res, user.id); res.json({ user: publicUser(user) }); });
app.post('/api/auth/logout', (_req, res) => res.clearCookie('session').json({ ok: true }));
app.get('/api/auth/me', (req, res) => { const session = currentUser(req); if (!session) return res.status(401).json({ error: 'Not signed in.' }); const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId); return user ? res.json({ user: publicUser(user) }) : res.status(401).json({ error: 'Not signed in.' }); });
app.patch('/api/auth/me', requireAuth, (req, res) => { if (!req.body.name?.trim()) return res.status(400).json({ error: 'Enter a name first.' }); db.prepare('UPDATE users SET name = ? WHERE id = ?').run(req.body.name.trim(), (req as any).userId); res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get((req as any).userId)) }); });
app.post('/api/auth/wallet-link', requireAuth, (req, res) => { const wallet = req.body.walletAddress?.toLowerCase(); if (!/^0x[a-f0-9]{40}$/.test(wallet || '')) return res.status(400).json({ error: 'That wallet address is not valid.' }); const existing: any = db.prepare('SELECT id FROM users WHERE wallet_address = ?').get(wallet); if (existing && existing.id !== (req as any).userId) return res.status(409).json({ error: 'That wallet is already linked to another account.' }); db.prepare('UPDATE users SET wallet_address = ? WHERE id = ?').run(wallet, (req as any).userId); res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get((req as any).userId)) }); });

const oauth = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_CALLBACK_URL || `${frontendUrl.replace(':5173', ':8787')}/api/auth/google/callback`);
app.get('/api/auth/google/login', (req, res) => { if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).send('Google sign-in is not configured yet.'); const state = crypto.randomBytes(24).toString('hex'); res.cookie('oauth_state', state, { httpOnly: true, signed: false, sameSite: 'lax' }); res.redirect(oauth.generateAuthUrl({ access_type: 'online', scope: ['openid', 'email', 'profile'], state })); });
app.get('/api/auth/google/callback', async (req, res) => { try { if (!req.query.state || req.query.state !== req.cookies.oauth_state) return res.status(400).send('Google sign-in could not be verified.'); const { tokens } = await oauth.getToken(String(req.query.code)); const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token!, audience: process.env.GOOGLE_CLIENT_ID }); const payload = ticket.getPayload(); if (!payload?.email) throw new Error('No email returned by Google.'); let user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(payload.email.toLowerCase()); if (user) { db.prepare('UPDATE users SET google_id = ?, is_email_verified = 1 WHERE id = ?').run(payload.sub, user.id); } else { const result: any = db.prepare('INSERT INTO users (email, name, google_id, is_email_verified) VALUES (?, ?, ?, 1)').run(payload.email.toLowerCase(), payload.name || payload.email.split('@')[0], payload.sub); user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid); } issueSession(res, user.id); res.redirect(`${frontendUrl}/profile`); } catch { res.status(400).send('Google sign-in could not be completed. Please try again.'); } });

app.get('/api/users/by-wallet/:address', (req, res) => { const user = db.prepare('SELECT name, wallet_address, created_at FROM users WHERE wallet_address = ?').get(req.params.address.toLowerCase()); return user ? res.json(safeProfile(user)) : res.status(404).json({ error: 'No linked account.' }); });
app.get('/api/users/:id', (req, res) => { const user = db.prepare('SELECT name, wallet_address, created_at FROM users WHERE id = ?').get(req.params.id); return user ? res.json(safeProfile(user)) : res.status(404).json({ error: 'Profile not found.' }); });
app.listen(port, () => console.log(`Auth server listening on http://localhost:${port}`));
