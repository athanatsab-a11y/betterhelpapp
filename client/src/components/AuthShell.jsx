import { Link } from 'react-router-dom';

// Entry screens of the installed app: no marketing navigation, just the brand,
// the task at hand, and the safety information that must always be reachable.
export default function AuthShell({ children, wide = false }) {
  return (
    <div className="auth-shell">
      <div className={`auth-card ${wide ? 'wide' : ''}`}>
        <Link to="/" className="logo auth-logo"><span className="logo-mark">MB</span> MindBridge</Link>
        {children}
      </div>
      <p className="auth-foot small">
        Σε επείγον περιστατικό κάλεσε <b>112</b> ή τη Γραμμή Παρέμβασης για την Αυτοκτονία <b>1018</b> (24/7).
        <br />
        <Link to="/how-it-works">Πώς λειτουργεί</Link> · <Link to="/therapists">Θεραπευτές</Link> · <Link to="/pricing">Κόστος</Link>
      </p>
    </div>
  );
}
