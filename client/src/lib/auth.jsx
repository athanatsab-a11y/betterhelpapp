import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, match: null, subscription: null, therapist: null, unread: 0 });

  const refresh = useCallback(async () => {
    try {
      const d = await api.get('/auth/me');
      setState({
        loading: false, user: d.user, match: d.match ?? null,
        subscription: d.subscription ?? null, therapist: d.therapist ?? null,
        unread: d.unread_notifications ?? 0,
      });
      return d;
    } catch {
      setState({ loading: false, user: null, match: null, subscription: null, therapist: null, unread: 0 });
      return null;
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => { await api.post('/auth/login', { email, password }); return refresh(); };
  const register = async (payload) => { const r = await api.post('/auth/register', payload); await refresh(); return r; };
  const logout = async () => { await api.post('/auth/logout'); await refresh(); };

  return <AuthCtx.Provider value={{ ...state, refresh, login, register, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
