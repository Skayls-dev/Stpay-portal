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
import Merchants from './pages/Merchants';
import Webhooks from './pages/Webhooks';
import Analytics from './pages/Analytics';
import ProvidersHealth from './pages/ProvidersHealth';
import Escrow from './pages/Escrow';
import MerchantProfile from './pages/MerchantProfile';
import PortalSelect from './pages/PortalSelect';

function HomeRedirect() {
  const { isAuthenticated, isSuperAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/choose-portal" replace />;
  }

  return <Navigate to={isSuperAdmin ? '/admin' : '/merchant'} replace />;
}

function RequireRole({ role, children }) {
  const { user } = useAuth();

  if (user.role !== role) {
    const fallback = user.role === 'super_admin' ? '/admin' : '/merchant';
    return <Navigate to={fallback} replace />;
  }

  return children;
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {/* ── Dark-themed toasts ── */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1A1D27',
            color: '#F0F1F5',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '500',
            fontFamily: "'DM Sans', sans-serif",
          },
          success: { iconTheme: { primary: '#22C55E', secondary: '#1A1D27' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#1A1D27' } },
        }}
      />

      <Routes>
        {/* ── Public ── */}
        <Route path="/login"         element={<Navigate to="/choose-portal" replace />} />
        <Route path="/choose-portal" element={<PortalSelect />} />
        <Route path="/merchant/login" element={<Login portal="merchant" />} />
        <Route path="/admin/login"    element={<Login portal="admin" />} />
        <Route path="/register"       element={<MerchantRegister />} />

        {/* ── Root ── */}
        <Route path="/" element={<HomeRedirect />} />

        {/* ── Admin area ── */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireRole role="super_admin">
                <DashboardLayout />
              </RequireRole>
            </RequireAuth>
          }
        >
          <Route index element={<Overview />} />
          <Route
            path="transactions"
            element={
              <RequirePermission permission={['transactions.view_own', 'transactions.view_all']}>
                <Transactions />
              </RequirePermission>
            }
          />
          <Route
            path="merchants"
            element={
              <RequirePermission permission="merchants.view_all">
                <Merchants />
              </RequirePermission>
            }
          />
          <Route
            path="webhooks"
            element={
              <RequirePermission permission={['webhooks.view_own', 'webhooks.view_all']}>
                <Webhooks />
              </RequirePermission>
            }
          />
          <Route
            path="analytics"
            element={
              <RequirePermission permission={['analytics.view_own', 'analytics.view_all']}>
                <Analytics />
              </RequirePermission>
            }
          />
          <Route
            path="providers"
            element={
              <RequirePermission permission="providers.view_health">
                <ProvidersHealth />
              </RequirePermission>
            }
          />
          <Route
            path="escrow"
            element={
              <RequirePermission permission={['escrow.view_own', 'escrow.release_manual']}>
                <Escrow />
              </RequirePermission>
            }
          />
          <Route
            path="profile"
            element={
              <RequirePermission permission="merchants.view_own">
                <MerchantProfile />
              </RequirePermission>
            }
          />
        </Route>

        {/* ── Merchant area ── */}
        <Route
          path="/merchant"
          element={
            <RequireAuth>
              <RequireRole role="merchant">
                <DashboardLayout />
              </RequireRole>
            </RequireAuth>
          }
        >
          <Route index element={<Overview />} />
          <Route
            path="transactions"
            element={
              <RequirePermission permission={['transactions.view_own', 'transactions.view_all']}>
                <Transactions />
              </RequirePermission>
            }
          />
          <Route
            path="webhooks"
            element={
              <RequirePermission permission={['webhooks.view_own', 'webhooks.view_all']}>
                <Webhooks />
              </RequirePermission>
            }
          />
          <Route
            path="analytics"
            element={
              <RequirePermission permission={['analytics.view_own', 'analytics.view_all']}>
                <Analytics />
              </RequirePermission>
            }
          />
          <Route
            path="providers"
            element={
              <RequirePermission permission="providers.view_health">
                <ProvidersHealth />
              </RequirePermission>
            }
          />
          <Route
            path="escrow"
            element={
              <RequirePermission permission={['escrow.view_own', 'escrow.release_manual']}>
                <Escrow />
              </RequirePermission>
            }
          />
          <Route
            path="profile"
            element={
              <RequirePermission permission="merchants.view_own">
                <MerchantProfile />
              </RequirePermission>
            }
          />
        </Route>

        {/* ── Catch-all ── */}
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Router>
  );
}

export default App;
