import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AuthUser } from '../types';
import * as api from '../api/client';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, teamName: string) => Promise<void>;
  logout: () => void;
  updateTeamName: (teamName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  useEffect(() => {
    api.setUnauthorizedHandler(logout);

    const token = api.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .fetchMe()
      .then(setUser)
      .catch(() => api.logout())
      .finally(() => setLoading(false));
  }, [logout]);

  const login = async (email: string, password: string) => {
    const { user: authUser } = await api.login(email, password);
    setUser(authUser);
  };

  const register = async (email: string, password: string, teamName: string) => {
    const { user: authUser } = await api.register({ email, password, teamName });
    setUser(authUser);
  };

  const updateTeamName = async (teamName: string) => {
    const updated = await api.updateTeamName(teamName);
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateTeamName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
