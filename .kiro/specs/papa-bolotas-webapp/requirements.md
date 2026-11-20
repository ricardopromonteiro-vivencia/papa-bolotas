# Requirements Document

## Introduction

This document specifies the requirements for converting the Papa Bolotas desktop POS (Point of Sale) application into a modern, responsive web application. The webapp will support both online and offline operation modes, provide secure authentication, and maintain feature parity with the existing desktop system while adding cloud synchronization capabilities.

## Glossary

- **Webapp**: The web-based application accessible through browsers on desktop, tablet, and mobile devices
- **POS_System**: The point-of-sale system managing orders, inventory, and sales
- **Admin_User**: Authenticated user with full system access and administrative privileges
- **Online_Mode**: Application state with active internet connection and database synchronization
- **Offline_Mode**: Application state without internet connection using local storage
- **Order**: A customer purchase consisting of menu items with total price and timestamp
- **Menu_Item**: A product available for sale with name, category, price, and stock quantity
- **Stock_Level**: The current quantity available for a specific menu item
- **Session**: A work period from login to cash register closure
- **Receipt**: Printed or digital record of an order
- **Supabase_DB**: Cloud PostgreSQL database service for online data persistence
- **IndexedDB**: Browser-based local database for offline data storage
- **Sync_Engine**: Component responsible for synchronizing offline changes with online database
- **Security_Code**: Numeric code required for sensitive operations like order cancellation
- **Hosting_Platform**: Cloud service hosting the webapp (Netlify, Railway, or equivalent)

## Requirements

### Requirement 1: User Authentication

**User Story:** As a restaurant administrator, I want mandatory authentication to access the POS system, so that only authorized personnel can process orders and manage inventory.

#### Acceptance Criteria

1. WHEN the Webapp loads, THE POS_System SHALL display a login screen
2. THE POS_System SHALL require username and password credentials
3. WHEN valid credentials are provided, THE POS_System SHALL authenticate the Admin_User and grant access
4. WHEN invalid credentials are provided, THE POS_System SHALL display an error message and deny access
5. THE POS_System SHALL maintain authentication state during the entire Session
6. WHEN the Admin_User logs out, THE POS_System SHALL clear authentication state and return to login screen
7. THE POS_System SHALL implement secure password hashing using industry-standard algorithms
8. THE POS_System SHALL enforce password complexity requirements (minimum 8 characters, alphanumeric)

### Requirement 2: Responsive User Interface

**User Story:** As a user, I want the application to work seamlessly on desktop, tablet, and mobile devices, so that I can use the POS system on any available device.

#### Acceptance Criteria

1. THE Webapp SHALL render correctly on screen widths from 320px to 2560px
2. WHEN accessed on mobile devices (320px-767px), THE Webapp SHALL display a single-column layout
3. WHEN accessed on tablets (768px-1024px), THE Webapp SHALL display an optimized two-column layout
4. WHEN accessed on desktop (1025px+), THE Webapp SHALL display the full multi-column layout
5. THE Webapp SHALL use responsive typography that scales appropriately for each device size
6. THE Webapp SHALL ensure touch targets are minimum 44x44 pixels on touch devices
7. THE Webapp SHALL support both portrait and landscape orientations

### Requirement 3: Online and Offline Operation

**User Story:** As a restaurant operator, I want the system to work even without internet connection, so that service is never interrupted by connectivity issues.

#### Acceptance Criteria

1. WHEN internet connection is available, THE POS_System SHALL operate in Online_Mode
2. WHEN internet connection is unavailable, THE POS_System SHALL automatically switch to Offline_Mode
3. WHILE in Offline_Mode, THE POS_System SHALL store all data in IndexedDB
4. WHEN Online_Mode is restored, THE Sync_Engine SHALL synchronize all offline changes to Supabase_DB
5. THE POS_System SHALL display the current connection status (online/offline) to the Admin_User
6. WHILE in Offline_Mode, THE POS_System SHALL maintain full functional capabilities except cloud-dependent features
7. THE Sync_Engine SHALL resolve conflicts between offline and online data using last-write-wins strategy
8. WHEN synchronization completes, THE POS_System SHALL notify the Admin_User of sync status

### Requirement 4: Menu Management

**User Story:** As a restaurant manager, I want to manage menu items including adding, editing, and categorizing products, so that the menu reflects current offerings and prices.

#### Acceptance Criteria

1. THE POS_System SHALL organize Menu_Items into categories (Sandes, Tábuas, Batatas, Doces, Bebidas)
2. WHEN the Admin_User adds a new Menu_Item, THE POS_System SHALL require item name, category, price, and initial Stock_Level
3. THE POS_System SHALL validate that Menu_Item price is a positive decimal number
4. WHEN the Admin_User updates a Menu_Item price, THE POS_System SHALL apply the change immediately to future orders
5. THE POS_System SHALL preserve existing Menu_Items from the desktop application during migration
6. THE POS_System SHALL support Menu_Item names with special characters (accents, symbols)
7. WHEN a Menu_Item is added or modified, THE Sync_Engine SHALL propagate changes to Supabase_DB in Online_Mode
8. THE POS_System SHALL display Menu_Items grouped by category in the order interface

### Requirement 5: Order Processing

**User Story:** As a server, I want to create customer orders by selecting menu items and generating receipts, so that I can efficiently process sales.

#### Acceptance Criteria

1. WHEN the Admin_User selects a Menu_Item, THE POS_System SHALL add it to the current Order
2. THE POS_System SHALL display all items in the current Order with individual prices
3. THE POS_System SHALL calculate and display the Order total automatically
4. WHEN the Admin_User adds an observation, THE POS_System SHALL include it in the Order record
5. THE POS_System SHALL support removing individual items from the current Order
6. THE POS_System SHALL allow clearing all items from the current Order
7. WHEN the Admin_User registers an Order, THE POS_System SHALL assign a sequential order number
8. WHEN the Admin_User registers an Order, THE POS_System SHALL record the timestamp
9. WHEN the Admin_User registers an Order, THE POS_System SHALL decrement Stock_Level for each Menu_Item
10. THE POS_System SHALL generate a printable Receipt for each registered Order
11. THE POS_System SHALL maintain an Order history with all completed orders for the Session

### Requirement 6: Complimentary Orders

**User Story:** As a manager, I want to register complimentary orders at zero cost, so that I can track offered items while maintaining accurate inventory.

#### Acceptance Criteria

1. THE POS_System SHALL provide a separate action for registering complimentary orders
2. WHEN a complimentary Order is registered, THE POS_System SHALL set the total price to 0.00€
3. WHEN a complimentary Order is registered, THE POS_System SHALL decrement Stock_Level for each Menu_Item
4. THE POS_System SHALL mark complimentary orders distinctly in Order history
5. THE POS_System SHALL generate a Receipt for complimentary orders indicating zero charge
6. THE POS_System SHALL exclude complimentary orders from revenue calculations

### Requirement 7: Order Cancellation

**User Story:** As a manager, I want to cancel incorrect orders with security verification, so that mistakes can be corrected while preventing unauthorized cancellations.

#### Acceptance Criteria

1. THE POS_System SHALL provide an order cancellation function for completed orders
2. WHEN the Admin_User attempts to cancel an Order, THE POS_System SHALL request the Security_Code
3. IF the Security_Code is incorrect, THEN THE POS_System SHALL deny the cancellation and display an error message
4. WHEN a valid Security_Code is provided, THE POS_System SHALL display a list of cancellable orders
5. WHEN an Order is cancelled, THE POS_System SHALL restore Stock_Level for each Menu_Item in the Order
6. WHEN an Order is cancelled, THE POS_System SHALL set the Order total to 0.00€
7. WHEN an Order is cancelled, THE POS_System SHALL mark the Order as cancelled in Order history
8. THE POS_System SHALL generate a cancellation Receipt documenting the reversed Order
9. THE POS_System SHALL exclude cancelled orders from revenue calculations

### Requirement 8: Stock Management

**User Story:** As an inventory manager, I want to track and adjust stock levels for all menu items, so that I maintain accurate inventory records.

#### Acceptance Criteria

1. THE POS_System SHALL maintain a Stock_Level for each Menu_Item
2. THE POS_System SHALL display current Stock_Level for all Menu_Items in the inventory interface
3. WHEN the Admin_User manually adjusts a Stock_Level, THE POS_System SHALL update the stored quantity
4. THE POS_System SHALL allow setting Stock_Level to any non-negative integer value
5. WHEN a Menu_Item Stock_Level reaches zero, THE POS_System SHALL allow continued ordering but display a low-stock warning
6. THE POS_System SHALL automatically decrement Stock_Level when orders are registered
7. THE POS_System SHALL automatically increment Stock_Level when orders are cancelled
8. WHEN Stock_Level is modified, THE Sync_Engine SHALL synchronize the change to Supabase_DB in Online_Mode

### Requirement 9: Loss and Breakage Recording

**User Story:** As an inventory manager, I want to record product losses and breakages, so that stock levels accurately reflect actual inventory.

#### Acceptance Criteria

1. THE POS_System SHALL provide a function to record inventory losses
2. WHEN the Admin_User records a loss, THE POS_System SHALL require selecting a Menu_Item and quantity
3. THE POS_System SHALL validate that loss quantity is a positive integer
4. IF loss quantity exceeds current Stock_Level, THEN THE POS_System SHALL display a warning and request confirmation
5. WHEN a loss is confirmed, THE POS_System SHALL decrement the Stock_Level by the specified quantity
6. THE POS_System SHALL log each loss event with timestamp, Menu_Item, and quantity
7. WHEN a loss is recorded, THE Sync_Engine SHALL synchronize the change to Supabase_DB in Online_Mode

### Requirement 10: Sales Reports

**User Story:** As a manager, I want to view sales reports for the current session, so that I can monitor business performance.

#### Acceptance Criteria

1. THE POS_System SHALL generate a sales report for the current Session
2. THE POS_System SHALL display total revenue excluding complimentary and cancelled orders
3. THE POS_System SHALL display the number of completed orders
4. THE POS_System SHALL display the number of complimentary orders
5. THE POS_System SHALL display the number of cancelled orders
6. THE POS_System SHALL list Menu_Items sold with quantities and subtotals
7. THE POS_System SHALL display Session start time and current time
8. THE POS_System SHALL calculate sales statistics in real-time as orders are processed

### Requirement 11: Cash Register Closure

**User Story:** As a manager, I want to close the cash register at end of shift, so that I can finalize the session and record final totals.

#### Acceptance Criteria

1. THE POS_System SHALL provide a cash register closure function
2. WHEN cash register closure is initiated, THE POS_System SHALL generate a final Session report
3. THE POS_System SHALL display expected cash amount based on registered orders
4. THE POS_System SHALL allow the Admin_User to input actual cash count
5. THE POS_System SHALL calculate and display any cash discrepancy
6. WHEN closure is confirmed, THE POS_System SHALL save the Session record permanently
7. WHEN closure is confirmed, THE POS_System SHALL reset the order counter for the next Session
8. WHEN closure is confirmed in Online_Mode, THE Sync_Engine SHALL ensure all data is synchronized to Supabase_DB

### Requirement 12: Receipt Generation

**User Story:** As a server, I want to generate printable receipts for orders, so that customers receive proper documentation.

#### Acceptance Criteria

1. WHEN an Order is registered, THE POS_System SHALL generate a Receipt
2. THE Receipt SHALL include restaurant name "Papa Bolotas"
3. THE Receipt SHALL include Order number, date, and time
4. THE Receipt SHALL list all Menu_Items with quantities, individual prices, and subtotals
5. THE Receipt SHALL display the Order total
6. THE Receipt SHALL include any customer observations
7. IF the Order is complimentary, THEN THE Receipt SHALL display "OFERTA" indicator
8. THE Receipt SHALL be formatted for thermal printer output (32-character width)
9. THE POS_System SHALL provide a print function to send receipts to connected printers
10. THE POS_System SHALL support browser print dialog for receipt printing

### Requirement 13: Price List PDF Generation

**User Story:** As a manager, I want to generate a PDF price list of all menu items, so that I can display current prices to customers.

#### Acceptance Criteria

1. THE POS_System SHALL provide a function to generate a price list PDF
2. THE PDF SHALL include all Menu_Items organized by category
3. THE PDF SHALL display Menu_Item names and current prices
4. THE PDF SHALL include the generation date
5. THE PDF SHALL be formatted for A4 paper size
6. THE PDF SHALL use clear, readable typography
7. WHEN the price list is generated, THE POS_System SHALL allow downloading the PDF file

### Requirement 14: Data Persistence and Synchronization

**User Story:** As a system administrator, I want reliable data storage with cloud synchronization, so that data is never lost and accessible across devices.

#### Acceptance Criteria

1. WHILE in Online_Mode, THE POS_System SHALL store all data in Supabase_DB
2. WHILE in Offline_Mode, THE POS_System SHALL store all data in IndexedDB
3. THE POS_System SHALL persist Menu_Items, Stock_Levels, Orders, and Session data
4. WHEN transitioning from Offline_Mode to Online_Mode, THE Sync_Engine SHALL upload all pending changes
5. THE Sync_Engine SHALL synchronize data within 30 seconds of connection restoration
6. IF synchronization fails, THEN THE POS_System SHALL retry with exponential backoff
7. THE POS_System SHALL maintain data integrity during synchronization failures
8. THE POS_System SHALL provide synchronization status feedback to the Admin_User

### Requirement 15: Security Protection

**User Story:** As a system owner, I want comprehensive security measures protecting against external attacks, so that the system and data remain secure.

#### Acceptance Criteria

1. THE Webapp SHALL implement HTTPS for all network communications
2. THE POS_System SHALL protect against SQL injection through parameterized queries
3. THE POS_System SHALL protect against Cross-Site Scripting (XSS) through input sanitization
4. THE POS_System SHALL protect against Cross-Site Request Forgery (CSRF) using anti-CSRF tokens
5. THE POS_System SHALL implement rate limiting on authentication endpoints
6. THE POS_System SHALL log failed authentication attempts with timestamp and source
7. THE POS_System SHALL expire authentication sessions after 12 hours of inactivity
8. THE POS_System SHALL validate and sanitize all user inputs before processing
9. THE POS_System SHALL implement Content Security Policy headers
10. THE POS_System SHALL store sensitive configuration (API keys, database credentials) as environment variables

### Requirement 16: Cloud Hosting and Deployment

**User Story:** As a system administrator, I want the application deployed on a reliable cloud platform, so that it is accessible 24/7 with minimal downtime.

#### Acceptance Criteria

1. THE Webapp SHALL be hosted on a cloud Hosting_Platform (Netlify, Railway, or equivalent)
2. THE Hosting_Platform SHALL provide HTTPS endpoints by default
3. THE Webapp SHALL be accessible via a custom domain name
4. THE Webapp SHALL have automated deployment from version control
5. THE Hosting_Platform SHALL provide minimum 99.9% uptime
6. THE Webapp SHALL load initial page within 3 seconds on standard broadband connection
7. THE Webapp SHALL implement caching strategies for static assets
8. THE Hosting_Platform SHALL support deployment rollback capabilities

### Requirement 17: Database Configuration

**User Story:** As a system administrator, I want Supabase configured as the cloud database, so that data is reliably stored and synchronized.

#### Acceptance Criteria

1. THE POS_System SHALL use Supabase_DB as the primary online database
2. THE Supabase_DB SHALL store tables for Menu_Items, Stock_Levels, Orders, Sessions, and Admin_Users
3. THE POS_System SHALL authenticate to Supabase_DB using secure API keys
4. THE Supabase_DB SHALL implement Row Level Security policies restricting access to authenticated users
5. THE POS_System SHALL handle database connection failures gracefully by switching to Offline_Mode
6. THE Supabase_DB SHALL maintain automatic backups with point-in-time recovery
7. THE POS_System SHALL use prepared statements for all database queries
8. THE Supabase_DB SHALL support real-time subscriptions for multi-device synchronization

### Requirement 18: Data Migration from Desktop Application

**User Story:** As a system administrator, I want to migrate existing data from the desktop application, so that historical information is preserved.

#### Acceptance Criteria

1. THE POS_System SHALL provide a data import function
2. THE POS_System SHALL parse and import Menu_Items from menu_artigos.json
3. THE POS_System SHALL parse and import Stock_Levels from stock_artigos.json
4. THE POS_System SHALL validate imported data before committing to database
5. IF imported data contains invalid values, THEN THE POS_System SHALL report errors and skip invalid records
6. WHEN import completes successfully, THE POS_System SHALL display a summary of imported records
7. THE POS_System SHALL preserve Menu_Item names with Portuguese characters during import
8. THE POS_System SHALL map desktop categories to Webapp categories correctly

### Requirement 19: Session Management

**User Story:** As a restaurant operator, I want the system to track work sessions from start to finish, so that sales are organized by operational period.

#### Acceptance Criteria

1. WHEN the Admin_User logs in, THE POS_System SHALL start a new Session
2. THE POS_System SHALL record Session start timestamp
3. THE POS_System SHALL associate all Orders with the current Session
4. THE POS_System SHALL display Session duration in the interface
5. WHEN cash register closure occurs, THE POS_System SHALL finalize the current Session
6. THE POS_System SHALL maintain Session history with all completed sessions
7. THE POS_System SHALL allow viewing historical Session reports
8. THE Session SHALL include total revenue, order count, and item sales breakdown

### Requirement 20: Audit Trail and Logging

**User Story:** As a system administrator, I want comprehensive logging of system activities, so that I can audit operations and troubleshoot issues.

#### Acceptance Criteria

1. THE POS_System SHALL log all Admin_User authentication events
2. THE POS_System SHALL log all Order creation, modification, and cancellation events
3. THE POS_System SHALL log all Stock_Level adjustments with timestamp and user
4. THE POS_System SHALL log all Menu_Item changes with timestamp and user
5. THE POS_System SHALL log synchronization events including success and failure status
6. THE POS_System SHALL log security-relevant events (failed authentication, Security_Code errors)
7. THE POS_System SHALL store logs in Supabase_DB in Online_Mode
8. THE POS_System SHALL allow Admin_User to view audit logs through the interface
9. THE POS_System SHALL retain audit logs for minimum 90 days
