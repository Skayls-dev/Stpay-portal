import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import DashboardLayout from './components/layout/DashboardLayout';
import RequireAuth from './components/auth/RequireAuth';
import RequirePermission from './components/auth/RequirePermission';
import { useAuth } from './hooks/useAuth';

import Login from './pages/Login';
import MerchantRegister from './pages/MerchantRegister';
import Overview from './pages/Overview';
import Transactions from './pages/Transactions';
import MerchantsList from './pages/MerchantsList';
import Webhooks from './pages/Webhooks';
import Analytics from './pages/Analytics';
import ProvidersHealth from './pages/ProvidersHealth';
import Escrow from './pages/Escrow';
import Settlements from './pages/Settlements';
import Traceability from './pages/Traceability';
import MerchantProfile from './pages/MerchantProfile';
import AcceptInvite from './pages/AcceptInvite';
import PayoutAccounts from './pages/PayoutAccounts';
import PortalSelect from './pages/PortalSelect';
import LandingPage from './pages/LandingPage';
const DeveloperPortal  = React.lazy(() => import('./pages/DeveloperPortal'));
const PaymentSimulator = React.lazy(() => import('./pages/PaymentSimulator'));
const WebshopPublicDemo = React.lazy(() => import('./pages/WebshopPublicDemo'));
const IntegrationGuides = React.lazy(() => import('./pages/IntegrationGuides'));
const GuideVideos       = React.lazy(() => import('./pages/GuideVideos'));
import AdminConfig from './pages/AdminConfig'
import KriAlerts from './pages/KriAlerts';
import Compliance from './pages/Compliance';

function HomeRedirect() {
  const { isAuthenticated, isSuperAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <Navigate to={isSuperAdmin ? '/admin' : '/merchant'} replace />;
}

function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (user.role !== role) {
    return <Navigate to={user.role === 'super_admin' ? '/admin' : '/merchant'} replace />;
  }
  return children;
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#FFFFFF',
            color: '#1A1A1A',
            border: '1px solid #E2E0D8',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '600',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          },
          success: { iconTheme: { primary: '#1A7A40', secondary: '#E8F7EE' } },
          error:   { iconTheme: { primary: '#C02020', secondary: '#FEE8E8' } },
        }}
      />
      <React.Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '13px' }}>Chargement...</div>}>
      <Routes>
        <Route path="/login"          element={<Navigate to="/choose-portal" replace />} />
        <Route path="/choose-portal"  element={<PortalSelect />} />
        <Route path="/merchant/login" element={<Login portal="merchant" />} />
        <Route path="/admin/login"    element={<Login portal="admin" />} />
        <Route path="/register"       element={<MerchantRegister />} />
        <Route path="/accept-invite"   element={<AcceptInvite />} />
        <Route path="/merchant/psi" element={<Navigate to="/merchant" replace />} />
        <Route path="/demo/webshop"   element={<WebshopPublicDemo />} />
        <Route path="/" element={<LandingPage />} />

        <Route path="/admin" element={<RequireAuth><RequireRole role="super_admin"><DashboardLayout /></RequireRole></RequireAuth>}>
          <Route index element={<Overview />} />
          <Route path="transactions" element={<RequirePermission permission={['transactions.view_own','transactions.view_all']}><Transactions /></RequirePermission>} />
          <Route path="merchants"    element={<RequirePermission permission="merchants.view_all"><MerchantsList /></RequirePermission>} />
          <Route path="webhooks"     element={<RequirePermission permission={['webhooks.view_own','webhooks.view_all']}><Webhooks /></RequirePermission>} />
          <Route path="analytics"    element={<RequirePermission permission={['analytics.view_own','analytics.view_all']}><Analytics /></RequirePermission>} />
          <Route path="providers"    element={<RequirePermission permission="providers.view_health"><ProvidersHealth /></RequirePermission>} />
          <Route path="escrow"       element={<RequirePermission permission={['escrow.view_own','escrow.release_manual']}><Escrow /></RequirePermission>} />
          <Route path="settlements"  element={<RequirePermission permission={['settlements.view_all','settlements.view_own']}><Settlements /></RequirePermission>} />
          <Route path="traceability" element={<RequirePermission permission="settlements.view_all"><Traceability /></RequirePermission>} />
          <Route path="config"       element={<RequirePermission permission="fees.configure"><AdminConfig /></RequirePermission>} />
          <Route path="kri"          element={<KriAlerts />} />
          <Route path="compliance"   element={<Compliance />} />
          <Route path="guide-videos" element={<GuideVideos />} />
        </Route>

        <Route path="/merchant" element={<RequireAuth><RequireRole role="merchant"><DashboardLayout /></RequireRole></RequireAuth>}>
          <Route index element={<Overview />} />
          <Route path="transactions" element={<RequirePermission permission={['transactions.view_own','transactions.view_all']}><Transactions /></RequirePermission>} />
          <Route path="webhooks"     element={<RequirePermission permission={['webhooks.view_own','webhooks.view_all']}><Webhooks /></RequirePermission>} />
          <Route path="analytics"    element={<RequirePermission permission={['analytics.view_own','analytics.view_all']}><Analytics /></RequirePermission>} />
          <Route path="providers"    element={<RequirePermission permission="providers.view_health"><ProvidersHealth /></RequirePermission>} />
          <Route path="escrow"       element={<RequirePermission permission={['escrow.view_own','escrow.release_manual']}><Escrow /></RequirePermission>} />
          <Route path="settlements"  element={<RequirePermission permission={['settlements.view_all','settlements.view_own']}><Settlements /></RequirePermission>} />
          <Route path="profile"      element={<RequirePermission permission="merchants.view_own"><MerchantProfile /></RequirePermission>} />
          <Route path="payout-accounts" element={<RequirePermission permission="merchants.view_own"><PayoutAccounts /></RequirePermission>} />
          <Route path="developer"    element={<RequirePermission permission="merchants.view_own_keys"><DeveloperPortal /></RequirePermission>} />
          <Route path="simulator"    element={<RequirePermission permission="merchants.view_own_keys"><PaymentSimulator /></RequirePermission>} />
          <Route path="guides"       element={<RequirePermission permission="merchants.view_own_keys"><IntegrationGuides /></RequirePermission>} />

        </Route>

        <Route path="*" element={<HomeRedirect />} />
      </Routes>
      </React.Suspense>
    </Router>
  );
}

export default App;
