import React from 'react';
import { Link } from 'react-router-dom';
import { apiClient, usePaymentHistory } from '../api';

const Dashboard = () => {
  const { payments, isLoading } = usePaymentHistory();
  const [obsLoading, setObsLoading] = React.useState(true);
  const [obsStatus, setObsStatus] = React.useState({
    health: 'unknown',
    ready: 'unknown',
    live: 'unknown',
    metrics: 'unknown',
    lastChecked: null,
  });

  const checkObservability = React.useCallback(async () => {
    setObsLoading(true);

    const checks = await Promise.allSettled([
      apiClient.getOperationalHealth(),
      apiClient.getReadinessHealth(),
      apiClient.getLivenessHealth(),
      apiClient.getPrometheusMetricsSample(),
    ]);

    setObsStatus({
      health: checks[0].status === 'fulfilled' ? 'up' : 'down',
      ready: checks[1].status === 'fulfilled' ? 'up' : 'down',
      live: checks[2].status === 'fulfilled' ? 'up' : 'down',
      metrics: checks[3].status === 'fulfilled' ? 'up' : 'down',
      lastChecked: new Date().toLocaleTimeString(),
    });

    setObsLoading(false);
  }, []);

  React.useEffect(() => {
    checkObservability();
  }, [checkObservability]);

  // Calcul des statistiques
  const stats = React.useMemo(() => {
    if (!payments.length) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        failed: 0,
        totalAmount: 0
      };
    }

    return payments.reduce((acc, payment) => {
      acc.total += 1;
      const status = payment.status.toLowerCase();
      
      if (['completed', 'success', 'successful'].includes(status)) {
        acc.completed += 1;
        acc.totalAmount += payment.amount;
      } else if (['pending', 'processing', 'initiated'].includes(status)) {
        acc.pending += 1;
      } else if (['failed', 'error', 'rejected'].includes(status)) {
        acc.failed += 1;
      }
      
      return acc;
    }, {
      total: 0,
      completed: 0,
      pending: 0,
      failed: 0,
      totalAmount: 0
    });
  }, [payments]);

  const recentPayments = payments.slice(0, 5);

  return (
    <div className="container">
      {/* Hero Section */}
      <div className="page-header">
        <h1>Welcome to ST Pay Gateway</h1>
        <p>
          Votre solution de paiement moderne et sécurisée. 
          Traitez vos paiements avec MTN, Orange, Moov et Wave en toute simplicité.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="feature-grid">
        <div className="feature-card">
          <span className="icon">💳</span>
          <h3>Process Payment</h3>
          <p>Initiez un nouveau paiement en quelques clics avec nos fournisseurs partenaires.</p>
          <Link to="/process" className="btn btn-primary btn-lg" style={{ marginTop: 'var(--spacing-4)' }}>
            Start Payment
          </Link>
        </div>
        
        <div className="feature-card">
          <span className="icon">📊</span>
          <h3>Check Status</h3>
          <p>Vérifiez le statut de vos paiements en temps réel avec notre système de suivi.</p>
          <Link to="/status" className="btn btn-secondary btn-lg" style={{ marginTop: 'var(--spacing-4)' }}>
            Check Status
          </Link>
        </div>
        
        <div className="feature-card">
          <span className="icon">📋</span>
          <h3>Payment History</h3>
          <p>Consultez l'historique complet de tous vos paiements et transactions.</p>
          <Link to="/payments" className="btn btn-secondary btn-lg" style={{ marginTop: 'var(--spacing-4)' }}>
            View History
          </Link>
        </div>
        
        <div className="feature-card">
          <span className="icon">🎪</span>
          <h3>Event Management</h3>
          <p>Gérez vos événements, les réservations et les paiements de billets.</p>
          <Link to="/events" className="btn btn-secondary btn-lg" style={{ marginTop: 'var(--spacing-4)' }}>
            Manage Events
          </Link>
        </div>

        <div className="feature-card">
          <span className="icon">🧪</span>
          <h3>API Playground</h3>
          <p>Testez rapidement les endpoints ST Pay et inspectez les réponses.</p>
          <Link to="/api-playground" className="btn btn-secondary btn-lg" style={{ marginTop: 'var(--spacing-4)' }}>
            Open Playground
          </Link>
        </div>

        <div className="feature-card">
          <span className="icon">📱</span>
          <h3>Mobile Payment Simulator</h3>
          <p>Simulez en temps réel une expérience de paiement mobile complète.</p>
          <Link to="/simulator" className="btn btn-secondary btn-lg" style={{ marginTop: 'var(--spacing-4)' }}>
            Simulate Payment
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="card">
        <div className="card-header">
          <h2>📈 Statistics</h2>
          {!isLoading && (
            <span className="text-sm text-gray-500">
              Données en temps réel
            </span>
          )}
        </div>
        
        {isLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            Chargement des statistiques...
          </div>
        ) : (
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Total Payments</span>
            </div>
            <div className="stat-card">
              <span className="stat-number" style={{ color: 'var(--success-600)' }}>
                {stats.completed}
              </span>
              <span className="stat-label">Completed</span>
            </div>
            <div className="stat-card">
              <span className="stat-number" style={{ color: 'var(--warning-600)' }}>
                {stats.pending}
              </span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-card">
              <span className="stat-number" style={{ color: 'var(--error-600)' }}>
                {stats.failed}
              </span>
              <span className="stat-label">Failed</span>
            </div>
            <div className="stat-card">
              <span className="stat-number" style={{ color: 'var(--primary-600)' }}>
                {stats.totalAmount.toLocaleString()}
              </span>
              <span className="stat-label">XOF Processed</span>
            </div>
          </div>
        )}
      </div>

      {/* Observability */}
      <div className="card">
        <div className="card-header">
          <h2>🩺 Observability</h2>
          <button
            type="button"
            onClick={checkObservability}
            className="btn btn-secondary btn-sm"
            disabled={obsLoading}
          >
            {obsLoading ? 'Checking...' : 'Refresh'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap', marginBottom: 'var(--spacing-5)' }}>
          <StatusBadge label="/health" status={obsStatus.health} />
          <StatusBadge label="/health/ready" status={obsStatus.ready} />
          <StatusBadge label="/health/live" status={obsStatus.live} />
          <StatusBadge label="/metrics" status={obsStatus.metrics} />
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
          <Link to="/api-playground" className="btn btn-primary btn-sm">
            Open API Playground
          </Link>
          <a href="http://localhost:5169/health" target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            Open /health
          </a>
          <a href="http://localhost:5169/metrics" target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            Open /metrics
          </a>
        </div>

        <p style={{ marginTop: 'var(--spacing-4)', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
          Last checked: {obsStatus.lastChecked || 'never'}
        </p>
      </div>

      {/* Recent Payments */}
      <div className="card">
        <div className="card-header">
          <h2>🕒 Recent Payments</h2>
          <Link to="/payments" className="btn btn-secondary btn-sm">
            View All
          </Link>
        </div>
        
        {isLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            Chargement des paiements récents...
          </div>
        ) : recentPayments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: 'var(--spacing-4)' }}>
              💳
            </span>
            <h3 style={{ color: 'var(--gray-600)', marginBottom: 'var(--spacing-2)' }}>
              Aucun paiement pour le moment
            </h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 'var(--spacing-6)' }}>
              Commencez par traiter votre premier paiement
            </p>
            <Link to="/process" className="btn btn-primary">
              Process First Payment
            </Link>
          </div>
        ) : (
          <div className="recent-payments">
            {recentPayments.map((payment) => (
              <RecentPaymentCard key={payment.transactionId} payment={payment} />
            ))}
          </div>
        )}
      </div>

      {/* Support Section */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary-50), var(--primary-100))' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--primary-800)', marginBottom: 'var(--spacing-4)' }}>
            🎯 Need Help?
          </h2>
          <p style={{ color: 'var(--primary-700)', marginBottom: 'var(--spacing-6)', fontSize: '1.125rem' }}>
            Notre équipe est là pour vous accompagner dans l'intégration et l'utilisation de ST Pay.
          </p>
          <div style={{ display: 'flex', gap: 'var(--spacing-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a 
              href="mailto:support@stpay.com" 
              className="btn btn-primary"
              style={{ textDecoration: 'none' }}
            >
              📧 Contact Support
            </a>
            <a 
              href="/docs" 
              className="btn btn-secondary"
              style={{ textDecoration: 'none' }}
            >
              📚 Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecentPaymentCard = ({ payment }) => {
  const getStatusClass = (status) => {
    const statusLower = status.toLowerCase();
    if (['completed', 'success', 'successful'].includes(statusLower)) return 'status-completed';
    if (['pending', 'processing', 'initiated'].includes(statusLower)) return 'status-pending';
    if (['failed', 'error', 'rejected'].includes(statusLower)) return 'status-failed';
    return 'status-cancelled';
  };

  const getStatusText = (status) => {
    const statusLower = status.toLowerCase();
    const statusMap = {
      'completed': 'Terminé',
      'success': 'Réussi', 
      'successful': 'Réussi',
      'pending': 'En attente',
      'processing': 'En cours',
      'failed': 'Échec',
      'error': 'Erreur',
      'cancelled': 'Annulé'
    };
    return statusMap[statusLower] || status;
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: 'var(--spacing-4)',
      borderBottom: '1px solid var(--gray-200)',
      transition: 'background-color 0.2s ease'
    }}
    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--gray-50)'}
    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
    >
      <div>
        <div style={{ 
          fontWeight: '600', 
          color: 'var(--gray-900)',
          marginBottom: 'var(--spacing-1)'
        }}>
          {payment.description || `Payment ${payment.provider}`}
        </div>
        <div style={{ 
          fontSize: '0.875rem', 
          color: 'var(--gray-500)',
          fontFamily: 'monospace'
        }}>
          {payment.transactionId}
        </div>
      </div>
      
      <div style={{ textAlign: 'right' }}>
        <div style={{ 
          fontWeight: '600', 
          color: 'var(--gray-900)',
          marginBottom: 'var(--spacing-1)'
        }}>
          {payment.amount.toLocaleString()} {payment.currency}
        </div>
        <span className={`status-badge ${getStatusClass(payment.status)}`}>
          {getStatusText(payment.status)}
        </span>
      </div>
    </div>
  );
};

const StatusBadge = ({ label, status }) => {
  const colors = {
    up: {
      background: 'var(--success-100)',
      color: 'var(--success-700)',
      border: 'var(--success-200)',
      dot: 'var(--success-500)',
    },
    down: {
      background: 'var(--error-100)',
      color: 'var(--error-700)',
      border: 'var(--error-200)',
      dot: 'var(--error-500)',
    },
    unknown: {
      background: 'var(--gray-100)',
      color: 'var(--gray-700)',
      border: 'var(--gray-300)',
      dot: 'var(--gray-500)',
    },
  };

  const current = colors[status] || colors.unknown;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px',
        borderRadius: '999px',
        border: `1px solid ${current.border}`,
        background: current.background,
        color: current.color,
        fontSize: '0.8rem',
        fontWeight: 600,
      }}
    >
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: current.dot }} />
      {label}: {status.toUpperCase()}
    </span>
  );
};

export default Dashboard;
