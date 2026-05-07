// Toast Notification Hook
// Manages toast notifications with auto-dismiss

import { useState, useCallback } from 'react';

const TOAST_DURATION = 3500; // milliseconds

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    const toast = { id, message, type };

    setToasts((prev) => [...prev, toast]);

    // Auto-dismiss
    setTimeout(() => {
      removeToast(id);
    }, TOAST_DURATION);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (message) => addToast(message, 'success'),
    [addToast]
  );

  const error = useCallback(
    (message) => addToast(message, 'error'),
    [addToast]
  );

  const info = useCallback(
    (message) => addToast(message, 'info'),
    [addToast]
  );

  const warning = useCallback(
    (message) => addToast(message, 'warning'),
    [addToast]
  );

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };
};

// Toast Container Component
export const ToastContainer = ({ toasts, onRemove }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          role="alert"
        >
          <div className="toast__content">
            <span className="toast__message">{toast.message}</span>
            <button
              className="toast__close"
              onClick={() => onRemove(toast.id)}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
