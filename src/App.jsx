import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PaymentForm from './components/PaymentForm';
import PaymentStatus from './components/PaymentStatus';
import PaymentList from './components/PaymentList';
import Dashboard from './components/Dashboard';
import ApiStatus from './components/ApiStatus';
import TestSDK from './components/TestSDK';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Toaster 
          position="top-right" 
          toastOptions={{
            duration: 4000,
            style: {
              background: 'white',
              color: '#374151',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: 'white',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: 'white',
              },
            },
          }}
        />
        
        <ApiStatus />
        <Navigation />

        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/process" element={<PaymentForm />} />
            <Route path="/status" element={<PaymentStatus />} />
            <Route path="/payments" element={<PaymentList />} />
          </Routes>
        </main>

        <footer className="footer">
          <div className="container">
            <p>&copy; 2025 ST Pay Gateway. Powered by modern technology.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

function Navigation() {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;
  
  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="logo">
          ST Pay Gateway
        </Link>
        <div className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            🏠 Dashboard
          </Link>
          <Link 
            to="/process" 
            className={`nav-link ${isActive('/process') ? 'active' : ''}`}
          >
            💳 Process Payment
          </Link>
          <Link 
            to="/status" 
            className={`nav-link ${isActive('/status') ? 'active' : ''}`}
          >
            📊 Check Status
          </Link>
          <Link 
            to="/payments" 
            className={`nav-link ${isActive('/payments') ? 'active' : ''}`}
          >
            📋 Payment History
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default App;
