'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api
        .get('/api/v1/auth/me')
        .then((res) => {
          setUser(res.data.user);
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken && originalRequest.url !== '/api/v1/auth/refresh') {
            originalRequest._retry = true;
            try {
              const res = await api.post('/api/v1/auth/refresh', { refreshToken });
              localStorage.setItem('accessToken', res.data.tokens.accessToken);
              localStorage.setItem('refreshToken', res.data.tokens.refreshToken);
              originalRequest.headers.Authorization = `Bearer ${res.data.tokens.accessToken}`;
              return api(originalRequest);
            } catch {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              setUser(null);
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/api/v1/auth/login', { email, password });
    localStorage.setItem('accessToken', res.data.tokens.accessToken);
    localStorage.setItem('refreshToken', res.data.tokens.refreshToken);
    setUser(res.data.user);
  };

  const register = async (data: RegisterData) => {
    const res = await api.post('/api/v1/auth/register', data);
    localStorage.setItem('accessToken', res.data.tokens.accessToken);
    localStorage.setItem('refreshToken', res.data.tokens.refreshToken);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}