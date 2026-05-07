// Recovery Management Main Container
// Orchestrates all recovery management sections

import React from 'react';
import { useRecoveryStore } from '../../store/recoveryStore';
import { useToast, ToastContainer } from '../../hooks/useToast';
import { CreateRecoveryCase } from './CreateRecoveryCase';
import { AddRecoveryOptions } from './AddRecoveryOptions';
import { GeneratePromo } from './GeneratePromo';
import { ViewRecoveryCase } from './ViewRecoveryCase';
import './RecoveryManagement.css';

export const RecoveryManagement = () => {
  const { toasts, removeToast, success, error: showError } = useToast();

  const {
    successMessage,
    error,
    currentRecoveryId,
    clearCurrentRecovery,
  } = useRecoveryStore((state) => ({
    successMessage: state.successMessage,
    error: state.error,
    currentRecoveryId: state.currentRecoveryId,
    clearCurrentRecovery: state.clearCurrentRecovery,
  }));

  // Show toast notifications when state changes
  React.useEffect(() => {
    if (successMessage) {
      success(successMessage);
    }
  }, [successMessage, success]);

  React.useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);

  const handleClearAll = () => {
    if (window.confirm('Clear all recovery data? This cannot be undone.')) {
      clearCurrentRecovery();
      success('Recovery data cleared');
    }
  };

  return (
    <div className="recovery-management">
      {/* Header */}
      <div className="recovery-header">
        <h1>Recovery Management</h1>
        <p>Manage out-of-stock recovery cases for customers</p>

        {currentRecoveryId && (
          <div className="active-case-banner">
            <span className="badge">Active Case: {currentRecoveryId}</span>
            <button
              onClick={handleClearAll}
              className="btn btn--secondary btn--small"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="recovery-content">
        <div className="recovery-sections">
          {/* Create Recovery Case */}
          <section className="recovery-module">
            <CreateRecoveryCase />
          </section>

          {/* Add Recovery Options */}
          <section className="recovery-module">
            <AddRecoveryOptions />
          </section>

          {/* Generate Promo Code */}
          <section className="recovery-module">
            <GeneratePromo />
          </section>

          {/* View Recovery Case */}
          <section className="recovery-module">
            <ViewRecoveryCase />
          </section>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default RecoveryManagement;
