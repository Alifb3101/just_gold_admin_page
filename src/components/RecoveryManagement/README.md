// ============================================================================
// RECOVERY MANAGEMENT MODULE - README
// ============================================================================
// 
// This is a production-grade admin panel module for managing out-of-stock
// recovery cases. It integrates with existing APIs without backend changes.
//
// ============================================================================

# Recovery Management Module

Production-grade admin panel module for managing out-of-stock recovery cases.

## Features

✅ **Create Recovery Cases** - Initiate recovery workflow with order and customer IDs
✅ **Manage Options** - Add multiple replacement/upgrade options with price overrides
✅ **Generate Promo Codes** - Create single-use discount codes automatically
✅ **View Cases** - Preview recovery case details using token-based endpoint
✅ **State Management** - Zustand-based global state with minimal re-renders
✅ **Error Handling** - Comprehensive validation and error feedback
✅ **Toast Notifications** - Real-time user feedback with auto-dismiss
✅ **Responsive Design** - Mobile-friendly UI with adaptive layouts
✅ **Production Ready** - Zero backend modifications required

## Installation

```bash
# Required dependencies
npm install zustand

# If not already installed
npm install react react-dom
```

## Quick Start

```jsx
import { RecoveryManagement } from './components/RecoveryManagement';

export default function AdminPanel() {
  return <RecoveryManagement />;
}
```

## API Endpoints Used

```
POST   /api/v1/recovery/admin/create
POST   /api/v1/recovery/:recoveryId/options
POST   /api/v1/recovery/:recoveryId/promo
GET    /api/v1/recovery/:token
```

## Module Structure

```
RecoveryManagement/
├── RecoveryManagement.jsx         ← Main container
├── CreateRecoveryCase.jsx         ← Create case form
├── AddRecoveryOptions.jsx         ← Options management
├── GeneratePromo.jsx              ← Promo generator
├── ViewRecoveryCase.jsx           ← Case viewer
├── RecoveryManagement.css         ← All styles
└── index.js                       ← Exports
```

## State Management

Uses Zustand for lightweight, efficient state:

```javascript
// Accessing state
import { useRecoveryStore } from './store/recoveryStore';

function MyComponent() {
  const { currentRecoveryId, token, options } = useRecoveryStore();
  // Component code...
}
```

## Authentication

JWT token is read from `localStorage` or `sessionStorage`:

```javascript
// Set after login
localStorage.setItem('jwtToken', token);

// Module will automatically include in headers
// Authorization: Bearer <token>
```

## Error Handling

- Inline validation errors for each field
- Error box for API failures
- Toast notifications for summarized errors
- Fallback messages for network issues

## Styling

Complete, production-ready CSS included:

- Color-coded states (success, error, warning, info)
- Responsive layouts (mobile, tablet, desktop)
- Accessibility features (ARIA, keyboard navigation)
- Dark/light theme support via CSS variables

## Performance

- Efficient state updates with Zustand selectors
- No unnecessary re-renders
- Lazy-loadable components
- Minimal dependencies

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Documentation

See `INTEGRATION_GUIDE.js` for comprehensive documentation including:
- Detailed API reference
- Component usage examples
- State management patterns
- Customization options
- Troubleshooting guide
- Production checklist

## License

Same as main project

---

**Version:** 1.0.0
**Last Updated:** 2025-05-04
