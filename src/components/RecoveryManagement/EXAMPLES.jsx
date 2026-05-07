// ============================================================================
// RECOVERY MANAGEMENT MODULE - INTEGRATION EXAMPLES
// ============================================================================
//
// This file contains practical examples of how to integrate the Recovery
// Management module into your existing admin panel.
//

// ============================================================================
// EXAMPLE 1: BASIC INTEGRATION (RECOMMENDED)
// ============================================================================
// 
// The simplest way to add the Recovery Management module to your admin panel.
//

import React from 'react';
import { RecoveryManagement } from './components/RecoveryManagement';
import './AdminPanel.css';

export default function AdminPanel() {
  return (
    <div className="admin-panel">
      {/* Sidebar navigation */}
      <aside className="admin-sidebar">
        <nav>
          <ul>
            <li><a href="#dashboard">Dashboard</a></li>
            <li><a href="#orders">Orders</a></li>
            <li><a href="#products">Products</a></li>
            <li><a href="#recovery">Recovery Management</a></li>
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="admin-content">
        {/* Recovery Management Module - entire implementation included */}
        <RecoveryManagement />
      </main>
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: WITH CUSTOM LAYOUT
// ============================================================================
//
// Integrate Recovery Management with custom styling/layout
//

import React, { useState } from 'react';
import {
  RecoveryManagement,
  CreateRecoveryCase,
  AddRecoveryOptions,
  GeneratePromo,
  ViewRecoveryCase,
} from './components/RecoveryManagement';

export function AdminPanelWithCustomLayout() {
  const [activeTab, setActiveTab] = useState('create');

  return (
    <div className="custom-admin-layout">
      <header className="admin-header">
        <h1>Just Gold Admin Panel</h1>
        <p>Manage your store efficiently</p>
      </header>

      <div className="admin-container">
        {/* Sidebar with tabs */}
        <aside className="sidebar">
          <div className="module-nav">
            <h3>Recovery Management</h3>
            <button
              className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              Create Case
            </button>
            <button
              className={`tab-button ${activeTab === 'options' ? 'active' : ''}`}
              onClick={() => setActiveTab('options')}
            >
              Add Options
            </button>
            <button
              className={`tab-button ${activeTab === 'promo' ? 'active' : ''}`}
              onClick={() => setActiveTab('promo')}
            >
              Generate Promo
            </button>
            <button
              className={`tab-button ${activeTab === 'view' ? 'active' : ''}`}
              onClick={() => setActiveTab('view')}
            >
              View Case
            </button>
          </div>
        </aside>

        {/* Main content area */}
        <main className="main-content">
          {activeTab === 'create' && <CreateRecoveryCase />}
          {activeTab === 'options' && <AddRecoveryOptions />}
          {activeTab === 'promo' && <GeneratePromo />}
          {activeTab === 'view' && <ViewRecoveryCase />}
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: WITH CONTEXT FOR GLOBAL FEATURES
// ============================================================================
//
// Use React Context to share admin panel state across modules
//

import React, { createContext, useContext } from 'react';
import { RecoveryManagement } from './components/RecoveryManagement';

// Create admin context
const AdminContext = createContext();

export function AdminProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  return (
    <AdminContext.Provider value={{ user, theme, setUser, setTheme }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}

// Admin component with context
export function AdvancedAdminPanel() {
  const { user, theme } = useAdmin();

  if (!user) {
    return <div>Please login first</div>;
  }

  return (
    <div className={`admin-panel admin-panel--${theme}`}>
      <header>
        <h1>Admin Panel - {user.name}</h1>
      </header>

      <RecoveryManagement />
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: WITH CUSTOM API URL
// ============================================================================
//
// Configure API endpoint via environment variable or prop
//

import React from 'react';
import { RecoveryManagement } from './components/RecoveryManagement';

export function AdminPanelWithCustomAPI() {
  // Use environment variable for API URL
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

  React.useEffect(() => {
    console.log(`Recovery API configured to: ${apiUrl}`);
  }, []);

  return (
    <div className="admin-panel">
      <RecoveryManagement />
    </div>
  );
}

// .env.local file should contain:
// REACT_APP_API_URL=https://api.yourdomain.com/api/v1

// ============================================================================
// EXAMPLE 5: WITH STATE INSPECTION (DEVELOPMENT)
// ============================================================================
//
// Debug the module state during development
//

import React from 'react';
import { RecoveryManagement } from './components/RecoveryManagement';
import { useRecoveryStore } from './store/recoveryStore';

export function AdminPanelWithDebug() {
  return (
    <div className="admin-panel">
      <RecoveryManagement />

      {/* Debug panel - remove in production */}
      <StateDebugger />
    </div>
  );
}

function StateDebugger() {
  const state = useRecoveryStore((s) => ({
    currentRecoveryId: s.currentRecoveryId,
    token: s.token,
    options: s.options,
    promoCode: s.promoCode,
    error: s.error,
    isLoading: s.isLoading,
  }));

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      right: 0,
      width: '400px',
      background: '#f5f5f5',
      border: '1px solid #ccc',
      padding: '16px',
      overflowY: 'auto',
      maxHeight: '300px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
    }}>
      <h4 style={{ margin: '0 0 8px 0' }}>Module State</h4>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: ROUTE-BASED INTEGRATION (NEXT.JS / REACT ROUTER)
// ============================================================================
//
// Integrate as a dedicated route in your admin application
//

// Using Next.js App Router
// pages/admin/recovery/page.jsx

import { RecoveryManagement } from '@/components/RecoveryManagement';
import AdminLayout from '@/components/layouts/AdminLayout';

export default function RecoveryPage() {
  return (
    <AdminLayout>
      <RecoveryManagement />
    </AdminLayout>
  );
}

// Using React Router v6
import { Routes, Route } from 'react-router-dom';
import { RecoveryManagement } from './components/RecoveryManagement';

export function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin/recovery" element={<RecoveryManagement />} />
      <Route path="/admin/orders" element={<OrdersPage />} />
      <Route path="/admin/products" element={<ProductsPage />} />
    </Routes>
  );
}

// ============================================================================
// EXAMPLE 7: WITH AUTHENTICATION CHECK
// ============================================================================
//
// Protect Recovery Management with role-based access control
//

import React from 'react';
import { RecoveryManagement } from './components/RecoveryManagement';

export function ProtectedRecoveryManagement() {
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Check authentication on mount
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
          throw new Error('No token found');
        }

        // Verify token is valid
        const response = await fetch('/api/v1/auth/verify', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Token invalid');
        }

        const userData = await response.json();
        setUser(userData);
      } catch (error) {
        console.error('Auth check failed:', error);
        // Redirect to login
        window.location.href = '/login';
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Check if user has recovery management permission
  if (!user || !user.permissions?.includes('recovery_management')) {
    return <div>Access denied. You don't have permission to access Recovery Management.</div>;
  }

  return <RecoveryManagement />;
}

// ============================================================================
// EXAMPLE 8: STANDALONE RECOVERY MODULE
// ============================================================================
//
// Use as a standalone micro-app (e.g., in iframe or separate tab)
//

// standalone.html
// <!DOCTYPE html>
// <html>
// <head>
//   <title>Recovery Management - Just Gold Admin</title>
//   <link rel="stylesheet" href="/recovery-management.css" />
// </head>
// <body>
//   <div id="root"></div>
//   <script src="/recovery-app.js"></script>
// </body>
// </html>

// recovery-app.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RecoveryManagement } from './components/RecoveryManagement';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<RecoveryManagement />);

// ============================================================================
// EXAMPLE 9: WITH ERROR BOUNDARY
// ============================================================================
//
// Add error boundary for graceful error handling
//

import React from 'react';
import { RecoveryManagement } from './components/RecoveryManagement';

class RecoveryErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Recovery Management Error:', error, errorInfo);
    // Log to error tracking service (e.g., Sentry)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          background: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          color: '#721c24',
        }}>
          <h2>Something went wrong</h2>
          <p>The Recovery Management module encountered an error:</p>
          <pre>{this.state.error?.message}</pre>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return <RecoveryManagement />;
  }
}

export function AdminPanelWithErrorBoundary() {
  return (
    <div className="admin-panel">
      <RecoveryErrorBoundary />
    </div>
  );
}

// ============================================================================
// EXAMPLE 10: WITH PERFORMANCE MONITORING
// ============================================================================
//
// Monitor module performance in production
//

import React, { Profiler } from 'react';
import { RecoveryManagement } from './components/RecoveryManagement';

export function AdminPanelWithProfiling() {
  const handleRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    console.log(
      `Recovery Management render: ${phase}, Duration: ${actualDuration}ms`
    );

    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'module_performance', {
        module: 'recovery_management',
        phase,
        duration: actualDuration,
      });
    }
  };

  return (
    <Profiler id="RecoveryManagement" onRender={handleRenderCallback}>
      <RecoveryManagement />
    </Profiler>
  );
}

// ============================================================================
// USAGE NOTES
// ============================================================================
//
// Choose the integration example that best fits your needs:
//
// 1. Basic Integration - Start here for most cases
// 2. Custom Layout - If you need specific UI layout
// 3. Context - For sharing state across modules
// 4. Custom API - If using different backend URL
// 5. Debug - During development
// 6. Route-based - For Next.js/React Router apps
// 7. Authentication - For role-based access
// 8. Standalone - For micro-app architecture
// 9. Error Boundary - For error handling
// 10. Performance - For monitoring and optimization
//
// Remember:
// - Always set JWT token in localStorage before using
// - Ensure backend APIs are accessible
// - Use environment variables for configuration
// - Test on mobile devices
// - Monitor performance in production
//
