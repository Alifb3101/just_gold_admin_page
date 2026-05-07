// Recovery Management Module - Integration Guide & Documentation
// ============================================================================

/**
 * RECOVERY MANAGEMENT ADMIN PANEL MODULE
 * 
 * Production-grade module for managing out-of-stock recovery cases.
 * Designed to integrate with existing admin panel without backend modifications.
 * 
 * CRITICAL: This module uses ONLY the provided API endpoints:
 * - POST /api/v1/recovery/admin/create
 * - POST /api/v1/recovery/:recoveryId/options
 * - POST /api/v1/recovery/:recoveryId/promo
 * - GET /api/v1/recovery/:token (customer preview)
 * 
 * ============================================================================
 * DIRECTORY STRUCTURE
 * ============================================================================
 * 
 * src/
 *   components/
 *     RecoveryManagement/
 *       ├── RecoveryManagement.jsx          (Main container component)
 *       ├── CreateRecoveryCase.jsx          (Create case form)
 *       ├── AddRecoveryOptions.jsx          (Dynamic options form)
 *       ├── GeneratePromo.jsx               (Promo code generator)
 *       ├── ViewRecoveryCase.jsx            (Case details viewer)
 *       ├── RecoveryManagement.css          (All styling)
 *       └── index.js                        (Exports)
 *   services/
 *     └── recoveryApi.js                    (API integration & validation)
 *   store/
 *     └── recoveryStore.js                  (Zustand state management)
 *   hooks/
 *     └── useToast.js                       (Toast notifications)
 * 
 * ============================================================================
 * INSTALLATION REQUIREMENTS
 * ============================================================================
 * 
 * npm install zustand                       # State management
 * npm install react react-dom               # If not already installed
 * 
 * Optional (for production setup):
 * npm install axios                         # Alternative to fetch
 * npm install react-hot-toast               # Enhanced notifications
 * 
 * ============================================================================
 * QUICK START
 * ============================================================================
 * 
 * 1. Import the component:
 * 
 *    import { RecoveryManagement } from './components/RecoveryManagement';
 * 
 * 2. Add to your admin panel layout:
 * 
 *    <RecoveryManagement />
 * 
 * 3. Ensure JWT token is stored in localStorage or sessionStorage:
 * 
 *    localStorage.setItem('jwtToken', 'your-jwt-token');
 * 
 * 4. Optionally set custom API URL:
 * 
 *    Environment variable: REACT_APP_API_URL
 *    Default: http://localhost:5000/api/v1
 * 
 * ============================================================================
 * COMPONENT USAGE
 * ============================================================================
 * 
 * COMPLETE MODULE (Recommended):
 * 
 *   import { RecoveryManagement } from './components/RecoveryManagement';
 *   
 *   function AdminDashboard() {
 *     return (
 *       <div>
 *         <RecoveryManagement />
 *       </div>
 *     );
 *   }
 * 
 * 
 * INDIVIDUAL COMPONENTS (Advanced):
 * 
 *   import {
 *     CreateRecoveryCase,
 *     AddRecoveryOptions,
 *     GeneratePromo,
 *     ViewRecoveryCase
 *   } from './components/RecoveryManagement';
 *   
 *   function CustomRecoveryModule() {
 *     return (
 *       <div className="custom-recovery">
 *         <CreateRecoveryCase onSuccess={(data) => console.log(data)} />
 *         <AddRecoveryOptions onSuccess={(data) => console.log(data)} />
 *         <GeneratePromo onSuccess={(data) => console.log(data)} />
 *         <ViewRecoveryCase />
 *       </div>
 *     );
 *   }
 * 
 * ============================================================================
 * STATE MANAGEMENT
 * ============================================================================
 * 
 * STATE STRUCTURE:
 * 
 *   {
 *     // Recovery Case
 *     currentRecoveryId: string | null,
 *     token: string | null,
 *     expiryInfo: string | null,
 *     orderId: string | null,
 *     customerId: string | null,
 * 
 *     // Options
 *     options: Array<{
 *       id: number,
 *       productId: string,
 *       type: 'replacement' | 'upgrade',
 *       price_override?: number
 *     }>,
 * 
 *     // Promo
 *     promoCode: string | null,
 *     promoUsageLimit: number | null,
 * 
 *     // UI
 *     isLoading: boolean,
 *     error: string | null,
 *     successMessage: string | null
 *   }
 * 
 * 
 * ACCESSING STATE (Advanced):
 * 
 *   import { useRecoveryStore } from './store/recoveryStore';
 *   
 *   function MyComponent() {
 *     const recoveryState = useRecoveryStore((state) => ({
 *       currentRecoveryId: state.currentRecoveryId,
 *       token: state.token,
 *       options: state.options,
 *       promoCode: state.promoCode,
 *     }));
 * 
 *     return (
 *       <div>
 *         <p>Current Recovery ID: {recoveryState.currentRecoveryId}</p>
 *         <p>Token: {recoveryState.token}</p>
 *       </div>
 *     );
 *   }
 * 
 * ============================================================================
 * API INTEGRATION
 * ============================================================================
 * 
 * The recoveryApi.js service provides:
 * 
 *   createRecoveryCase(payload)
 *     → POST /api/v1/recovery/admin/create
 *     ← { recoveryId, token, expiryInfo }
 * 
 *   addRecoveryOptions(recoveryId, options)
 *     → POST /api/v1/recovery/:recoveryId/options
 *     ← { success: true, ... }
 * 
 *   generatePromoCode(recoveryId, discountPercent)
 *     → POST /api/v1/recovery/:recoveryId/promo
 *     ← { promo_code, usage_limit }
 * 
 *   getRecoveryCaseByToken(token)
 *     → GET /api/v1/recovery/:token
 *     ← { recoveryId, orderId, customerId, status, ... }
 * 
 * 
 * CUSTOM API CALLS (if needed):
 * 
 *   import {
 *     createRecoveryCase,
 *     validateRecoveryInput
 *   } from './services/recoveryApi';
 * 
 *   // Call API directly
 *   const result = await createRecoveryCase({
 *     orderId: 'ORD-12345',
 *     customerId: 'CUST-98765'
 *   });
 * 
 *   if (result.success) {
 *     console.log('Recovery ID:', result.recoveryId);
 *     console.log('Token:', result.token);
 *   } else {
 *     console.error('Error:', result.error);
 *   }
 * 
 * ============================================================================
 * AUTHENTICATION
 * ============================================================================
 * 
 * JWT TOKEN MANAGEMENT:
 * 
 * The module automatically reads JWT from:
 *   1. localStorage.jwtToken
 *   2. sessionStorage.jwtToken
 * 
 * Set token after login:
 * 
 *   // After successful authentication
 *   localStorage.setItem('jwtToken', response.token);
 * 
 * Remove token on logout:
 * 
 *   localStorage.removeItem('jwtToken');
 *   sessionStorage.removeItem('jwtToken');
 * 
 * 
 * TOKEN HEADER FORMAT:
 * 
 *   Authorization: Bearer <token>
 * 
 * ============================================================================
 * NOTIFICATIONS
 * ============================================================================
 * 
 * TOAST TYPES:
 * 
 *   success(message)     → Green notification
 *   error(message)       → Red notification
 *   warning(message)     → Yellow notification
 *   info(message)        → Blue notification
 * 
 * 
 * CUSTOM NOTIFICATIONS (Advanced):
 * 
 *   import { useToast } from './hooks/useToast';
 * 
 *   function MyComponent() {
 *     const { success, error } = useToast();
 * 
 *     const handleAction = () => {
 *       try {
 *         // Do something
 *         success('Action completed!');
 *       } catch (err) {
 *         error('Action failed: ' + err.message);
 *       }
 *     };
 * 
 *     return <button onClick={handleAction}>Do Action</button>;
 *   }
 * 
 * ============================================================================
 * VALIDATION RULES
 * ============================================================================
 * 
 * RECOVERY CASE:
 *   - orderId: Required, non-empty string
 *   - customerId: Required, non-empty string
 * 
 * OPTIONS:
 *   - productId: Required, non-empty string
 *   - type: Required, must be 'replacement' or 'upgrade'
 *   - price_override: Optional, must be positive number if provided
 * 
 * PROMO CODE:
 *   - discountPercent: Required, must be 1-100 (integer)
 * 
 * ============================================================================
 * ERROR HANDLING
 * ============================================================================
 * 
 * ERROR TYPES HANDLED:
 * 
 *   1. Validation Errors
 *      - Invalid input format
 *      - Missing required fields
 *      - Value constraints (range, format)
 * 
 *   2. Network Errors
 *      - Connection timeout
 *      - Server unavailable
 *      - Invalid response
 * 
 *   3. API Errors
 *      - 401 Unauthorized (Invalid/expired token)
 *      - 400 Bad Request (Invalid payload)
 *      - 404 Not Found (Resource not found)
 *      - 500 Server Error
 * 
 * 
 * ERROR MESSAGES DISPLAY:
 * 
 *   1. Inline validation errors (above each field)
 *   2. Error box for API failures
 *   3. Toast notification for summarized error
 * 
 * ============================================================================
 * STYLING & CUSTOMIZATION
 * ============================================================================
 * 
 * CSS VARIABLES (in RecoveryManagement.css):
 * 
 *   --primary-color: #007bff
 *   --error-color: #dc3545
 *   --success-color: #28a745
 *   --warning-color: #ffc107
 *   
 *   [See RecoveryManagement.css for full list]
 * 
 * 
 * OVERRIDE STYLES (in your custom CSS):
 * 
 *   /* Change primary color */
 *   :root {
 *     --primary-color: #1e40af;
 *   }
 * 
 *   /* Custom button styling */
 *   .btn--primary {
 *     border-radius: 8px;
 *     font-weight: 700;
 *   }
 * 
 * 
 * RESPONSIVE BREAKPOINTS:
 * 
 *   768px  → Tablet
 *   480px  → Mobile
 * 
 * ============================================================================
 * PERFORMANCE CONSIDERATIONS
 * ============================================================================
 * 
 * 1. STATE MANAGEMENT
 *    - Uses Zustand (lightweight, fast)
 *    - Minimal re-renders via selector pattern
 * 
 * 2. NETWORK REQUESTS
 *    - Sequential API calls (automatic flow)
 *    - No unnecessary polling
 *    - Proper error handling and retry (manual)
 * 
 * 3. CODE SPLITTING
 *    - Each component can be lazy-loaded
 *    - CSS is single bundled file
 * 
 *    Example:
 *    const RecoveryManagement = lazy(() => 
 *      import('./components/RecoveryManagement')
 *    );
 * 
 * ============================================================================
 * BROWSER SUPPORT
 * ============================================================================
 * 
 * - Chrome 90+
 * - Firefox 88+
 * - Safari 14+
 * - Edge 90+
 * 
 * Requires:
 * - Fetch API
 * - async/await
 * - ES6 modules
 * - localStorage/sessionStorage
 * 
 * ============================================================================
 * TROUBLESHOOTING
 * ============================================================================
 * 
 * ISSUE: "Token not found in headers"
 * SOLUTION: Ensure JWT is stored in localStorage or sessionStorage
 *           Check that Authentication header is being sent (browser DevTools)
 * 
 * ISSUE: "API calls fail with 401"
 * SOLUTION: JWT token may be expired - require fresh login
 *           Verify token format is "Bearer <token>"
 * 
 * ISSUE: "Component not rendering"
 * SOLUTION: Ensure Zustand is installed (npm install zustand)
 *           Check for console errors in browser DevTools
 * 
 * ISSUE: "Styles not loading"
 * SOLUTION: Verify RecoveryManagement.css is imported in component
 *           Check CSS file path is correct
 * 
 * ISSUE: "Toast notifications not showing"
 * SOLUTION: Verify ToastContainer is rendered in RecoveryManagement.jsx
 *           Check z-index conflicts with other elements
 * 
 * ============================================================================
 * PRODUCTION CHECKLIST
 * ============================================================================
 * 
 * [ ] JWT token management is secure (HTTPS, httpOnly cookies)
 * [ ] API URLs use environment variables
 * [ ] Error handling covers all edge cases
 * [ ] Toast notifications are working
 * [ ] Responsive design tested on mobile
 * [ ] Accessibility (ARIA labels, keyboard navigation)
 * [ ] Performance optimized (no memory leaks)
 * [ ] Rate limiting implemented (backend)
 * [ ] Audit logging for recovery case creation (backend)
 * [ ] Legal compliance (privacy, data retention)
 * 
 * ============================================================================
 * SUPPORT & MAINTENANCE
 * ============================================================================
 * 
 * FUTURE ENHANCEMENTS:
 * 
 * 1. Bulk operations (create multiple cases)
 * 2. Search/filter recovery cases
 * 3. Export data to CSV
 * 4. Customer notifications integration
 * 5. Analytics dashboard
 * 6. Webhooks for recovery events
 * 7. Internationalization (i18n)
 * 8. Dark mode support
 * 
 * KNOWN LIMITATIONS:
 * 
 * 1. No GET endpoint for admin (uses data from POST responses)
 * 2. Single-use promo codes only (no multiple use tracking)
 * 3. No batch operations for options
 * 4. Token-based preview requires customer endpoint
 * 
 * ============================================================================
 */

export const MODULE_VERSION = '1.0.0';
export const MODULE_NAME = 'Recovery Management';
export const LAST_UPDATED = '2025-05-04';
