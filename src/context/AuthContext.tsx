import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/services/authApi';

export type UserRole = 'admin' | 'office_staff' | 'engine_technician' | 'electrical_technician' | 'tech' | 'technician' | 'customer';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  token: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('cummins_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // Ensure token is available for Axios interceptor
        if (parsed.token) {
          localStorage.setItem('access', parsed.token);
        }
      } catch {
        localStorage.removeItem('cummins_user');
        localStorage.removeItem('access');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const userData = await authApi.login(username, password);
    setUser(userData);
    localStorage.setItem('cummins_user', JSON.stringify(userData));
    // Store token separately so the Axios interceptor can use it
    if (userData.token) {
      localStorage.setItem('access', userData.token);
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    localStorage.removeItem('cummins_user');
    localStorage.removeItem('access');
  };

  const isRole = (...roles: UserRole[]) => {
    return user ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
