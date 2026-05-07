// Add Recovery Options Component
// Dynamic form to add multiple recovery options

import React, { useState } from 'react';
import { useRecoveryStore } from '../../store/recoveryStore';
import {
  addRecoveryOptions,
  validateOption,
} from '../../services/recoveryApi';

export const AddRecoveryOptions = ({ onSuccess }) => {
  const [recoveryId, setRecoveryId] = useState('');
  const [recoveryIdError, setRecoveryIdError] = useState('');
  const [optionsList, setOptionsList] = useState([
    { id: 1, productId: '', type: 'replacement', price_override: '' },
  ]);
  const [optionErrors, setOptionErrors] = useState({});

  const {
    currentRecoveryId,
    options,
    setLoading,
    setError,
    setSuccess,
    addOption,
    removeOption,
    updateOption,
  } = useRecoveryStore((state) => ({
    currentRecoveryId: state.currentRecoveryId,
    options: state.options,
    setLoading: state.setLoading,
    setError: state.setError,
    setSuccess: state.setSuccess,
    addOption: state.addOption,
    removeOption: state.removeOption,
    updateOption: state.updateOption,
  }));

  const effectiveRecoveryId = recoveryId || currentRecoveryId;

  const handleRecoveryIdChange = (e) => {
    const value = e.target.value;
    setRecoveryId(value);
    if (value.trim()) {
      setRecoveryIdError('');
    }
  };

  const handleOptionChange = (index, field, value) => {
    const updatedOptions = [...optionsList];
    updatedOptions[index] = {
      ...updatedOptions[index],
      [field]: value,
    };
    setOptionsList(updatedOptions);

    // Clear error for this field
    if (optionErrors[`option-${index}-${field}`]) {
      const newErrors = { ...optionErrors };
      delete newErrors[`option-${index}-${field}`];
      setOptionErrors(newErrors);
    }
  };

  const handleAddOptionRow = () => {
    const newId = Math.max(...optionsList.map((o) => o.id), 0) + 1;
    setOptionsList([
      ...optionsList,
      { id: newId, productId: '', type: 'replacement', price_override: '' },
    ]);
  };

  const handleRemoveOptionRow = (index) => {
    setOptionsList(optionsList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate recovery ID
    if (!effectiveRecoveryId || effectiveRecoveryId.trim() === '') {
      setRecoveryIdError('Recovery ID is required');
      setError('Please provide a recovery ID');
      return;
    }

    // Validate options
    const newErrors = {};
    const validOptions = [];

    optionsList.forEach((option, index) => {
      const validation = validateOption({
        productId: option.productId,
        type: option.type,
        price_override: option.price_override,
      });

      if (!validation.isValid) {
        Object.keys(validation.errors).forEach((field) => {
          newErrors[`option-${index}-${field}`] = validation.errors[field];
        });
      } else {
        validOptions.push({
          productId: option.productId,
          type: option.type,
          ...(option.price_override && {
            price_override: parseFloat(option.price_override),
          }),
        });
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setOptionErrors(newErrors);
      setError('Please fix the errors above');
      return;
    }

    setLoading(true);

    const result = await addRecoveryOptions(
      effectiveRecoveryId,
      validOptions
    );

    if (result.success) {
      validOptions.forEach((opt) => addOption(opt));
      setSuccess(`${validOptions.length} option(s) added successfully`);
      setOptionsList([
        { id: 1, productId: '', type: 'replacement', price_override: '' },
      ]);
      setOptionErrors({});

      if (onSuccess) {
        onSuccess(result);
      }
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="recovery-section">
      <div className="section-header">
        <h2>Add Recovery Options</h2>
        <p>Add replacement or upgrade options for the recovery case</p>
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
              recoveryIdError ? 'form-input--error' : ''
            }`}
          />
          {recoveryIdError && (
            <span className="form-error">{recoveryIdError}</span>
          )}
          {!recoveryId && currentRecoveryId && (
            <span className="form-hint">
              Will use: <strong>{currentRecoveryId}</strong>
            </span>
          )}
        </div>

        {/* Options List */}
        <div className="options-section">
          <h3>Options</h3>

          {optionsList.map((option, index) => (
            <div key={option.id} className="option-row">
              <div className="option-fields">
                {/* Product ID */}
                <div className="form-group form-group--inline">
                  <label className="form-label">Product ID *</label>
                  <input
                    type="text"
                    value={option.productId}
                    onChange={(e) =>
                      handleOptionChange(index, 'productId', e.target.value)
                    }
                    placeholder="Product ID"
                    className={`form-input ${
                      optionErrors[`option-${index}-productId`]
                        ? 'form-input--error'
                        : ''
                    }`}
                  />
                  {optionErrors[`option-${index}-productId`] && (
                    <span className="form-error">
                      {optionErrors[`option-${index}-productId`]}
                    </span>
                  )}
                </div>

                {/* Type */}
                <div className="form-group form-group--inline">
                  <label className="form-label">Type *</label>
                  <select
                    value={option.type}
                    onChange={(e) =>
                      handleOptionChange(index, 'type', e.target.value)
                    }
                    className={`form-input ${
                      optionErrors[`option-${index}-type`]
                        ? 'form-input--error'
                        : ''
                    }`}
                  >
                    <option value="replacement">Replacement</option>
                    <option value="upgrade">Upgrade</option>
                  </select>
                  {optionErrors[`option-${index}-type`] && (
                    <span className="form-error">
                      {optionErrors[`option-${index}-type`]}
                    </span>
                  )}
                </div>

                {/* Price Override */}
                <div className="form-group form-group--inline">
                  <label className="form-label">Price Override (Optional)</label>
                  <input
                    type="number"
                    value={option.price_override}
                    onChange={(e) =>
                      handleOptionChange(
                        index,
                        'price_override',
                        e.target.value
                      )
                    }
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={`form-input ${
                      optionErrors[`option-${index}-price_override`]
                        ? 'form-input--error'
                        : ''
                    }`}
                  />
                  {optionErrors[`option-${index}-price_override`] && (
                    <span className="form-error">
                      {optionErrors[`option-${index}-price_override`]}
                    </span>
                  )}
                </div>
              </div>

              {/* Remove Button */}
              {optionsList.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOptionRow(index)}
                  className="btn btn--secondary btn--small"
                  title="Remove option"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Option Button */}
        <button
          type="button"
          onClick={handleAddOptionRow}
          className="btn btn--secondary"
        >
          + Add Another Option
        </button>

        {/* Submit Button */}
        <button type="submit" className="btn btn--primary">
          Add Options to Recovery Case
        </button>
      </form>

      {/* Options Summary */}
      {options.length > 0 && (
        <div className="options-summary">
          <h3>Added Options ({options.length})</h3>
          <ul>
            {options.map((opt) => (
              <li key={opt.id}>
                <strong>{opt.productId}</strong> - {opt.type}
                {opt.price_override && ` (Override: $${opt.price_override})`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
