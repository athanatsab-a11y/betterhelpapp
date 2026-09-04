import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function Login() {
  const { login, resetPassword, supabaseEnabled } = useAuth();
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const [params] = useSearchParams();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const d = await login(form.email, form.password);
      const next = params.get('next');
      nav(next || (d?.user?.role === 'therapist' ? '/provider' : '/app'));
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <main className="container section" style={{ maxWidth: 440 }}>
      <div className="card stack">
        <h1 style={{ fontSize: '1.7rem' }}>Σύνδεση</h1>
        <form onSubmit={submit} className="stack">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="pw">Κωδικός</label>
            <input id="pw" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          {error && <p className="error">{error}</p>}
          {notice && <p className="success">{notice}</p>}
          <button className="btn block" disabled={busy}>{busy ? 'Σύνδεση…' : 'Σύνδεση'}</button>
        </form>
        {supabaseEnabled && (
          <button className="btn ghost small" type="button" onClick={async () => {
            setError(''); setNotice('');
            if (!form.email) { setError('Γράψε πρώτα το email σου'); return; }
            try {
              await resetPassword(form.email);
              setNotice('Σου στείλαμε σύνδεσμο επαναφοράς κωδικού.');
            } catch (err) { setError(err.message); }
          }}>Ξέχασα τον κωδικό μου</button>
        )}
        <p className="small muted">Δεν έχεις λογαριασμό; <Link to="/join">Ξεκίνα εδώ</Link> — ως πελάτης ή θεραπευτής.</p>
        {!supabaseEnabled && <div className="divider" />}
        {!supabaseEnabled && <p className="small muted">
          <b>Demo λογαριασμοί</b><br />
          Μέλος: demo@mindbridge.gr<br />
          Θεραπευτής: therapist1@mindbridge.gr<br />
          Διαχειριστής: admin@mindbridge.gr<br />
          Κωδικός για όλους: password123
        </p>}
      </div>
    </main>
  );
}
