import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useStateContext } from './index';

export interface AuthUser { id: number; email: string; name: string; walletAddress: string | null; memberSince: string; }
interface AuthContextValue { user: AuthUser | null; isAuthLoading: boolean; error: string; pendingEmail: string; register: (email: string, name: string, password: string, confirmPassword: string) => Promise<void>; verifyOtp: (email: string, otp: string) => Promise<void>; resendOtp: (email: string) => Promise<void>; login: (email: string, password: string) => Promise<void>; loginWithGoogle: () => void; logout: () => Promise<void>; linkWallet: (address: string) => Promise<void>; updateName: (name: string) => Promise<void>; }
const AuthContext = createContext<AuthContextValue | null>(null);
const API = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const friendly = (error: any) => error?.response?.error || error?.message || 'Something went wrong. Please try again.';
const request = async (path: string, options: RequestInit = {}) => { const response = await fetch(`${API}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.'); return body; };

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null); const [isAuthLoading, setIsAuthLoading] = useState(true); const [error, setError] = useState(''); const [pendingEmail, setPendingEmail] = useState(''); const { address } = useStateContext() || {};
  useEffect(() => { request('/api/auth/me').then((body) => setUser(body.user)).catch(() => undefined).finally(() => setIsAuthLoading(false)); }, []);
  useEffect(() => { if (user && address && !user.walletAddress) linkWallet(address).catch((reason) => setError(reason.message)); }, [user, address]);
  const run = async (action: () => Promise<any>) => { setError(''); try { return await action(); } catch (reason: any) { const message = friendly(reason); setError(message); throw new Error(message); } };
  const register = async (email: string, name: string, password: string, confirmPassword: string) => { const body = await run(() => request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, name, password, confirmPassword }) })); setPendingEmail(body.pendingEmail); };
  const verifyOtp = async (email: string, otp: string) => { const body = await run(() => request('/api/auth/register/verify', { method: 'POST', body: JSON.stringify({ email, otp }) })); setUser(body.user); setPendingEmail(''); };
  const resendOtp = async (email: string) => { await run(() => request('/api/auth/register/resend', { method: 'POST', body: JSON.stringify({ email }) })); };
  const login = async (email: string, password: string) => { const body = await run(() => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })); setUser(body.user); };
  const logout = async () => { await run(() => request('/api/auth/logout', { method: 'POST' })); setUser(null); };
  const linkWallet = async (walletAddress: string) => { const body = await request('/api/auth/wallet-link', { method: 'POST', body: JSON.stringify({ walletAddress }) }); setUser(body.user); };
  const updateName = async (name: string) => { const body = await run(() => request('/api/auth/me', { method: 'PATCH', body: JSON.stringify({ name }) })); setUser(body.user); };
  return <AuthContext.Provider value={{ user, isAuthLoading, error, pendingEmail, register, verifyOtp, resendOtp, login, loginWithGoogle: () => { window.location.href = `${API}/api/auth/google/login`; }, logout, linkWallet, updateName }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used within AuthProvider'); return value; };
