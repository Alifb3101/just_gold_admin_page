// ============================================================================
// RECOVERY MANAGEMENT MODULE - QUICK REFERENCE
// ============================================================================
// 
// Fast reference guide for common tasks and troubleshooting
//

// ============================================================================
// 1. BASIC SETUP (5 MINUTES)
// ============================================================================

// Install dependencies
npm install zustand

// Import component
import { RecoveryManagement } from './components/RecoveryManagement';

// Add to your app
export default function App() {
  return <RecoveryManagement />;
}

// Set JWT token (after login)
localStorage.setItem('jwtToken', response.token);

// Done! ✓

// ============================================================================
// 2. API CALLS (IF YOU NEED CUSTOM LOGIC)
// ============================================================================

import {
  createRecoveryCase,
  addRecoveryOptions,
  generatePromoCode,
  getRecoveryCaseByToken,
  validateRecoveryInput,
  validateOption,
  validatePromoInput,
} from './services/recoveryApi';

// Create case
const result = await createRecoveryCase({
  orderId: 'ORD-123',
  customerId: 'CUST-456',
});

if (result.success) {
  console.log(result.recoveryId, result.token);
}

// Add options
const optionsResult = await addRecoveryOptions('recovery-id-123', [
  { productId: 'PROD-1', type: 'replacement', price_override: 99.99 },
  { productId: 'PROD-2', type: 'upgrade' },
]);

// Generate promo
const promoResult = await generatePromoCode('recovery-id-123', 20);
// Returns: { promo_code: 'PROMO123', usage_limit: 1 }

// View case
const caseResult = await getRecoveryCaseByToken('recovery-token');

// ============================================================================
// 3. STATE MANAGEMENT (IF YOU NEED GLOBAL STATE)
// ============================================================================

import { useRecoveryStore } from './store/recoveryStore';

function MyComponent() {
  // Get specific state
  const { currentRecoveryId, token, options, promoCode } = useRecoveryStore(
    (state) => ({
      currentRecoveryId: state.currentRecoveryId,
      token: state.token,
      options: state.options,
      promoCode: state.promoCode,
    })
  );

  // Get full state
  const state = useRecoveryStore();

  // Update state
  useRecoveryStore.setState({ isLoading: true });

  return <div>{currentRecoveryId}</div>;
}

// ============================================================================
// 4. CUSTOM NOTIFICATIONS (IF YOU NEED THEM)
// ============================================================================

import { useToast } from './hooks/useToast';

function MyComponent() {
  const { success, error, warning, info } = useToast();

  const handleAction = () => {
    try {
      // Do something
      success('Action completed!');
    } catch (err) {
      error('Action failed: ' + err.message);
    }
  };

  return <button onClick={handleAction}>Do Action</button>;
}

// ============================================================================
// 5. ENVIRONMENT CONFIGURATION
// ============================================================================

// .env.local (in your project root)
REACT_APP_API_URL=https://api.yourdomain.com/api/v1

// In production .env file:
REACT_APP_API_URL=https://production-api.yourdomain.com/api/v1

// ============================================================================
// 6. TROUBLESHOOTING QUICK FIXES
// ============================================================================

/*
PROBLEM: "Cannot find module" error
FIX: Check file paths are correct from src/
    import { RecoveryManagement } from './components/RecoveryManagement';
                                       └─ Correct path from your current file

PROBLEM: Toast notifications not showing
FIX: Make sure CSS file is imported
    import './components/RecoveryManagement/RecoveryManagement.css';

PROBLEM: API calls returning 401
FIX: Set JWT token before using module
    localStorage.setItem('jwtToken', yourToken);

PROBLEM: State not persisting
FIX: Use localStorage if needed (Zustand doesn't persist by default)
    import { persist } from 'zustand/middleware';

PROBLEM: Form not validating
FIX: Check error messages in browser console
    Check that input names match field names

PROBLEM: Component not rendering
FIX: Check browser console for React errors
    Verify React is installed and loaded
    Check parent component is passing props correctly

PROBLEM: Slow performance
FIX: Check network tab for slow API calls
    Check for unnecessary re-renders (React DevTools Profiler)
    Consider code splitting with lazy()
*/

// ============================================================================
// 7. COMMON INTEGRATION PATTERNS
// ============================================================================

// PATTERN 1: Use in Next.js App Router
// app/admin/recovery/page.jsx
import { RecoveryManagement } from '@/components/RecoveryManagement';

export default function RecoveryPage() {
  return <RecoveryManagement />;
}

// PATTERN 2: Use with React Router
import { Routes, Route } from 'react-router-dom';
import { RecoveryManagement } from './components/RecoveryManagement';

function App() {
  return (
    <Routes>
      <Route path="/admin/recovery" element={<RecoveryManagement />} />
    </Routes>
  );
}

// PATTERN 3: Use as tab
import { useState } from 'react';
import { RecoveryManagement, CreateRecoveryCase } from './components/RecoveryManagement';

function AdminTabs() {
  const [activeTab, setActiveTab] = useState('recovery');

  return (
    <>
      <button onClick={() => setActiveTab('recovery')}>Recovery</button>
      <button onClick={() => setActiveTab('create')}>Create</button>

      {activeTab === 'recovery' && <RecoveryManagement />}
      {activeTab === 'create' && <CreateRecoveryCase />}
    </>
  );
}

// ============================================================================
// 8. CSS CUSTOMIZATION
// ============================================================================

// Override color in your CSS
:root {
  --primary-color: #1e40af;  /* Change primary button color */
  --error-color: #dc2626;     /* Change error color */
  --success-color: #16a34a;   /* Change success color */
}

// Custom styling
.recovery-management {
  max-width: 1400px;          /* Make it wider */
  font-family: 'Inter', sans-serif;  /* Different font */
}

// ============================================================================
// 9. VALIDATION EXAMPLES
// ============================================================================

import {
  validateRecoveryInput,
  validateOption,
  validatePromoInput,
} from './services/recoveryApi';

// Validate recovery input
const { isValid, errors } = validateRecoveryInput('ORD-123', 'CUST-456');
if (!isValid) {
  console.log('Errors:', errors);  // { orderId: '', customerId: '' }
}

// Validate option
const optionValidation = validateOption({
  productId: 'PROD-123',
  type: 'replacement',
  price_override: 99.99,
});

// Validate promo
const promoValidation = validatePromoInput(25);
if (!promoValidation.isValid) {
  console.log('Error:', promoValidation.errors);
}

// ============================================================================
// 10. DEBUGGING TECHNIQUES
// ============================================================================

// Method 1: Log state changes
const state = useRecoveryStore((s) => ({
  currentRecoveryId: s.currentRecoveryId,
  token: s.token,
  options: s.options,
}));

useEffect(() => {
  console.log('Recovery state:', state);
}, [state]);

// Method 2: Check store directly
useRecoveryStore.subscribe(
  (state) => console.log('New state:', state),
  (state) => state.currentRecoveryId
);

// Method 3: Add breakpoints
function MyComponent() {
  const state = useRecoveryStore();
  debugger;  // Pause here in DevTools
  return <div>{state.currentRecoveryId}</div>;
}

// Method 4: Network debugging
fetch('https://api.yourdomain.com/api/v1/recovery/admin/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('jwtToken'),
  },
  body: JSON.stringify({
    orderId: 'TEST-123',
    customerId: 'TEST-456',
  }),
})
  .then((res) => res.json())
  .then((data) => console.log('Response:', data))
  .catch((err) => console.error('Error:', err));

// ============================================================================
// 11. PRODUCTION DEPLOYMENT CHECKLIST
// ============================================================================

/*
Before deploying to production:

Security
  [ ] JWT token stored securely (httpOnly cookie recommended)
  [ ] API URL uses HTTPS
  [ ] No hardcoded passwords/tokens
  [ ] CORS configured properly

Performance
  [ ] Code minified and bundled
  [ ] CSS minified
  [ ] Images optimized
  [ ] No console.log statements left

Testing
  [ ] All features tested in browser
  [ ] Mobile responsiveness checked
  [ ] Error scenarios tested
  [ ] API endpoints verified

Documentation
  [ ] README up to date
  [ ] Integration guide shared
  [ ] Support contacts identified
  [ ] Runbook created

Monitoring
  [ ] Error tracking enabled (Sentry/etc)
  [ ] Performance monitoring active
  [ ] User analytics configured
  [ ] Alerting rules set up
*/

// ============================================================================
// 12. PERFORMANCE TIPS
// ============================================================================

/*
1. Lazy load the module
   const RecoveryManagement = lazy(() =>
     import('./components/RecoveryManagement')
   );

2. Optimize API calls
   - Cache results when possible
   - Batch requests if backend supports
   - Use debouncing for search

3. Optimize rendering
   - Use Zustand selectors (avoid full state)
   - Memoize components if needed
   - Check DevTools Profiler for slow renders

4. Bundle optimization
   - Tree-shake unused code
   - Use production builds
   - Compress with gzip

5. Network optimization
   - Enable HTTP/2
   - Use CDN for static assets
   - Implement service worker for offline
*/

// ============================================================================
// 13. ACCESSIBILITY TIPS
// ============================================================================

/*
The module includes:
  ✓ Semantic HTML
  ✓ ARIA labels
  ✓ Keyboard navigation
  ✓ Color contrast compliance
  ✓ Focus management

Test with:
  - Screen readers (NVDA, JAWS)
  - Keyboard only (Tab, Enter, Escape)
  - Browser zoom (200%)
  - Color blindness simulator
*/

// ============================================================================
// 14. USEFUL LINKS
// ============================================================================

/*
Documentation Files:
  - README.md - Overview and quick start
  - INTEGRATION_GUIDE.js - Detailed integration
  - EXAMPLES.jsx - 10 usage examples
  - IMPLEMENTATION_SUMMARY.md - Complete overview
  - QUICK_REFERENCE.js - This file

Dependencies:
  - Zustand: https://zustand-demo.vercel.app
  - React: https://react.dev
  - MDN Web Docs: https://developer.mozilla.org

API Reference:
  - See /api/v1/recovery endpoints in backend
  - Check OpenAPI/Swagger docs if available
*/

// ============================================================================
// 15. EXAMPLE WORKFLOW
// ============================================================================

/*
COMPLETE WORKFLOW EXAMPLE:

Step 1: Import
  import { RecoveryManagement } from './components/RecoveryManagement';

Step 2: Add to component
  <RecoveryManagement />

Step 3: User creates recovery case
  Admin enters: Order ID = ORD-12345, Customer ID = CUST-98765
  System generates: Recovery ID and Token

Step 4: Admin adds options
  Admin adds: Product A (replacement) + Product B (upgrade)
  System confirms: 2 options added

Step 5: Admin generates promo
  Admin enters: Discount = 20%
  System generates: PROMO-2025-ABC123

Step 6: Admin shares link
  Admin copies: /recovery/[token]
  Admin sends to: Customer email

Step 7: Customer completes recovery
  Customer visits: /recovery/[token]
  Customer selects: Product + Applies promo code
  Customer completes: Purchase with discount

SUCCESS! ✓
*/

export const QUICK_REFERENCE = 'See file for fast lookup guide';
