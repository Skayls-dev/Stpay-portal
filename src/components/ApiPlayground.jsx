import React from 'react';
import TestSDK from './TestSDK';
import { apiClient } from '../api';

const ApiPlayground = () => {
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState({
    health: 'unknown',
    ready: 'unknown',
    live: 'unknown',
    metrics: 'unknown',
    lastChecked: null,
  });

  const refreshStatus = React.useCallback(async () => {
    setLoading(true);

    const checks = await Promise.allSettled([
      apiClient.getOperationalHealth(),
      apiClient.getReadinessHealth(),
      apiClient.getLivenessHealth(),
      apiClient.getPrometheusMetricsSample(),
    ]);

    setStatus({
      health: checks[0].status === 'fulfilled' ? 'up' : 'down',
      ready: checks[1].status === 'fulfilled' ? 'up' : 'down',
      live: checks[2].status === 'fulfilled' ? 'up' : 'down',
      metrics: checks[3].status === 'fulfilled' ? 'up' : 'down',
      lastChecked: new Date().toLocaleTimeString(),
    });

    setLoading(false);
  }, []);

  React.useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return (
    <div className="container">
      <div className="page-header">
        <h1>API Playground</h1>
        <p>
          Testez manuellement les endpoints ST Pay depuis l'interface frontend.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-6)' }}>
        <div className="card-header">
          <h2>🩺 Observability Quick Check</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={refreshStatus}
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Refresh'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap', marginBottom: 'var(--spacing-4)' }}>
          <StatusBadge label="/health" state={status.health} />
          <StatusBadge label="/health/ready" state={status.ready} />
          <StatusBadge label="/health/live" state={status.live} />
          <StatusBadge label="/metrics" state={status.metrics} />
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
          <a href="http://localhost:5169/health" target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            Open /health
          </a>
          <a href="http://localhost:5169/metrics" target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            Open /metrics
          </a>
        </div>

        <p style={{ marginTop: 'var(--spacing-3)', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
          Last checked: {status.lastChecked || 'never'}
        </p>
      </div>

      <TestSDK />
    </div>
  );
};

const StatusBadge = ({ label, state }) => {
  const palette = {
    up: {
      bg: 'var(--success-100)',
      fg: 'var(--success-700)',
      border: 'var(--success-200)',
      dot: 'var(--success-500)',
    },
    down: {
      bg: 'var(--error-100)',
      fg: 'var(--error-700)',
      border: 'var(--error-200)',
      dot: 'var(--error-500)',
    },
    unknown: {
      bg: 'var(--gray-100)',
      fg: 'var(--gray-700)',
      border: 'var(--gray-300)',
      dot: 'var(--gray-500)',
    },
  };

  const colors = palette[state] || palette.unknown;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px',
        borderRadius: '999px',
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        color: colors.fg,
        fontSize: '0.8rem',
        fontWeight: 600,
      }}
    >
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.dot }} />
      {label}: {state.toUpperCase()}
    </span>
  );
};

export default ApiPlayground;
