import { useEffect, useState } from 'react';

interface ProfileLookup { name: string; walletAddress: string | null; memberSince: string; }
const API = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const cache = new Map<string, ProfileLookup | null>();
const pending = new Map<string, Promise<ProfileLookup | null>>();
const truncate = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
const lookup = (address: string) => { const key = address.toLowerCase(); if (cache.has(key)) return Promise.resolve(cache.get(key)); if (!pending.has(key)) pending.set(key, fetch(`${API}/api/users/by-wallet/${key}`).then((response) => response.ok ? response.json() : null).catch(() => null).then((profile) => { cache.set(key, profile); pending.delete(key); return profile; })); return pending.get(key)!; };
export const useDisplayName = (address?: string) => { const [profile, setProfile] = useState<ProfileLookup | null>(address ? cache.get(address.toLowerCase()) ?? null : null); useEffect(() => { let mounted = true; if (address) lookup(address).then((value) => { if (mounted) setProfile(value ?? null); }); return () => { mounted = false; }; }, [address]); return { displayName: profile?.name || (address ? truncate(address) : 'Anonymous'), isLinked: Boolean(profile) }; };
export default useDisplayName;
