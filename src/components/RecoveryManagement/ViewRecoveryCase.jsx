// View Recovery Case Component
// Read-only view of recovery case details

import React, { useState, useEffect } from 'react';
import { useRecoveryStore } from '../../store/recoveryStore';
import { getRecoveryCaseByToken } from '../../services/recoveryApi';

export const ViewRecoveryCase = () => {
  const [tokenInput, setTokenInput] = useState('');
  const [recoveryData, setRecoveryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { currentRecoveryId, token, options, promoCode } = useRecoveryStore(
    (state) => ({
      currentRecoveryId: state.currentRecoveryId,
      token: state.token,
      options: state.options,
      promoCode: state.promoCode,
    })
  );

  const effectiveToken = tokenInput || token;

  const handleTokenChange = (e) => {
    setTokenInput(e.target.value);
  };

  const handleViewCase = async () => {
    if (!effectiveToken) {
      setError('Please provide a token');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecoveryData(null);

    const result = await getRecoveryCaseByToken(effectiveToken);

    if (result.success) {
      setRecoveryData(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleViewCase();
    }
  };

  return (
    <div className="recovery-section">
      <div className="section-header">
        <h2>View Recovery Case</h2>
        <p>View recovery case details using token (preview only)</p>
      </div>

      {/* Token Input */}
      <div className="view-section">
        <div className="form-group">
          <label htmlFor="tokenInput" className="form-label">
            Token
          </label>
          <input
            id="tokenInput"
            type="text"
            value={tokenInput}
            onChange={handleTokenChange}
            onKeyPress={handleKeyPress}
            placeholder={token || 'Enter token'}
            className="form-input"
          />
          {!tokenInput && token && (
            <span className="form-hint">
              Will use token from current case
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleViewCase}
          disabled={isLoading}
          className="btn btn--primary"
        >
          {isLoading ? 'Loading...' : 'View Case'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-box">
          <p>⚠️ {error}</p>
          <p className="hint">
            Note: This preview requires the customer endpoint to be accessible.
            If no GET endpoint exists, you can view data from previous operations
            above.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && <div className="loading">Loading case details...</div>}

      {/* Recovery Data Display */}
      {recoveryData && (
        <div className="case-details">
          <h3>Case Details</h3>
          <div className="details-grid">
            {recoveryData.recoveryId && (
              <div className="detail-item">
                <label>Recovery ID:</label>
                <value>{recoveryData.recoveryId}</value>
              </div>
            )}
            {recoveryData.orderId && (
              <div className="detail-item">
                <label>Order ID:</label>
                <value>{recoveryData.orderId}</value>
              </div>
            )}
            {recoveryData.customerId && (
              <div className="detail-item">
                <label>Customer ID:</label>
                <value>{recoveryData.customerId}</value>
              </div>
            )}
            {recoveryData.status && (
              <div className="detail-item">
                <label>Status:</label>
                <value>{recoveryData.status}</value>
              </div>
            )}
            {recoveryData.createdAt && (
              <div className="detail-item">
                <label>Created:</label>
                <value>
                  {new Date(recoveryData.createdAt).toLocaleString()}
                </value>
              </div>
            )}
            {recoveryData.expiryDate && (
              <div className="detail-item">
                <label>Expiry:</label>
                <value>
                  {new Date(recoveryData.expiryDate).toLocaleString()}
                </value>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Session State Summary */}
      {!recoveryData && currentRecoveryId && (
        <div className="state-summary">
          <h3>Current Session State</h3>

          <div className="summary-section">
            <h4>Case Information</h4>
            <ul>
              <li>
                <strong>Recovery ID:</strong> {currentRecoveryId}
              </li>
              {token && (
                <li>
                  <strong>Token:</strong> {token.substring(0, 20)}...
                </li>
              )}
            </ul>
          </div>

          {options.length > 0 && (
            <div className="summary-section">
              <h4>Options Added ({options.length})</h4>
              <ul>
                {options.map((opt) => (
                  <li key={opt.id}>
                    <strong>{opt.productId}</strong> - {opt.type}
                    {opt.price_override && ` ($${opt.price_override})`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {promoCode && (
            <div className="summary-section">
              <h4>Promo Code</h4>
              <ul>
                <li>
                  <strong>Code:</strong> {promoCode}
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
