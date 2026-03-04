import React, { createContext, useCallback, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/services/authApi';

export type UserRole = 'admin' | 'office' | 'technician' | 'customer';

export interface User {
  id: number | string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  token: string;
  /** TechnicianProfile pk for GET /technicians/{id}/ */
  technician_profile_id?: string | number;
  phone?: string;
  station_name?: string;
  street_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  specialization?: string;
  expertise?: string;
  skill_score?: number;
  total_jobs_completed?: number;
  total_years_experience?: number;
  date_joined?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  /** Fetch full profile from API (email, phone, station, specialization, expertise) and merge into user */
  fetchProfile: () => Promise<void>;
  isRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const getAccessToken = (payload: any): string => {
    if (!payload || typeof payload !== 'object') return '';
    if (typeof payload.access === 'string' && payload.access.trim()) return payload.access;
    if (typeof payload.access_token === 'string' && payload.access_token.trim()) return payload.access_token;
    if (typeof payload.token === 'string' && payload.token.trim()) return payload.token;
    if (typeof payload.key === 'string' && payload.key.trim()) return payload.key;
    if (payload.tokens && typeof payload.tokens === 'object') {
      const maybe = (payload.tokens as any).access;
      if (typeof maybe === 'string' && maybe.trim()) return maybe;
    }
    return '';
  };

  const toNonEmptyString = (value: unknown): string => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
  };

  const normalizeRole = (base: any, fullPayload: any): UserRole => {
    const payload = fullPayload ?? base;
    const rawRole =
      toNonEmptyString(base?.role) ||
      toNonEmptyString(payload?.role) ||
      toNonEmptyString(base?.user_role) ||
      toNonEmptyString(payload?.user_role) ||
      toNonEmptyString(base?.type);

    const lower = rawRole.toLowerCase();
    if (['admin', 'office', 'technician', 'customer'].includes(lower)) {
      return lower as UserRole;
    }
    if (lower === 'staff' || lower === 'office_staff') return 'office';

    if (base?.is_superuser || base?.is_staff || payload?.is_superuser || payload?.is_staff) return 'admin';
    return 'customer';
  };

  const normalizeUserPayload = (payload: any): User => {
    const base =
      (payload && typeof payload === 'object' && typeof payload.user === 'object' && payload.user) ||
      (payload && typeof payload === 'object' && typeof payload.profile === 'object' && payload.profile) ||
      (payload && typeof payload === 'object' && typeof payload.technician === 'object' && payload.technician) ||
      (payload && typeof payload === 'object' && typeof payload.data === 'object' && payload.data) ||
      payload ||
      {};

    const idRaw = (base as any).id ?? (payload as any)?.id;
    const id: number | string =
      typeof idRaw === 'number' && Number.isFinite(idRaw)
        ? idRaw
        : typeof idRaw === 'string' && idRaw.trim()
          ? idRaw.trim()
          : Number.parseInt(String(idRaw ?? '0'), 10) || 0;

    const techProfileIdRaw = (base as any).technician_profile_id ?? (base as any).technician_id ?? (payload as any)?.technician_profile_id ?? (payload as any)?.technician_id;
    const technician_profile_id =
      techProfileIdRaw != null && techProfileIdRaw !== ''
        ? (typeof techProfileIdRaw === 'number' ? techProfileIdRaw : String(techProfileIdRaw))
        : undefined;

    const username =
      toNonEmptyString((base as any).username) ||
      toNonEmptyString((base as any).username_display) ||
      toNonEmptyString((payload as any)?.username) ||
      toNonEmptyString((payload as any)?.username_display);

    const email =
      toNonEmptyString((base as any).email) ||
      toNonEmptyString((base as any).email_display) ||
      toNonEmptyString((payload as any)?.email) ||
      toNonEmptyString((payload as any)?.email_display);

    let firstName =
      toNonEmptyString((base as any).first_name) ||
      toNonEmptyString((base as any).first_name_display) ||
      toNonEmptyString((payload as any)?.first_name) ||
      toNonEmptyString((payload as any)?.first_name_display);

    let lastName =
      toNonEmptyString((base as any).last_name) ||
      toNonEmptyString((base as any).last_name_display) ||
      toNonEmptyString((payload as any)?.last_name) ||
      toNonEmptyString((payload as any)?.last_name_display);

    if (!firstName && !lastName) {
      const full =
        toNonEmptyString((base as any).full_name) ||
        toNonEmptyString((base as any).display_name) ||
        toNonEmptyString((payload as any)?.display_name) ||
        toNonEmptyString((base as any).name) ||
        toNonEmptyString((payload as any)?.name) ||
        username;
      if (full) {
        const parts = full.split(/\s+/).filter(Boolean);
        firstName = parts[0] ?? '';
        lastName = parts.slice(1).join(' ');
      }
    }
    if (!firstName && toNonEmptyString((base as any).display_name)) firstName = toNonEmptyString((base as any).display_name);
    if (!firstName && toNonEmptyString((payload as any)?.display_name)) firstName = toNonEmptyString((payload as any).display_name);
    if (!firstName && username) firstName = username;
    if (firstName && !lastName && firstName === username) lastName = '';
    if (firstName && lastName && firstName === lastName) lastName = '';

    const role = normalizeRole(base, payload);
    const token = toNonEmptyString((base as any).token) || getAccessToken(payload);

    const phone =
      toNonEmptyString((base as any).phone) ||
      toNonEmptyString((base as any).phone_number) ||
      toNonEmptyString((payload as any)?.phone) ||
      toNonEmptyString((payload as any)?.phone_number);
    const stationName =
      toNonEmptyString((base as any).station_name) ||
      toNonEmptyString((payload as any)?.station_name);
    const specialization =
      toNonEmptyString((base as any).specialization) ||
      toNonEmptyString((payload as any)?.specialization);
    const expertise =
      toNonEmptyString((base as any).expertise) ||
      toNonEmptyString((payload as any)?.expertise);
    const skillScoreRaw = (base as any).skill_score ?? (payload as any)?.skill_score;
    const skillScore = typeof skillScoreRaw === 'number' && Number.isFinite(skillScoreRaw) ? skillScoreRaw : undefined;
    const totalJobs = (base as any).total_jobs_completed ?? (payload as any)?.total_jobs_completed;
    const totalYears = (base as any).total_years_experience ?? (payload as any)?.total_years_experience;
    const dateJoined = toNonEmptyString((base as any).date_joined) || toNonEmptyString((payload as any)?.date_joined);

    return {
      id,
      username,
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      token,
      ...(technician_profile_id != null && { technician_profile_id }),
      ...(phone && { phone }),
      ...(stationName && { station_name: stationName }),
      ...(specialization && { specialization }),
      ...(expertise && { expertise }),
      ...(skillScore != null && { skill_score: skillScore }),
      ...(totalJobs != null && { total_jobs_completed: Number(totalJobs) }),
      ...(totalYears != null && { total_years_experience: Number(totalYears) }),
      ...(dateJoined && { date_joined: dateJoined }),
    };
  };

  const applyUser = (u: User) => {
    setUser(u);
    localStorage.setItem('cummins_user', JSON.stringify(u));
    const t = getAccessToken(u) || u.token;
    if (t) localStorage.setItem('access', t);
  };

  useEffect(() => {
    const stored = localStorage.getItem('cummins_user');
    const accessToken = localStorage.getItem('access');
    if (stored && accessToken) {
      try {
        const parsed = JSON.parse(stored);
        const normalized = normalizeUserPayload(parsed);
        setUser(normalized);
        localStorage.setItem('access', getAccessToken(parsed) || normalized.token);
        authApi.getMe().then((me) => {
          if (me && typeof me === 'object') {
            const fromServer = normalizeUserPayload(me);
            applyUser(fromServer);
          }
        }).catch(() => {});
      } catch {
        localStorage.removeItem('cummins_user');
        localStorage.removeItem('access');
      }
    } else if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const normalized = normalizeUserPayload(parsed);
        setUser(normalized);
        const t = getAccessToken(parsed) || normalized.token;
        if (t) localStorage.setItem('access', t);
      } catch {
        localStorage.removeItem('cummins_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const userData = await authApi.login(username, password) as any;
    let normalizedUser = normalizeUserPayload(userData);
    if (!normalizedUser.username) normalizedUser = { ...normalizedUser, username };
    if (!normalizedUser.first_name && !normalizedUser.last_name) {
      normalizedUser = { ...normalizedUser, first_name: username, last_name: '' };
    }
    const accessToken = getAccessToken(userData) || normalizedUser.token;

    setUser(normalizedUser);
    localStorage.setItem('cummins_user', JSON.stringify(normalizedUser));
    if (accessToken) localStorage.setItem('access', accessToken);

    try {
      const me = await authApi.getMe();
      if (me && typeof me === 'object') {
        const fromServer = normalizeUserPayload(me);
        setUser(fromServer);
        localStorage.setItem('cummins_user', JSON.stringify(fromServer));
        const t = getAccessToken(me) || fromServer.token;
        if (t) localStorage.setItem('access', t);
      }
    } catch {
      /* use login response only */
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    localStorage.removeItem('cummins_user');
    localStorage.removeItem('access');
  };

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('access');
    if (!token) return;
    try {
      const me = await authApi.getMe();
      if (me && typeof me === 'object') {
        const fromServer = normalizeUserPayload(me);
        setUser(fromServer);
        localStorage.setItem('cummins_user', JSON.stringify(fromServer));
        const t = getAccessToken(me) || fromServer.token;
        if (t) localStorage.setItem('access', t);
      }
    } catch {
      /* keep existing user */
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('access');
    if (!token) return;
    const current = user;
    try {
      const profileId = current?.technician_profile_id ?? current?.id;
      const profileData = await authApi.getProfile(profileId);
      if (!profileData || typeof profileData !== 'object') return;
      const fromApi = normalizeUserPayload(profileData);
      const merged: User = {
        ...current!,
        id: fromApi.id ?? current?.id ?? 0,
        technician_profile_id: fromApi.technician_profile_id ?? (fromApi.id != null ? fromApi.id : current?.technician_profile_id ?? current?.id),
        username: fromApi.username || current?.username || '',
        email: fromApi.email || current?.email || '',
        first_name: fromApi.first_name || current?.first_name || '',
        last_name: fromApi.last_name || current?.last_name || '',
        role: fromApi.role || current?.role || 'customer',
        token: current?.token || fromApi.token || token,
        phone: fromApi.phone || current?.phone,
        station_name: fromApi.station_name || current?.station_name,
        specialization: fromApi.specialization || current?.specialization,
        expertise: fromApi.expertise || current?.expertise,
        skill_score: fromApi.skill_score ?? current?.skill_score,
        total_jobs_completed: fromApi.total_jobs_completed ?? current?.total_jobs_completed,
        total_years_experience: fromApi.total_years_experience ?? current?.total_years_experience,
        date_joined: fromApi.date_joined || current?.date_joined,
      };
      setUser(merged);
      localStorage.setItem('cummins_user', JSON.stringify(merged));
    } catch {
      /* keep existing user */
    }
  }, [user]);

  const isRole = (...roles: UserRole[]) => {
    return user ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, fetchProfile, isRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
