import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Token, User } from '@/types';
import { AuthContext, type AuthContextType } from './authContextDef';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (currentToken: string): Promise<User | null> => {
    try {
      const response = await api.get<User>('/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      setUser(response.data);
      return response.data;
    } catch {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        await fetchCurrentUser(storedToken);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await api.post<Token>('/auth/login', { email, password });
    const newToken = response.data.access_token;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    const currentUser = await fetchCurrentUser(newToken);
    if (!currentUser) {
      throw new Error('فشل جلب بيانات المستخدم بعد تسجيل الدخول');
    }
    return currentUser;
  };

  const register = async (name: string, email: string, password: string): Promise<User> => {
    const response = await api.post<Token>('/auth/register', { name, email, password });
    const newToken = response.data.access_token;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    const currentUser = await fetchCurrentUser(newToken);
    if (!currentUser) {
      throw new Error('فشل جلب بيانات المستخدم بعد التسجيل');
    }
    return currentUser;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) return null;
    return await fetchCurrentUser(currentToken);
  };

  const value: AuthContextType = {
    user,
    role: user?.role ?? null,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
