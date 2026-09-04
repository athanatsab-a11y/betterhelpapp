import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';

export default function Account() {
  const { user, refresh, logout } = useAuth();
  const [form, setForm] = useState({
    display_name: user.display_name, nickname: user.nickname || '', phone: user.phone || '',
    timezone: user.timezone || 'Europe/Athens', emergency_contact: user.emergency_contact || '',
    notify_email: !!user.notify_email, notify_sms: !!user.notify_sms,
  });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const save = async (e) => {
    e.preventDefault(); setMsg(''); setErr('');
    try { await api.patch('/auth/me', form); await refresh(); setMsg('Τα στοιχεία σου αποθηκεύτηκαν.'); }
    catch (e2) { setErr(e2.message); }
  };

  const changePw = async (e) => {
    e.preventDefault(); setMsg(''); setErr('');
    try { await api.post('/auth/password', pw); setPw({ current: '', next: '' }); setMsg('Ο κωδικός άλλαξε.'); }
    catch (e2) { setErr(e2.message); }
  };

  const del = async () => {
    if (!confirm('Θέλεις σίγουρα να διαγράψεις οριστικά τον λογαριασμό σου και όλα τα δεδομένα σου;')) return;
    await api.del('/auth/me');
    await logout();
    nav('/');
  };

  return (
    <div className="stack">
      <h1>Λογαριασμός</h1>
      {msg && <p className="success">{msg}</p>}
      {err && <p className="error">{err}</p>}

      <form className="card stack" onSubmit={save}>
        <h3>Προσωπικά στοιχεία</h3>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="dn">Όνομα</label>
            <input id="dn" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="nk">Ψευδώνυμο (εμφανίζεται στον θεραπευτή)</label>
            <input id="nk" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          </div>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="ph">Τηλέφωνο</label>
            <input id="ph" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="tz">Ζώνη ώρας</label>
            <select id="tz" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
              {['Europe/Athens', 'Europe/Berlin', 'Europe/London', 'America/New_York'].map((z) => <option key={z}>{z}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="ec">Επαφή έκτακτης ανάγκης</label>
          <input id="ec" placeholder="Όνομα και τηλέφωνο" value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
        </div>
        <div className="stack">
          <label className="row small" style={{ fontWeight: 400 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={form.notify_email} onChange={(e) => setForm({ ...form, notify_email: e.target.checked })} />
            Ειδοποιήσεις με email
          </label>
          <label className="row small" style={{ fontWeight: 400 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={form.notify_sms} onChange={(e) => setForm({ ...form, notify_sms: e.target.checked })} />
            Ειδοποιήσεις με SMS
          </label>
        </div>
        <button className="btn">Αποθήκευση</button>
      </form>

      <form className="card stack" onSubmit={changePw}>
        <h3>Αλλαγή κωδικού</h3>
        <div className="field">
          <label htmlFor="cur">Τρέχων κωδικός</label>
          <input id="cur" type="password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="nxt">Νέος κωδικός</label>
          <input id="nxt" type="password" minLength={8} required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        </div>
        <button className="btn secondary">Αλλαγή</button>
      </form>

      <div className="card stack">
        <h3>Διαγραφή λογαριασμού</h3>
        <p className="small muted">Διαγράφονται οριστικά τα μηνύματα, οι σημειώσεις και το ιστορικό σου.</p>
        <button className="btn danger" onClick={del}>Διαγραφή λογαριασμού</button>
      </div>
    </div>
  );
}
