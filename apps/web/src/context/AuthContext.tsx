import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/axios';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('ag_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('ag_access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        if (data.success) {
          setUser(data.data);
          localStorage.setItem('ag_user', JSON.stringify(data.data));
        }
      } catch (err) {
        localStorage.removeItem('ag_access_token');
        localStorage.removeItem('ag_refresh_token');
        localStorage.removeItem('ag_user');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.success && data.data) {
      localStorage.setItem('ag_access_token', data.data.tokens.accessToken);
      localStorage.setItem('ag_refresh_token', data.data.tokens.refreshToken);
      localStorage.setItem('ag_user', JSON.stringify(data.data.user));
      setUser(data.data.user);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    if (data.success && data.data) {
      localStorage.setItem('ag_access_token', data.data.tokens.accessToken);
      localStorage.setItem('ag_refresh_token', data.data.tokens.refreshToken);
      localStorage.setItem('ag_user', JSON.stringify(data.data.user));
      setUser(data.data.user);
    }
  };

  const demoLogin = async () => {
    await login('demo@apiguardian.dev', 'Demo12345!');
  };

  const logout = () => {
    localStorage.removeItem('ag_access_token');
    localStorage.removeItem('ag_refresh_token');
    localStorage.removeItem('ag_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        demoLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
