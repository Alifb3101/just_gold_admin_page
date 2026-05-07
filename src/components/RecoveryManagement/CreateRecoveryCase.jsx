// Create Recovery Case Component
// Form to create a new recovery case

import React, { useState } from 'react';
import { useRecoveryStore } from '../../store/recoveryStore';
import {
  createRecoveryCase,
  validateRecoveryInput,
} from '../../services/recoveryApi';

export const CreateRecoveryCase = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    orderId: '',
    customerId: '',
  });

  const [errors, setErrors] = useState({});
  const [copiedToken, setCopiedToken] = useState(false);

  const { currentRecoveryId, token, expiryInfo, setLoading, setError, setSuccess, setCurrentRecovery } =
    useRecoveryStore((state) => ({
      currentRecoveryId: state.currentRecoveryId,
      token: state.token,
      expiryInfo: state.expiryInfo,
      setLoading: state.setLoading,
      setError: state.setError,
      setSuccess: state.setSuccess,
      setCurrentRecovery: state.setCurrentRecovery,
    }));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate input
    const validation = validateRecoveryInput(formData.orderId, formData.customerId);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setError('Please fix the errors above');
      return;
    }

    setLoading(true);

    const result = await createRecoveryCase({
      orderId: formData.orderId,
      customerId: formData.customerId,
    });

    if (result.success) {
      setCurrentRecovery(result.recoveryId, result.token, result.expiryInfo);
      setSuccess('Recovery case created successfully');
      setFormData({ orderId: '', customerId: '' });
      setErrors({});

      if (onSuccess) {
        onSuccess(result);
      }
    } else {
      setError(result.error);
    }
  };

  const handleCopyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const recoveryLink = token
    ? `${window.location.origin}/recovery/${token}`
    : null;

  const handleCopyLink = () => {
    if (recoveryLink) {
      navigator.clipboard.writeText(recoveryLink);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <div className="recovery-section">
      <div className="section-header">
        <h2>Create Recovery Case</h2>
        <p>Create a new out-of-stock recovery case for a customer</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="recovery-form">
        <div className="form-group">
          <label htmlFor="orderId" className="form-label">
            Order ID *
          </label>
          <input
            id="orderId"
            type="text"
            name="orderId"
            value={formData.orderId}
            onChange={handleInputChange}
            placeholder="e.g., ORD-12345"
            className={`form-input ${errors.orderId ? 'form-input--error' : ''}`}
          />
          {errors.orderId && (
            <span className="form-error">{errors.orderId}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="customerId" className="form-label">
            Customer ID *
          </label>
          <input
            id="customerId"
            type="text"
            name="customerId"
            value={formData.customerId}
            onChange={handleInputChange}
            placeholder="e.g., CUST-98765"
            className={`form-input ${
              errors.customerId ? 'form-input--error' : ''
            }`}
          />
          {errors.customerId && (
            <span className="form-error">{errors.customerId}</span>
          )}
        </div>

        <button type="submit" className="btn btn--primary">
          Create Case
        </button>
      </form>

      {/* Success Result */}
      {currentRecoveryId && token && (
        <div className="recovery-result">
          <div className="result-header">
            <h3>✓ Recovery Case Created</h3>
          </div>

          <div className="result-field">
            <label>Recovery ID:</label>
            <code>{currentRecoveryId}</code>
          </div>

          <div className="result-field">
            <label>Token:</label>
            <div className="token-copy">
              <code className="token">{token}</code>
              <button
                type="button"
                onClick={handleCopyToken}
                className="btn-copy"
                title="Copy token"
              >
                {copiedToken ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {expiryInfo && (
            <div className="result-field">
              <label>Expiry Info:</label>
              <span>{expiryInfo}</span>
            </div>
          )}

          <div className="result-field">
            <label>Recovery Link:</label>
            <div className="token-copy">
              <code className="token">{recoveryLink}</code>
              <button
                type="button"
                onClick={handleCopyLink}
                className="btn-copy"
                title="Copy recovery link"
              >
                {copiedToken ? '✓ Copied' : 'Copy Link'}
              </button>
            </div>
          </div>

          <p className="result-hint">
            📌 Share the recovery link with the customer so they can select
            replacement options.
          </p>
        </div>
      )}
    </div>
  );
};
