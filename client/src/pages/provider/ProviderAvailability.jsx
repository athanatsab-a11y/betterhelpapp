import { useEffect, useState } from 'react';
import { api, dt } from '../../lib/api.js';
import { Spinner, modalityLabel } from '../../components/common.jsx';

export default function ProviderAvailability() {
  const [slots, setSlots] = useState(null);
  const [form, setForm] = useState({ starts_at: '', duration_min: 45, modality: 'video' });
  const [msg, setMsg] = useState('');

  const load = () => api.get('/provider/availability').then((d) => setSlots(d.slots)).catch(() => setSlots([]));
  useEffect(load, []);

  const add = async (e) => {
    e.preventDefault(); setMsg('');
    try { await api.post('/provider/availability', form); setForm({ ...form, starts_at: '' }); load(); }
    catch (err) { setMsg(err.message); }
  };

  const remove = async (id) => { await api.del(`/provider/availability/${id}`); load(); };

  if (!slots) return <Spinner />;

  return (
    <div className="stack">
      <h1>Διαθεσιμότητα</h1>
      <form className="card row" onSubmit={add} style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: '2 1 220px' }}>
          <label htmlFor="st">Ημερομηνία & ώρα</label>
          <input id="st" type="datetime-local" required value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
        </div>
        <div className="field" style={{ flex: '1 1 120px' }}>
          <label htmlFor="du">Διάρκεια (λεπτά)</label>
          <input id="du" type="number" min="15" step="15" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })} />
        </div>
        <div className="field" style={{ flex: '1 1 160px' }}>
          <label htmlFor="mo">Τρόπος</label>
          <select id="mo" value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })}>
            <option value="video">Βιντεοκλήση</option>
            <option value="phone">Τηλέφωνο</option>
            <option value="live_chat">Live chat</option>
          </select>
        </div>
        <button className="btn">Προσθήκη</button>
      </form>
      {msg && <p className="error">{msg}</p>}

      <div className="card stack">
        <h3>Επερχόμενα slots ({slots.length})</h3>
        <table className="table">
          <thead><tr><th>Ώρα</th><th>Διάρκεια</th><th>Τρόπος</th><th>Κατάσταση</th><th /></tr></thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.id}>
                <td>{dt(s.starts_at)}</td>
                <td>{s.duration_min}′</td>
                <td>{modalityLabel(s.modality)}</td>
                <td>{s.booked ? <span className="pill warn">Κλεισμένο</span> : <span className="pill ok">Ελεύθερο</span>}</td>
                <td>{!s.booked && <button className="btn small ghost" onClick={() => remove(s.id)}>Διαγραφή</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
