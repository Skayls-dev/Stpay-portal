import React, { useState } from 'react';
import { usePaymentHistory, statusService } from '../api';

const PaymentList = () => {
  const { payments, isLoading, error, refresh } = usePaymentHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleRefresh = () => {
    refresh();
  };

  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (field !== sortField) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Filtrer les paiements
  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = 
      payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.amount?.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Trier les paiements
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (sortField === 'amount') {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }
    
    if (sortField === 'createdAt') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  if (isLoading) {
    return (
      <div className="card">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading payments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="error">
          <h3>❌ Error loading payments</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={handleRefresh}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="page-title" style={{ margin: 0 }}>Payment History</h2>
        <button className="btn btn-primary" onClick={handleRefresh}>
          🔄 Refresh
        </button>
      </div>

      <div className="filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="🔍 Search by transaction ID, provider, or amount..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Status</option>
            <option value="pending">⏳ Pending</option>
            <option value="completed">✅ Completed</option>
            <option value="failed">❌ Failed</option>
            <option value="cancelled">🚫 Cancelled</option>
          </select>
        </div>
      </div>

      {sortedPayments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No payments found</h3>
          <p>
            {payments?.length === 0 
              ? "You haven't made any payments yet. Create your first payment to get started!" 
              : "No payments match your search criteria. Try adjusting your filters."
            }
          </p>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-header">
            <div 
              className="table-header-cell sortable" 
              onClick={() => handleSort('transactionId')}
              style={{ flex: '2' }}
            >
              Transaction ID {getSortIcon('transactionId')}
            </div>
            <div 
              className="table-header-cell sortable" 
              onClick={() => handleSort('provider')}
              style={{ flex: '1' }}
            >
              Provider {getSortIcon('provider')}
            </div>
            <div 
              className="table-header-cell sortable" 
              onClick={() => handleSort('amount')}
              style={{ flex: '1' }}
            >
              Amount {getSortIcon('amount')}
            </div>
            <div 
              className="table-header-cell sortable" 
              onClick={() => handleSort('status')}
              style={{ flex: '1' }}
            >
              Status {getSortIcon('status')}
            </div>
            <div 
              className="table-header-cell sortable" 
              onClick={() => handleSort('createdAt')}
              style={{ flex: '1.5' }}
            >
              Date {getSortIcon('createdAt')}
            </div>
            <div className="table-header-cell" style={{ flex: '0.5' }}>
              Actions
            </div>
          </div>

          <div className="table-body">
            {sortedPayments.map((payment) => (
              <div key={payment.id} className="table-row">
                <div className="table-cell" style={{ flex: '2' }}>
                  <span className="transaction-id" title={payment.transactionId}>
                    {payment.transactionId}
                  </span>
                </div>
                <div className="table-cell" style={{ flex: '1' }}>
                  <span className="provider-badge">
                    {payment.provider}
                  </span>
                </div>
                <div className="table-cell" style={{ flex: '1' }}>
                  <span className="amount">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: payment.currency || 'XAF'
                    }).format(payment.amount)}
                  </span>
                </div>
                <div className="table-cell" style={{ flex: '1' }}>
                  <span className={`status ${statusService.getStatusClass(payment.status)}`}>
                    {statusService.getStatusIcon(payment.status)} {statusService.getStatusDisplay(payment.status)}
                  </span>
                </div>
                <div className="table-cell" style={{ flex: '1.5' }}>
                  <span className="date" title={new Date(payment.createdAt).toLocaleString()}>
                    {new Date(payment.createdAt).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="table-cell" style={{ flex: '0.5' }}>
                  <div className="actions">
                    <button 
                      className="btn-icon" 
                      title="View Details"
                      onClick={() => {
                        // TODO: Ouvrir modal de détails
                        console.log('View payment details:', payment);
                      }}
                    >
                      👁️
                    </button>
                    {statusService.canCancel(payment.status) && (
                      <button 
                        className="btn-icon danger" 
                        title="Cancel Payment"
                        onClick={() => {
                          // TODO: Implémenter l'annulation
                          console.log('Cancel payment:', payment);
                        }}
                      >
                        🚫
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="table-footer">
            <div className="results-count">
              Showing {sortedPayments.length} of {payments?.length || 0} payments
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentList;