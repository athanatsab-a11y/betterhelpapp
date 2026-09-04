import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import { supabase, supabaseEnabled } from './supabase.js';

const AuthCtx = createContext(null);

const EMPTY = { loading: true, user: null, match: null, subscription: null, therapist: null, assessment: null, unread: 0 };

// Supabase projects with email confirmation return no session from signUp, so
// the profile cannot be created yet. We park it here and finish the job the
// moment a session appears — after the user clicks the link in their email.
const PENDING_KEY = 'mb_pending_profile';
const readPending = () => {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); } catch { return null; }
};
const savePending = (endpoint, payload) => {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify({ endpoint, payload })); } catch { /* private mode */ }
};
const clearPending = () => { try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ } };

export function AuthProvider({ children }) {
  const [state, setState] = useState(EMPTY);

  const refresh = useCallback(async () => {
    try {
      let d = await api.get('/auth/me');

      // Signed into Supabase but the profile was never created (email
      // confirmation flow): finish the registration we parked earlier.
      if (supabaseEnabled && !d.user) {
        const pending = readPending();
        const { data } = await supabase.auth.getSession();
        if (pending && data.session) {
          try {
            await api.post(pending.endpoint, pending.payload);
            clearPending();
            d = await api.get('/auth/me');
          } catch { /* leave it parked; the next refresh retries */ }
        }
      }
      setState({
        loading: false, user: d.user, match: d.match ?? null,
        subscription: d.subscription ?? null, therapist: d.therapist ?? null,
        assessment: d.assessment ?? null, unread: d.unread_notifications ?? 0,
      });
      return d;
    } catch {
      setState({ ...EMPTY, loading: false });
      return null;
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Keep the profile in sync with Supabase sign-in/sign-out in other tabs.
  useEffect(() => {
    if (!supabaseEnabled) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const login = async (email, password) => {
    if (supabaseEnabled) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(translate(error.message));
    } else {
      await api.post('/auth/login', { email, password });
    }
    return refresh();
  };

  // Creates the Supabase account first (when configured), then the profile row
  // our API owns — role, matching, subscription all live there.
  const signUpThen = async (endpoint, payload) => {
    if (supabaseEnabled) {
      const { data, error } = await supabase.auth.signUp({ email: payload.email, password: payload.password });
      if (error) throw new Error(translate(error.message));
      if (!data.session) {
        savePending(endpoint, payload);
        return { needsEmailConfirmation: true };
      }
    }
    const result = await api.post(endpoint, payload);
    await refresh();
    return result;
  };

  const register = (payload) => signUpThen('/auth/register', payload);
  const applyAsTherapist = (payload) => signUpThen('/auth/apply-therapist', payload);

  const logout = async () => {
    if (supabaseEnabled) await supabase.auth.signOut();
    else await api.post('/auth/logout');
    await refresh();
  };

  const resetPassword = async (email) => {
    if (!supabaseEnabled) throw new Error('Η επαναφορά κωδικού απαιτεί σύνδεση με Supabase');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/login`,
    });
    if (error) throw new Error(translate(error.message));
  };

  return (
    <AuthCtx.Provider value={{ ...state, refresh, login, register, applyAsTherapist, logout, resetPassword, supabaseEnabled }}>
      {children}
    </AuthCtx.Provider>
  );
}

// Supabase returns English messages; show the common ones in Greek.
function translate(message = '') {
  const map = {
    'Invalid login credentials': 'Λάθος email ή κωδικός',
    'User already registered': 'Υπάρχει ήδη λογαριασμός με αυτό το email',
    'Email not confirmed': 'Επιβεβαίωσε πρώτα το email σου από το μήνυμα που σου στείλαμε',
    'Password should be at least 6 characters': 'Ο κωδικός είναι πολύ σύντομος',
  };
  return map[message] || message;
}

export const useAuth = () => useContext(AuthCtx);
