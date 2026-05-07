// Generate Promo Code Component
// Form to generate a promo code for recovery case

import React, { useState } from 'react';
import { useRecoveryStore } from '../../store/recoveryStore';
import {
  generatePromoCode,
  validatePromoInput,
} from '../../services/recoveryApi';

export const GeneratePromo = ({ onSuccess }) => {
  const [recoveryId, setRecoveryId] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [errors, setErrors] = useState({});
  const [copiedCode, setCopiedCode] = useState(false);

  const {
    currentRecoveryId,
    promoCode,
    promoUsageLimit,
    setLoading,
    setError,
    setSuccess,
    setPromoCode,
  } = useRecoveryStore((state) => ({
    currentRecoveryId: state.currentRecoveryId,
    promoCode: state.promoCode,
    promoUsageLimit: state.promoUsageLimit,
    setLoading: state.setLoading,
    setError: state.setError,
    setSuccess: state.setSuccess,
    setPromoCode: state.setPromoCode,
  }));

  const effectiveRecoveryId = recoveryId || currentRecoveryId;

  const handleRecoveryIdChange = (e) => {
    const value = e.target.value;
    setRecoveryId(value);
    if (value.trim()) {
      if (errors.recoveryId) {
        setErrors((prev) => ({
          ...prev,
          recoveryId: '',
        }));
      }
    }
  };

  const handleDiscountChange = (e) => {
    const value = e.target.value;
    setDiscountPercent(value);
    if (value) {
      if (errors.discountPercent) {
        setErrors((prev) => ({
          ...prev,
          discountPercent: '',
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    // Validate recovery ID
    if (!effectiveRecoveryId || effectiveRecoveryId.trim() === '') {
      newErrors.recoveryId = 'Recovery ID is required';
    }

    // Validate discount
    const validation = validatePromoInput(discountPercent);
    if (!validation.isValid) {
      newErrors.discountPercent = validation.errors.discountPercent;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError('Please fix the errors above');
      return;
    }

    setLoading(true);

    const result = await generatePromoCode(
      effectiveRecoveryId,
      parseFloat(discountPercent)
    );

    if (result.success) {
      setPromoCode(result.promoCode, result.usageLimit);
      setSuccess('Promo code generated successfully');
      setDiscountPercent('');
      setErrors({});

      if (onSuccess) {
        onSuccess(result);
      }
    } else {
      setError(result.error);
    }
  };

  const handleCopyCode = () => {
    if (promoCode) {
      navigator.clipboard.writeText(promoCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="recovery-section">
      <div className="section-header">
        <h2>Generate Promo Code</h2>
        <p>Create a discount code for the recovery case</p>
      </div>

      <form onSubmit={handleSubmit} className="recovery-form">
        {/* Recovery ID Input */}
        <div className="form-group">
          <label htmlFor="recoveryIdInput" className="form-label">
            Recovery ID *
          </label>
          <input
            id="recoveryIdInput"
            type="text"
            value={recoveryId}
            onChange={handleRecoveryIdChange}
            placeholder={currentRecoveryId || 'Enter recovery ID'}
            className={`form-input ${
              errors.recoveryId ? 'form-input--error' : ''
            }`}
          />
          {errors.recoveryId && (
            <span className="form-error">{errors.recoveryId}</span>
          )}
          {!recoveryId && currentRecoveryId && (
            <span className="form-hint">
              Will use: <strong>{currentRecoveryId}</strong>
            </span>
          )}
        </div>

        {/* Discount Percent Input */}
        <div className="form-group">
          <label htmlFor="discountInput" className="form-label">
            Discount Percentage (1-100) *
          </label>
          <div className="input-with-unit">
            <input
              id="discountInput"
              type="number"
              value={discountPercent}
              onChange={handleDiscountChange}
              placeholder="e.g., 20"
              min="1"
              max="100"
              step="1"
              className={`form-input ${
                errors.discountPercent ? 'form-input--error' : ''
              }`}
            />
            <span className="input-unit">%</span>
          </div>
          {errors.discountPercent && (
            <span className="form-error">{errors.discountPercent}</span>
          )}
        </div>

        {/* Submit Button */}
        <button type="submit" className="btn btn--primary">
          Generate Promo Code
        </button>
      </form>

      {/* Success Result */}
      {promoCode && (
        <div className="promo-result">
          <div className="result-header">
            <h3>✓ Promo Code Generated</h3>
          </div>

          <div className="result-field">
            <label>Promo Code:</label>
            <div className="code-copy">
              <code className="promo-code">{promoCode}</code>
              <button
                type="button"
                onClick={handleCopyCode}
                className="btn-copy"
                title="Copy promo code"
              >
                {copiedCode ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="result-field">
            <label>Usage Limit:</label>
            <span>{promoUsageLimit} use only</span>
          </div>

          <p className="result-hint">
            📌 This code is single-use and will be automatically applied during
            checkout.
          </p>
        </div>
      )}
    </div>
  );
};
