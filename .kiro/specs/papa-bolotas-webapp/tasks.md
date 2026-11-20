# Implementation Plan: Papa Bolotas Webapp

## Overview

This plan outlines the implementation of the Papa Bolotas Progressive Web Application (PWA), a cloud-enabled, offline-first POS system. The implementation follows a structured approach starting with infrastructure setup, followed by core features, synchronization, security, and deployment. The application uses React + TypeScript for the frontend, Supabase for the backend, and IndexedDB for offline storage.

## Tasks

- [ ] 1. Setup project infrastructure and base configuration
  - [x] 1.1 Initialize React + TypeScript project with Vite
    - Create new Vite project with React-TypeScript template
    - Configure `tsconfig.json` for strict type checking
    - Setup project folder structure: `/src/components`, `/src/services`, `/src/types`, `/src/hooks`, `/src/utils`
    - Install core dependencies: React, React Router, TypeScript
    - _Requirements: 16.1, 16.4, 16.7_
  
  - [x] 1.2 Configure Tailwind CSS and shadcn/ui
    - Install and configure Tailwind CSS with PostCSS
    - Setup shadcn/ui component library
    - Create base theme configuration with Papa Bolotas branding
    - Configure responsive breakpoints (mobile: 320px, tablet: 768px, desktop: 1025px)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [-] 1.3 Setup PWA configuration
    - Install `vite-plugin-pwa`
    - Configure service worker for offline functionality
    - Create `manifest.json` with app metadata and icons
    - Configure caching strategy for static assets
    - _Requirements: 3.1, 3.2, 3.6, 16.7_
  
  - [-] 1.4 Configure environment variables and build scripts
    - Create `.env.local` template for Supabase credentials
    - Add `.env.local` to `.gitignore`
    - Configure Vite to load environment variables
    - Setup build scripts for development and production
    - _Requirements: 15.10, 17.3_

- [ ] 2. Setup Supabase backend infrastructure
  - [x] 2.1 Create Supabase project and configure database schema
    - Create new Supabase project
    - Execute SQL migrations for all tables: `users`, `menu_items`, `orders`, `order_items`, `sessions`, `stock_adjustments`, `audit_logs`, `sync_metadata`
    - Add indexes for performance optimization
    - Create database triggers for `updated_at` timestamps
    - _Requirements: 17.1, 17.2, 17.4_
  
  - [x] 2.2 Configure Row Level Security (RLS) policies
    - Enable RLS on all tables
    - Create policies for authenticated user access
    - Create policies for user-specific data isolation
    - Test RLS policies with different user scenarios
    - _Requirements: 17.4, 15.2_
  
  - [x] 2.3 Setup Supabase Authentication
    - Configure Supabase Auth with email/password provider
    - Create initial admin user
    - Configure session timeout (12 hours inactivity)
    - Setup password complexity requirements
    - _Requirements: 1.1, 1.2, 1.7, 1.8, 15.7_
  
  - [-] 2.4 Initialize Supabase client in React application
    - Install `@supabase/supabase-js`
    - Create Supabase client instance with environment variables
    - Configure client for real-time subscriptions
    - Create connection health check utility
    - _Requirements: 17.3, 17.8_

- [ ] 3. Setup local storage and offline infrastructure
  - [x] 3.1 Configure IndexedDB with Dexie.js
    - Install Dexie.js
    - Define database schema matching Supabase tables
    - Create database version migrations
    - Implement database initialization function
    - _Requirements: 3.3, 14.2_
  
  - [-] 3.2 Create local repository layer for offline data access
    - Implement `LocalRepository` class with CRUD operations
    - Create methods for menu items, orders, sessions, stock levels
    - Add transaction support for atomic operations
    - Implement query methods with filtering and sorting
    - _Requirements: 3.3, 3.6, 14.2_
  
  - [x] 3.3 Setup online/offline detection and status management
    - Create `useOnlineStatus` hook using `navigator.onLine`
    - Listen to `online` and `offline` events
    - Implement visual indicator for connection status
    - Store connection state in Zustand store
    - _Requirements: 3.1, 3.2, 3.5_

- [x] 4. Implement type definitions and data models
  - [x] 4.1 Define core TypeScript interfaces and types
    - Create types for `User`, `MenuItem`, `Order`, `OrderItem`, `Session`, `StockLevel`, `Category`
    - Define enums for order status, sync status, adjustment types
    - Create type guards for runtime validation
    - Export all types from central `types/index.ts`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 4.2 Create validation schemas with Zod
    - Install Zod validation library
    - Define schemas for menu items (price > 0, name non-empty)
    - Define schemas for orders, stock adjustments
    - Create validation utilities for form inputs
    - _Requirements: 4.3, 8.4, 15.8_

- [ ] 5. Implement authentication system
  - [x] 5.1 Create authentication service
    - Implement `AuthService` with `login`, `logout`, `getCurrentUser` methods
    - Handle Supabase authentication flow
    - Implement session validation and refresh
    - Add error handling for auth failures
    - _Requirements: 1.2, 1.3, 1.4, 1.6_
  
  - [-] 5.2 Build login form component
    - Create `LoginForm` component with username/password fields
    - Implement form validation (min 8 chars, alphanumeric)
    - Add loading states and error display
    - Handle successful authentication redirect
    - _Requirements: 1.1, 1.2, 1.4, 1.8_
  
  - [-] 5.3 Implement protected route wrapper
    - Create `ProtectedRoute` component
    - Check authentication state on route access
    - Redirect to login if unauthenticated
    - Persist intended destination for post-login redirect
    - _Requirements: 1.3, 1.5_
  
  - [x] 5.4 Create authentication context and hooks
    - Implement React Context for auth state
    - Create `useAuth` hook for accessing auth state
    - Implement automatic session refresh
    - Add logout functionality clearing all state
    - _Requirements: 1.5, 1.6, 15.7_

- [x] 6. Checkpoint - Verify authentication and base infrastructure
  - Ensure all tests pass, verify login flow works, check environment variables are properly configured, ask the user if questions arise.

- [x] 7. Implement menu management features
  - [x] 7.1 Create menu service layer
    - Implement `MenuService` with CRUD operations
    - Add methods for category filtering
    - Implement both online (Supabase) and offline (IndexedDB) operations
    - Add proper error handling and retries
    - _Requirements: 4.1, 4.2, 4.8_
  
  - [x] 7.2 Build menu grid display component
    - Create `MenuGrid` component showing items by category
    - Implement responsive grid layout (1/2/3 columns based on screen size)
    - Add category filter component
    - Display item name, price, and stock level
    - _Requirements: 2.1, 2.2, 2.3, 4.8_
  
  - [x] 7.3 Implement menu item editor component
    - Create `MenuItemEditor` form component
    - Add fields for name, category, price, initial stock
    - Implement validation (price > 0, required fields)
    - Support both create and edit modes
    - _Requirements: 4.2, 4.3, 4.6_
  
  - [x] 7.4 Write unit tests for menu service
    - Test CRUD operations with mock data
    - Test category filtering logic
    - Test error handling scenarios
    - Test validation rules
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 8. Implement order processing system
  - [x] 8.1 Create order service layer
    - Implement `OrderService` with create, register, cancel methods
    - Add sequential order numbering logic
    - Implement stock decrement on order registration
    - Add complimentary order support (total = 0)
    - _Requirements: 5.1, 5.7, 5.9, 6.1, 6.2_
  
  - [-] 8.2 Build order panel component
    - Create `OrderPanel` with item selection and current order display
    - Show running total calculation
    - Add observations text input
    - Implement add/remove item functionality
    - Add clear order button
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 8.3 Implement order registration flow
    - Add "Register Order" and "Register Complimentary" buttons
    - Assign sequential order number
    - Record timestamp and session ID
    - Call stock service to decrement quantities
    - Clear order panel after successful registration
    - _Requirements: 5.7, 5.8, 5.9, 6.2, 6.3_
  
  - [x] 8.4 Create order history component
    - Build `OrderHistory` showing completed orders for current session
    - Display order number, time, total, items
    - Mark complimentary orders distinctly
    - Show cancelled orders with strikethrough
    - Add refresh functionality
    - _Requirements: 5.11, 6.4_
  
  - [x] 8.5 Write unit tests for order service
    - Test order creation and registration
    - Test sequential numbering
    - Test complimentary order logic (total = 0)
    - Test stock decrement integration
    - _Requirements: 5.1, 5.7, 5.9, 6.2_

- [ ] 9. Implement order cancellation with security
  - [x] 9.1 Create order cancellation service
    - Implement `cancelOrder` method with security code validation
    - Add stock restoration logic
    - Mark order as cancelled (don't delete)
    - Set cancelled order total to 0
    - _Requirements: 7.3, 7.5, 7.6, 7.7_
  
  - [x] 9.2 Build security code verification UI
    - Create modal dialog for security code entry
    - Validate numeric code format
    - Display error message on incorrect code
    - Show cancellable orders list after validation
    - _Requirements: 7.2, 7.3, 7.4_
  
  - [-] 9.3 Implement order cancellation UI
    - Add cancel button to order history items
    - Trigger security code verification flow
    - Call cancellation service on confirmation
    - Update UI to show cancelled status
    - Generate cancellation receipt
    - _Requirements: 7.1, 7.4, 7.7, 7.8_
  
  - [-] 9.4 Write unit tests for cancellation logic
    - Test security code validation
    - Test stock restoration
    - Test cancelled order exclusion from revenue
    - Test cancellation receipt generation
    - _Requirements: 7.3, 7.5, 7.6, 7.9_

- [x] 10. Implement stock management system
  - [x] 10.1 Create stock service layer
    - Implement `StockService` with get, adjust, decrement, increment methods
    - Add `recordLoss` method for breakage tracking
    - Implement stock validation (non-negative integers)
    - Add automatic stock adjustments on order/cancellation
    - _Requirements: 8.1, 8.3, 8.4, 8.6, 8.7_
  
  - [x] 10.2 Build stock dashboard component
    - Create `StockDashboard` displaying all items with stock levels
    - Add low stock warning indicators (stock = 0)
    - Implement sorting and filtering
    - Show real-time stock updates
    - _Requirements: 8.2, 8.5_
  
  - [x] 10.3 Implement stock adjustment form
    - Create `StockAdjustmentForm` component
    - Add quantity input with validation (non-negative integer)
    - Implement immediate stock update on save
    - Display confirmation message
    - _Requirements: 8.3, 8.4_
  
  - [x] 10.4 Build loss and breakage recording form
    - Create `LossRecordForm` component
    - Add quantity input with validation (positive integer)
    - Show warning if quantity exceeds current stock
    - Require confirmation for over-stock losses
    - Log loss event with timestamp
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [x] 10.5 Write unit tests for stock service
    - Test manual adjustments
    - Test automatic decrements on order
    - Test automatic increments on cancellation
    - Test loss recording validation
    - _Requirements: 8.3, 8.6, 8.7, 9.5_

- [x] 11. Checkpoint - Verify core POS functionality
  - Ensure all tests pass, verify orders can be created and cancelled, check stock updates correctly, ask the user if questions arise.

- [x] 12. Implement session management
  - [x] 12.1 Create session service layer
    - Implement `SessionService` with start, end, get methods
    - Auto-create session on user login
    - Associate all orders with current session
    - Calculate session statistics (revenue, order counts)
    - _Requirements: 19.1, 19.2, 19.3, 19.8_
  
  - [x] 12.2 Build session status display component
    - Show current session start time
    - Display session duration (auto-updating)
    - Show running order count and revenue
    - Display connection status indicator
    - _Requirements: 19.4, 3.5_
  
  - [x] 12.3 Implement cash register closure flow
    - Create `CashRegisterClosure` component
    - Display expected cash from orders
    - Add actual cash count input
    - Calculate and show discrepancy
    - Save session record on confirmation
    - Reset order counter for next session
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_
  
  - [x] 12.4 Write unit tests for session service
    - Test session creation on login
    - Test order association with session
    - Test revenue calculation excluding cancelled/complimentary
    - Test session finalization
    - _Requirements: 19.1, 19.3, 19.8_

- [x] 13. Implement sales reporting
  - [x] 13.1 Create sales report service
    - Implement report generation for current session
    - Calculate total revenue (excluding cancelled/complimentary)
    - Count orders by type (completed, complimentary, cancelled)
    - Generate item breakdown with quantities and subtotals
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [x] 13.2 Build sales report display component
    - Create `SalesReport` component with session statistics
    - Display revenue, order counts by type
    - Show item sales breakdown table
    - Display session start time and duration
    - Add real-time updates as orders are processed
    - _Requirements: 10.1, 10.2, 10.6, 10.7, 10.8_
  
  - [x] 13.3 Write unit tests for report calculations
    - Test revenue calculation logic
    - Test order counting by type
    - Test item breakdown aggregation
    - Test exclusion of cancelled/complimentary from revenue
    - _Requirements: 10.2, 10.3, 10.4, 10.5_

- [x] 14. Implement receipt generation
  - [x] 14.1 Create receipt generation service
    - Implement `generateReceipt` method
    - Format receipt with 32-character width for thermal printers
    - Include restaurant name, order details, timestamp
    - Add "OFERTA" indicator for complimentary orders
    - Generate cancellation receipts
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_
  
  - [x] 14.2 Build receipt preview component
    - Create `ReceiptPreview` component with formatted receipt display
    - Add print button triggering browser print dialog
    - Support thermal printer format
    - Show different layout for complimentary orders
    - _Requirements: 12.9, 12.10_
  
  - [x] 14.3 Write unit tests for receipt formatting
    - Test receipt content inclusion
    - Test complimentary order formatting
    - Test cancellation receipt generation
    - Test 32-character width formatting
    - _Requirements: 12.2, 12.3, 12.7, 12.8_

- [x] 15. Implement PDF price list generation
  - [x] 15.1 Create price list PDF generation service
    - Install `jspdf` library
    - Implement PDF generation with menu items by category
    - Format for A4 paper size
    - Add generation date and restaurant name
    - Use clear typography and layout
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_
  
  - [x] 15.2 Build price list export component
    - Create button to trigger PDF generation
    - Show generation progress indicator
    - Trigger PDF download on completion
    - Handle generation errors gracefully
    - _Requirements: 13.7_
  
  - [x] 15.3 Write unit tests for PDF generation
    - Test PDF content inclusion
    - Test category organization
    - Test A4 format configuration
    - _Requirements: 13.2, 13.3, 13.4_

- [x] 16. Implement synchronization engine
  - [x] 16.1 Create sync queue for offline changes
    - Implement persistent queue in IndexedDB
    - Add operations with entity type, operation (create/update/delete), data
    - Implement queue status tracking (pending, synced, failed)
    - Add retry logic with exponential backoff
    - _Requirements: 14.4, 14.5, 14.6_
  
  - [x] 16.2 Build sync service orchestration
    - Implement `SyncService` coordinating online/offline operations
    - Add `syncNow` method processing entire queue
    - Implement automatic sync on connection restore
    - Add sync state change notifications
    - _Requirements: 3.4, 14.4, 14.5_
  
  - [x] 16.3 Implement conflict resolution strategy
    - Add last-write-wins conflict resolution
    - Compare version numbers on conflicts
    - Log conflicts to audit trail
    - Notify user of conflict resolutions
    - _Requirements: 3.7, 14.7_
  
  - [x] 16.4 Create real-time data subscription
    - Subscribe to Supabase real-time channels
    - Listen for remote changes from other devices
    - Update local IndexedDB on remote changes
    - Implement change notifications in UI
    - _Requirements: 17.8, 3.8_
  
  - [x] 16.5 Build sync status indicator component
    - Display sync state (synced, syncing, pending, error)
    - Show pending change count
    - Add manual sync trigger button
    - Display last sync timestamp
    - _Requirements: 3.8, 14.8_
  
  - [x] 16.6 Write integration tests for synchronization
    - Test offline operation and queue persistence
    - Test sync on reconnection
    - Test conflict resolution
    - Test real-time updates from server
    - _Requirements: 3.4, 14.4, 3.7_

- [x] 17. Checkpoint - Verify synchronization works correctly
  - Ensure all tests pass, verify offline changes sync when online, check conflict resolution works, ask the user if questions arise.

- [x] 18. Implement audit logging system
  - [x] 18.1 Create audit log service
    - Implement audit logging for authentication events
    - Log order operations (create, register, cancel)
    - Log stock adjustments with user and timestamp
    - Log menu item changes
    - Log sync events and security events
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_
  
  - [x] 18.2 Build audit log viewer component
    - Create admin interface for viewing logs
    - Add filtering by event type, date range, user
    - Display log details with timestamp and user
    - Implement pagination for large log sets
    - _Requirements: 20.8_
  
  - [x] 18.3 Write unit tests for audit logging
    - Test log creation on various events
    - Test log retention (90 days minimum)
    - Test filtering and querying logs
    - _Requirements: 20.1, 20.2, 20.3, 20.9_

- [x] 19. Implement security hardening
  - [x] 19.1 Add input validation and sanitization
    - Implement XSS protection with input sanitization
    - Validate all numeric inputs (prices, quantities, stock levels)
    - Sanitize text inputs (names, observations)
    - Add CSRF token support for state-changing operations
    - _Requirements: 15.3, 15.4, 15.8_
  
  - [x] 19.2 Configure security headers
    - Add Content Security Policy headers
    - Configure HTTPS-only cookies
    - Add X-Frame-Options header
    - Configure secure session storage
    - _Requirements: 15.1, 15.9_
  
  - [x] 19.3 Implement rate limiting for authentication
    - Add rate limiting on login endpoint (max 5 attempts per minute)
    - Lock account after 10 failed attempts
    - Log all failed authentication attempts
    - _Requirements: 15.5, 15.6_
  
  - [x] 19.4 Write security tests
    - Test SQL injection protection
    - Test XSS protection
    - Test CSRF protection
    - Test rate limiting
    - _Requirements: 15.2, 15.3, 15.4, 15.5_

- [x] 20. Implement data migration from desktop app
  - [x] 20.1 Create data import service
    - Implement JSON parser for `menu_artigos.json`
    - Implement JSON parser for `stock_artigos.json`
    - Map desktop categories to webapp categories
    - Validate imported data (prices > 0, stock >= 0)
    - _Requirements: 18.2, 18.3, 18.4, 18.8_
  
  - [x] 20.2 Build data import UI component
    - Create import interface with file upload
    - Show validation results before import
    - Display import progress
    - Show summary of imported records (success/failed)
    - Handle errors gracefully with detailed messages
    - _Requirements: 18.1, 18.5, 18.6_
  
  - [x] 20.3 Preserve Portuguese characters in import
    - Configure UTF-8 encoding for JSON parsing
    - Test with Portuguese characters (ã, õ, ç, á, é, í, ó, ú)
    - Validate character preservation in database
    - _Requirements: 4.6, 18.7_
  
  - [x] 20.4 Write integration tests for data migration
    - Test successful import of valid data
    - Test validation of invalid data
    - Test Portuguese character preservation
    - Test category mapping
    - _Requirements: 18.2, 18.3, 18.7, 18.8_

- [x] 21. Implement responsive UI and accessibility
  - [x] 21.1 Create responsive layout components
    - Implement responsive navigation (drawer on mobile, sidebar on desktop)
    - Create responsive grid layouts for menu and stock views
    - Ensure touch targets are minimum 44x44px
    - Test all layouts on mobile (320px), tablet (768px), desktop (1025px+)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_
  
  - [x] 21.2 Implement responsive typography and spacing
    - Configure responsive font scales
    - Adjust spacing for different screen sizes
    - Ensure readability on all devices
    - Support portrait and landscape orientations
    - _Requirements: 2.5, 2.7_
  
  - [x] 21.3 Write responsive design tests
    - Test layout on different viewport sizes
    - Test touch target sizes on mobile
    - Test orientation changes
    - _Requirements: 2.1, 2.6, 2.7_

- [x] 22. Setup deployment infrastructure
  - [x] 22.1 Configure hosting platform (Netlify/Vercel)
    - Create account and project on chosen platform
    - Connect Git repository for automatic deployment
    - Configure build command and output directory
    - Setup environment variables on platform
    - _Requirements: 16.1, 16.4, 16.8_
  
  - [x] 22.2 Configure custom domain and HTTPS
    - Setup custom domain DNS records
    - Enable automatic HTTPS certificate
    - Configure domain redirects (www to non-www)
    - Test HTTPS enforcement
    - _Requirements: 16.2, 16.3, 15.1_
  
  - [x] 22.3 Implement caching and performance optimization
    - Configure static asset caching headers
    - Enable CDN for global distribution
    - Optimize bundle size with code splitting
    - Configure service worker caching strategy
    - _Requirements: 16.7, 16.6_
  
  - [x] 22.4 Setup deployment rollback and monitoring
    - Test rollback to previous deployment
    - Configure uptime monitoring
    - Setup error tracking (optional: Sentry integration)
    - Document deployment process
    - _Requirements: 16.8, 16.5_

- [x] 23. Implement end-to-end testing
  - [x] 23.1 Setup E2E testing framework (Playwright/Cypress)
    - Install and configure E2E testing framework
    - Create test environment with test database
    - Setup test data seeding
    - Configure CI/CD pipeline for E2E tests
  
  - [x] 23.2 Write critical user flow E2E tests
    - Test complete order flow: login → add items → register order → print receipt
    - Test order cancellation with security code
    - Test stock adjustment and synchronization
    - Test offline mode and sync on reconnection
    - _Requirements: 5.1-5.11, 7.1-7.9, 8.1-8.8, 3.1-3.8_
  
  - [x] 23.3 Write session management E2E tests
    - Test full session lifecycle: login → process orders → close register → logout
    - Test multiple concurrent sessions
    - Test session persistence across page refreshes
    - _Requirements: 19.1-19.8, 11.1-11.8_

- [x] 24. Final integration and deployment
  - [x] 24.1 Perform final integration testing
    - Test all features in production-like environment
    - Verify all requirements are met
    - Test with real-world data from desktop app
    - Perform security audit
    - _Requirements: All_
  
  - [x] 24.2 Create user documentation
    - Write user guide for POS operations
    - Document administrative tasks (menu management, stock, reports)
    - Create troubleshooting guide for common issues
    - Document data migration process
  
  - [x] 24.3 Deploy to production
    - Perform final production deployment
    - Verify all environment variables are set
    - Test production deployment thoroughly
    - Monitor for errors in first 24 hours
    - _Requirements: 16.1, 16.4, 16.5_
  
  - [x] 24.4 Execute data migration from desktop app
    - Backup existing desktop data
    - Run data import using migration tool
    - Verify all data imported correctly
    - Validate Portuguese characters and prices
    - _Requirements: 18.1-18.8_

- [x] 25. Final checkpoint - Production verification
  - Ensure all tests pass, verify production deployment is stable, confirm all features work correctly, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Core implementation tasks are mandatory and must be completed in order
- The project uses **TypeScript** with React for type-safe development
- Supabase provides unified backend (PostgreSQL, Auth, Real-time)
- IndexedDB with Dexie.js handles offline persistence
- Zustand manages UI and sync state
- Testing tasks validate functionality but can be deferred if time-constrained
- Each checkpoint provides opportunity to validate progress and address issues
- Property-based testing is not applicable for this UI/infrastructure-heavy webapp
- Portuguese language support is critical for menu items and UI text
- Security measures must be implemented before production deployment

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1"]
    },
    {
      "id": 1,
      "tasks": ["1.2", "1.3", "1.4", "2.1"]
    },
    {
      "id": 2,
      "tasks": ["2.2", "2.3", "3.1", "4.1"]
    },
    {
      "id": 3,
      "tasks": ["2.4", "3.2", "4.2"]
    },
    {
      "id": 4,
      "tasks": ["3.3", "5.1"]
    },
    {
      "id": 5,
      "tasks": ["5.2", "5.3", "5.4"]
    },
    {
      "id": 6,
      "tasks": ["7.1"]
    },
    {
      "id": 7,
      "tasks": ["7.2", "7.3", "7.4"]
    },
    {
      "id": 8,
      "tasks": ["8.1"]
    },
    {
      "id": 9,
      "tasks": ["8.2", "8.3"]
    },
    {
      "id": 10,
      "tasks": ["8.4", "8.5"]
    },
    {
      "id": 11,
      "tasks": ["9.1"]
    },
    {
      "id": 12,
      "tasks": ["9.2", "9.3", "9.4"]
    },
    {
      "id": 13,
      "tasks": ["10.1"]
    },
    {
      "id": 14,
      "tasks": ["10.2", "10.3", "10.4", "10.5"]
    },
    {
      "id": 15,
      "tasks": ["12.1"]
    },
    {
      "id": 16,
      "tasks": ["12.2", "12.3", "12.4"]
    },
    {
      "id": 17,
      "tasks": ["13.1"]
    },
    {
      "id": 18,
      "tasks": ["13.2", "13.3"]
    },
    {
      "id": 19,
      "tasks": ["14.1"]
    },
    {
      "id": 20,
      "tasks": ["14.2", "14.3"]
    },
    {
      "id": 21,
      "tasks": ["15.1"]
    },
    {
      "id": 22,
      "tasks": ["15.2", "15.3"]
    },
    {
      "id": 23,
      "tasks": ["16.1"]
    },
    {
      "id": 24,
      "tasks": ["16.2", "16.3"]
    },
    {
      "id": 25,
      "tasks": ["16.4", "16.5", "16.6"]
    },
    {
      "id": 26,
      "tasks": ["18.1"]
    },
    {
      "id": 27,
      "tasks": ["18.2", "18.3"]
    },
    {
      "id": 28,
      "tasks": ["19.1", "19.2"]
    },
    {
      "id": 29,
      "tasks": ["19.3", "19.4"]
    },
    {
      "id": 30,
      "tasks": ["20.1"]
    },
    {
      "id": 31,
      "tasks": ["20.2", "20.3", "20.4"]
    },
    {
      "id": 32,
      "tasks": ["21.1", "21.2"]
    },
    {
      "id": 33,
      "tasks": ["21.3"]
    },
    {
      "id": 34,
      "tasks": ["22.1"]
    },
    {
      "id": 35,
      "tasks": ["22.2", "22.3", "22.4"]
    },
    {
      "id": 36,
      "tasks": ["23.1"]
    },
    {
      "id": 37,
      "tasks": ["23.2", "23.3"]
    },
    {
      "id": 38,
      "tasks": ["24.1"]
    },
    {
      "id": 39,
      "tasks": ["24.2", "24.3"]
    },
    {
      "id": 40,
      "tasks": ["24.4"]
    }
  ]
}
```
