import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './lib/auth.jsx';
import { connectSocket } from './lib/socket.js';
import { Header, Footer, Spinner, CrisisBanner } from './components/common.jsx';
import DemoBar from './components/DemoBar.jsx';
import AppHeader from './components/AppHeader.jsx';
import BottomTabs from './components/BottomTabs.jsx';

const DEMO = import.meta.env.VITE_DEMO === '1';

import Home from './pages/Home.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import Pricing from './pages/Pricing.jsx';
import Faq from './pages/Faq.jsx';
import Reviews from './pages/Reviews.jsx';
import Crisis from './pages/Crisis.jsx';
import TherapistDirectory from './pages/TherapistDirectory.jsx';
import TherapistProfile from './pages/TherapistProfile.jsx';
import GetStarted from './pages/GetStarted.jsx';
import Login from './pages/Login.jsx';
import Join from './pages/Join.jsx';
import ApplyTherapist from './pages/ApplyTherapist.jsx';
import Admin from './pages/admin/Admin.jsx';

import AppLayout from './pages/app/AppLayout.jsx';
import Dashboard from './pages/app/Dashboard.jsx';
import Room from './pages/app/Room.jsx';
import Sessions from './pages/app/Sessions.jsx';
import LiveSession from './pages/app/LiveSession.jsx';
import Journal from './pages/app/Journal.jsx';
import Worksheets from './pages/app/Worksheets.jsx';
import Groupinars from './pages/app/Groupinars.jsx';
import Billing from './pages/app/Billing.jsx';
import Account from './pages/app/Account.jsx';
import SwitchTherapist from './pages/app/SwitchTherapist.jsx';
import Notifications from './pages/app/Notifications.jsx';
import More from './pages/app/More.jsx';
import Assessment from './pages/app/Assessment.jsx';

import ProviderLayout from './pages/provider/ProviderLayout.jsx';
import ProviderDashboard from './pages/provider/ProviderDashboard.jsx';
import ProviderAvailability from './pages/provider/ProviderAvailability.jsx';
import ProviderClient from './pages/provider/ProviderClient.jsx';
import ProviderProfile from './pages/provider/ProviderProfile.jsx';
import ProviderSessions from './pages/provider/ProviderSessions.jsx';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'therapist' ? '/provider' : '/app'} replace />;
  return children;
}

// The demo is an app demo: opening it drops you inside the product, not on the
// marketing site (which stays reachable from the account menu).
function DemoEntry() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!DEMO || loading || !user) return;
    if (loc.pathname === '/' && !sessionStorage.getItem('mb_demo_entered')) {
      sessionStorage.setItem('mb_demo_entered', '1');
      nav(user.role === 'therapist' ? '/provider' : '/app', { replace: true });
    }
  }, [loading, user, loc.pathname, nav]);
  return null;
}

export default function App() {
  const { user } = useAuth();
  const loc = useLocation();
  useEffect(() => { if (user) connectSocket(); }, [user]);
  const inProvider = loc.pathname.startsWith('/provider');
  const inAdmin = loc.pathname.startsWith('/admin');
  const inApp = loc.pathname.startsWith('/app') || inProvider || inAdmin;

  return (
    <>
      <ScrollTop />
      {DEMO && <DemoEntry />}
      {inApp ? <AppHeader variant={inAdmin ? 'admin' : inProvider ? 'provider' : 'client'} /> : <Header />}
      {DEMO && <DemoBar />}
      {!inApp && <CrisisBanner />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/crisis" element={<Crisis />} />
        <Route path="/therapists" element={<TherapistDirectory />} />
        <Route path="/therapists/:id" element={<TherapistProfile />} />
        <Route path="/join" element={<Join />} />
        <Route path="/apply" element={<ApplyTherapist />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/login" element={<Login />} />

        <Route path="/app" element={<Protected role="client"><AppLayout /></Protected>}>
          <Route index element={<Dashboard />} />
          <Route path="room" element={<Room />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="sessions/:id/live" element={<LiveSession />} />
          <Route path="journal" element={<Journal />} />
          <Route path="worksheets" element={<Worksheets />} />
          <Route path="groupinars" element={<Groupinars />} />
          <Route path="billing" element={<Billing />} />
          <Route path="account" element={<Account />} />
          <Route path="switch-therapist" element={<SwitchTherapist />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="more" element={<More />} />
          <Route path="assessment" element={<Assessment />} />
        </Route>

        <Route path="/provider" element={<Protected role="therapist"><ProviderLayout /></Protected>}>
          <Route index element={<ProviderDashboard />} />
          <Route path="room/:roomId" element={<Room provider />} />
          <Route path="clients/:id" element={<ProviderClient />} />
          <Route path="availability" element={<ProviderAvailability />} />
          <Route path="sessions" element={<ProviderSessions />} />
          <Route path="sessions/:id/live" element={<LiveSession />} />
          <Route path="profile" element={<ProviderProfile />} />
        </Route>

        <Route path="/admin" element={<Protected role="admin"><Admin /></Protected>} />

        <Route path="*" element={<div className="container section center"><h1>404</h1><p>Η σελίδα δεν βρέθηκε.</p></div>} />
      </Routes>
      {inApp && !inAdmin && <BottomTabs provider={inProvider} />}
      {!inApp && <Footer />}
    </>
  );
}
