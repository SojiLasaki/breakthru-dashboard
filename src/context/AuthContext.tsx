import React, { createContext, useCallback, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/services/authApi';

export type UserRole = 'admin' | 'office' | 'technician' | 'customer';

export interface User {
  id: number | string;
  profile_id?: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  first_name_display?: string;
  last_name_display?: string;
  role: UserRole;
  token: string;
  /** TechnicianProfile pk for GET /technicians/{id}/ */
  technician_profile_id?: string | number;
  phone?: string;
  status?: string;
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
  performance_rating?: number;
  assigned_tickets_count?: number;
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
  const userRef = useRef<User | null>(null);
  userRef.current = user;

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

    const profileUuid = toNonEmptyString((base as any).profile_id) || toNonEmptyString((payload as any)?.profile_id);
    const techProfileIdRaw =
      (base as any).technician_profile_id ??
      (base as any).technician_id ??
      (payload as any)?.technician_profile_id ??
      (payload as any)?.technician_id;
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
      toNonEmptyString((base as any).email_dsplay) ||
      toNonEmptyString((payload as any)?.email) ||
      toNonEmptyString((payload as any)?.email_display) ||
      toNonEmptyString((payload as any)?.email_dsplay);

    const firstNameDisplay =
      toNonEmptyString((base as any).first_name_display) ||
      toNonEmptyString((base as any).first_name_dsplay) ||
      toNonEmptyString((payload as any)?.first_name_display) ||
      toNonEmptyString((payload as any)?.first_name_dsplay);

    const lastNameDisplay =
      toNonEmptyString((base as any).last_name_display) ||
      toNonEmptyString((base as any).last_name_dsplay) ||
      toNonEmptyString((payload as any)?.last_name_display) ||
      toNonEmptyString((payload as any)?.last_name_dsplay);

    let firstName =
      toNonEmptyString((base as any).first_name) ||
      firstNameDisplay ||
      toNonEmptyString((payload as any)?.first_name);

    let lastName =
      toNonEmptyString((base as any).last_name) ||
      lastNameDisplay ||
      toNonEmptyString((payload as any)?.last_name);

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
      toNonEmptyString((base as any).phone_display) ||
      toNonEmptyString((base as any).phone_dsplay) ||
      toNonEmptyString((base as any).phone_number) ||
      toNonEmptyString((base as any).phone_number_display) ||
      toNonEmptyString((base as any).phone_number_dsplay) ||
      toNonEmptyString((payload as any)?.phone) ||
      toNonEmptyString((payload as any)?.phone_display) ||
      toNonEmptyString((payload as any)?.phone_dsplay) ||
      toNonEmptyString((payload as any)?.phone_number) ||
      toNonEmptyString((payload as any)?.phone_number_display) ||
      toNonEmptyString((payload as any)?.phone_number_dsplay);
    // Station: user.station_name = display name; user.station = UUID (do not use UUID as display)
    const stationNameObj = (base as any).station ?? (payload as any)?.station;
    const stationName =
      toNonEmptyString((base as any).station_name) ||
      toNonEmptyString((base as any).station_name_display) ||
      toNonEmptyString((base as any).station_display) ||
      toNonEmptyString((stationNameObj && typeof stationNameObj === 'object') ? (stationNameObj as any).name : '') ||
      toNonEmptyString((payload as any)?.station_name) ||
      toNonEmptyString((payload as any)?.station_name_display) ||
      toNonEmptyString((payload as any)?.station_display) ||
      toNonEmptyString(((payload as any)?.station && typeof (payload as any)?.station === 'object') ? (payload as any).station.name : '');

    // Location (city): user.location = station city or profile city
    const city =
      toNonEmptyString((base as any).location) ||
      toNonEmptyString((base as any).location_display) ||
      toNonEmptyString((base as any).city) ||
      toNonEmptyString((base as any).city_display) ||
      toNonEmptyString((payload as any)?.location) ||
      toNonEmptyString((payload as any)?.location_display) ||
      toNonEmptyString((payload as any)?.city) ||
      toNonEmptyString((payload as any)?.city_display);

    const streetAddress =
      toNonEmptyString((base as any).street_address) ||
      toNonEmptyString((payload as any)?.street_address);
    const state =
      toNonEmptyString((base as any).state) ||
      toNonEmptyString((payload as any)?.state);
    const postalCode =
      toNonEmptyString((base as any).postal_code) ||
      toNonEmptyString((payload as any)?.postal_code);
    const country =
      toNonEmptyString((base as any).country) ||
      toNonEmptyString((payload as any)?.country);

    const specialization =
      toNonEmptyString((base as any).specialization) ||
      toNonEmptyString((base as any).specialization_display) ||
      toNonEmptyString((base as any).specialty) ||
      toNonEmptyString((payload as any)?.specialization) ||
      toNonEmptyString((payload as any)?.specialization_display) ||
      toNonEmptyString((payload as any)?.specialty);

    const expertise =
      toNonEmptyString((base as any).expertise) ||
      toNonEmptyString((base as any).expertise_display) ||
      toNonEmptyString((payload as any)?.expertise) ||
      toNonEmptyString((payload as any)?.expertise_display);
    const status = toNonEmptyString((base as any).status) || toNonEmptyString((payload as any)?.status);
    const skillScoreRaw = (base as any).skill_score ?? (payload as any)?.skill_score;
    const skillScore = typeof skillScoreRaw === 'number' && Number.isFinite(skillScoreRaw) ? skillScoreRaw : undefined;
    const totalJobs = (base as any).total_jobs_completed ?? (payload as any)?.total_jobs_completed;
    const totalYears = (base as any).total_years_experience ?? (payload as any)?.total_years_experience;
    const dateJoined = toNonEmptyString((base as any).date_joined) || toNonEmptyString((payload as any)?.date_joined);
    const perfRaw = (base as any).performance_rating ?? (payload as any)?.performance_rating;
    const performanceRating = typeof perfRaw === 'number' && Number.isFinite(perfRaw) ? perfRaw : undefined;
    const assignedRaw = (base as any).assigned_tickets_count ?? (payload as any)?.assigned_tickets_count;
    const assignedTicketsCount = typeof assignedRaw === 'number' && Number.isFinite(assignedRaw) ? assignedRaw : undefined;

    return {
      id,
      ...(profileUuid && { profile_id: profileUuid }),
      username,
      email,
      first_name: firstName,
      last_name: lastName,
      ...(firstNameDisplay && { first_name_display: firstNameDisplay }),
      ...(lastNameDisplay && { last_name_display: lastNameDisplay }),
      role,
      token,
      ...(technician_profile_id != null && { technician_profile_id }),
      ...(phone && { phone }),
      ...(status && { status }),
      ...(stationName && { station_name: stationName }),
      ...(city && { city }),
      ...(streetAddress && { street_address: streetAddress }),
      ...(state && { state }),
      ...(postalCode && { postal_code: postalCode }),
      ...(country && { country }),
      ...(specialization && { specialization }),
      ...(expertise && { expertise }),
      ...(skillScore != null && { skill_score: skillScore }),
      ...(totalJobs != null && { total_jobs_completed: Number(totalJobs) }),
      ...(totalYears != null && { total_years_experience: Number(totalYears) }),
      ...(dateJoined && { date_joined: dateJoined }),
      ...(performanceRating != null && { performance_rating: performanceRating }),
      ...(assignedTicketsCount != null && { assigned_tickets_count: assignedTicketsCount }),
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

  const isEmpty = (v: unknown): boolean =>
    v == null || (typeof v === 'string' && !v.trim());

  const fill = (cur: unknown, from: unknown): unknown =>
    isEmpty(cur) && !isEmpty(from) ? from : cur;

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('access');
    const current = userRef.current;
    if (!token || !current) return;
    const isTech = current.role === 'technician';
    const profileId = current.technician_profile_id ?? (isTech ? current.id : null);
    const needsFill =
      isEmpty(current.first_name) ||
      isEmpty(current.last_name) ||
      isEmpty(current.email) ||
      isEmpty(current.phone) ||
      isEmpty(current.station_name) ||
      isEmpty(current.city);

    try {
      let fromTech: User | null = null;
      let fromUsername: User | null = null;

      if (isTech && profileId != null && profileId !== '') {
        try {
          const profileData = await authApi.getProfile(profileId);
          if (profileData && typeof profileData === 'object') {
            fromTech = normalizeUserPayload(profileData);
          }
        } catch {
          /* backend may not have /api/technicians/ */
        }
      }
      if (current.username && needsFill) {
        const profileData = await authApi.getProfileByUsername(current.username);
        if (profileData && typeof profileData === 'object') {
          fromUsername = normalizeUserPayload(profileData);
        }
      }

      const apply = fromTech ?? fromUsername;
      if (!apply) return;

      const merged: User = {
        ...current,
        id: current.id,
        profile_id: apply.profile_id ?? current.profile_id,
        technician_profile_id: apply.technician_profile_id ?? current.technician_profile_id,
        username: current.username,
        role: current.role,
        token: current.token || token,
        email: (fill(fill(current.email, fromTech?.email), fromUsername?.email) ?? current.email) as string,
        first_name: (fill(fill(current.first_name, fromTech?.first_name), fromUsername?.first_name) ?? current.first_name) as string,
        last_name: (fill(fill(current.last_name, fromTech?.last_name), fromUsername?.last_name) ?? current.last_name) as string,
        first_name_display: isEmpty(current.first_name_display) ? (fromTech?.first_name_display ?? fromUsername?.first_name_display) : current.first_name_display,
        last_name_display: isEmpty(current.last_name_display) ? (fromTech?.last_name_display ?? fromUsername?.last_name_display) : current.last_name_display,
        phone: fill(fill(current.phone, fromTech?.phone), fromUsername?.phone) ?? current.phone,
        status: fromTech?.status || fromUsername?.status || current.status,
        station_name: fill(fill(current.station_name, fromTech?.station_name), fromUsername?.station_name) ?? current.station_name,
        city: fill(fill(current.city, fromTech?.city), fromUsername?.city) ?? current.city,
        specialization: fromTech?.specialization || fromUsername?.specialization || current.specialization,
        expertise: fromTech?.expertise || fromUsername?.expertise || current.expertise,
        skill_score: fromTech?.skill_score ?? fromUsername?.skill_score ?? current.skill_score,
        total_jobs_completed: fromTech?.total_jobs_completed ?? fromUsername?.total_jobs_completed ?? current.total_jobs_completed,
        total_years_experience: fromTech?.total_years_experience ?? fromUsername?.total_years_experience ?? current.total_years_experience,
        date_joined: fromTech?.date_joined || fromUsername?.date_joined || current.date_joined,
        performance_rating: fromTech?.performance_rating ?? fromUsername?.performance_rating ?? current.performance_rating,
        assigned_tickets_count: fromTech?.assigned_tickets_count ?? fromUsername?.assigned_tickets_count ?? current.assigned_tickets_count,
      };
      setUser(merged);
      localStorage.setItem('cummins_user', JSON.stringify(merged));
    } catch {
      /* keep existing user */
    }
  }, []);

  const isRole = (...roles: UserRole[]) => {
    return user ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, fetchProfile, isRole }}>
      {children}
    </AuthContext.Provider>
  );
};

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { useAuth };
