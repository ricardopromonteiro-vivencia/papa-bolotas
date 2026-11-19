# Session Service Implementation

## Overview

The Session Service manages work sessions for the Papa Bolotas POS system. A session represents a work period from user login to cash register closure, tracking all orders and calculating session statistics.

## Task Completed

**Task 12.1**: Create session service layer

## Requirements Implemented

- **19.1**: Auto-create session on user login
- **19.2**: Record session start timestamp
- **19.3**: Associate all orders with current session
- **19.8**: Calculate session statistics (revenue, order counts, item breakdown)

## Files Created

1. `src/services/session.service.ts` - Session service implementation
2. `src/services/session.service.test.ts` - Comprehensive unit tests (21 tests, all passing)
3. Updated `src/services/index.ts` - Export session service

## API Reference

### SessionService Class

#### Methods

##### `startSession(userId: string): Promise<Session>`
Creates a new session for a user. If the user already has an active session, returns the existing one.

**Parameters:**
- `userId` - ID of the user starting the session

**Returns:**
- Promise resolving to the created or existing Session

**Throws:**
- `SessionError` if userId is invalid or creation fails

**Example:**
```typescript
const session = await sessionService.startSession('user-123');
console.log('Session started:', session.id);
```

##### `endSession(sessionId: string, actualCash: number): Promise<Session>`
Ends an active session and performs cash reconciliation.

**Parameters:**
- `sessionId` - ID of the session to end
- `actualCash` - Actual cash count from register

**Returns:**
- Promise resolving to the updated Session with cash reconciliation data

**Throws:**
- `SessionError` if session not found, already closed, or actualCash is negative

**Example:**
```typescript
const session = await sessionService.endSession('session-123', 350.75);
console.log('Discrepancy:', session.discrepancy);
```

##### `getSession(sessionId: string): Promise<Session>`
Retrieves a session by ID.

**Parameters:**
- `sessionId` - ID of the session to retrieve

**Returns:**
- Promise resolving to the Session

**Throws:**
- `SessionError` if session not found

**Example:**
```typescript
const session = await sessionService.getSession('session-123');
```

##### `getActiveSession(userId: string): Promise<Session | null>`
Gets the currently active session for a user.

**Parameters:**
- `userId` - ID of the user

**Returns:**
- Promise resolving to the active Session or null if none exists

**Example:**
```typescript
const activeSession = await sessionService.getActiveSession('user-123');
if (activeSession) {
  console.log('Active session:', activeSession.id);
}
```

##### `getUserSessions(userId: string, limit?: number): Promise<Session[]>`
Gets all sessions for a user, ordered by most recent first.

**Parameters:**
- `userId` - ID of the user
- `limit` - Maximum number of sessions to return (default: 50)

**Returns:**
- Promise resolving to array of Sessions

**Example:**
```typescript
const sessions = await sessionService.getUserSessions('user-123', 10);
console.log('Recent sessions:', sessions.length);
```

##### `getSessionStatistics(sessionId: string): Promise<SalesReport>`
Calculates comprehensive statistics for a session.

**Parameters:**
- `sessionId` - ID of the session

**Returns:**
- Promise resolving to SalesReport with:
  - `totalRevenue`: Total revenue excluding complimentary and cancelled orders
  - `completedOrders`: Count of completed orders
  - `complimentaryOrders`: Count of complimentary orders
  - `cancelledOrders`: Count of cancelled orders
  - `itemsSold`: Array of items with quantities and subtotals

**Example:**
```typescript
const stats = await sessionService.getSessionStatistics('session-123');
console.log('Total revenue:', stats.totalRevenue);
console.log('Completed orders:', stats.completedOrders);
console.log('Items sold:', stats.itemsSold);
```

## Error Handling

### SessionError
Custom error class for session-related failures.

**Properties:**
- `message`: Error description
- `code`: Error code (e.g., 'INVALID_USER_ID', 'SESSION_CLOSED')
- `statusCode`: HTTP status code (e.g., 400, 404, 500)

**Common Error Codes:**
- `INVALID_USER_ID`: User ID is required or invalid
- `INVALID_SESSION_ID`: Session ID is required or invalid
- `INVALID_CASH`: Actual cash cannot be negative
- `SESSION_CLOSED`: Session is already closed
- `NOT_FOUND`: Session not found
- `CREATE_FAILED`: Failed to create session
- `UPDATE_FAILED`: Failed to update session

## Data Flow

### Session Start Flow
```
User Login → startSession(userId)
  ↓
Check for active session
  ↓
If exists → Return existing session
If not → Create new session
  ↓
Return session
```

### Session End Flow
```
Close Register → endSession(sessionId, actualCash)
  ↓
Get session (verify active)
  ↓
Calculate expected cash from orders
  ↓
Calculate discrepancy
  ↓
Update session (set ended_at, is_active=false, cash data)
  ↓
Return updated session
```

### Statistics Calculation Flow
```
Get Statistics → getSessionStatistics(sessionId)
  ↓
Get session details
  ↓
Get all orders with items
  ↓
Calculate:
  - Total revenue (completed orders only)
  - Order counts (completed, complimentary, cancelled)
  - Aggregate items sold (excluding cancelled)
  ↓
Return SalesReport
```

## Database Schema

### sessions table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  expected_cash DECIMAL(10, 2),
  actual_cash DECIMAL(10, 2),
  discrepancy DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1
);
```

## Integration Points

### With AuthService
- `startSession()` should be called after successful user login
- Session tracks which user is working

### With OrderService
- All orders must be associated with a session via `session_id`
- Session statistics depend on order data
- Order totals contribute to expected cash calculation

### With UI Components
- Login flow: Create session on login
- Order panel: Display current session info
- Cash register closure: End session with cash count
- Reports: Display session statistics

## Testing

All 21 unit tests pass, covering:

**startSession (4 tests)**
- ✅ Create new session successfully
- ✅ Return existing active session
- ✅ Throw error for empty userId
- ✅ Handle database errors

**endSession (4 tests)**
- ✅ End session with cash reconciliation
- ✅ Throw error for empty sessionId
- ✅ Throw error for negative actualCash
- ✅ Throw error if session already closed

**getSession (3 tests)**
- ✅ Retrieve session by ID
- ✅ Throw error for empty sessionId
- ✅ Throw error if session not found

**getActiveSession (3 tests)**
- ✅ Retrieve active session for user
- ✅ Return null if no active session
- ✅ Throw error for empty userId

**getUserSessions (4 tests)**
- ✅ Retrieve all sessions for user
- ✅ Respect limit parameter
- ✅ Throw error for empty userId
- ✅ Return empty array if no sessions found

**getSessionStatistics (3 tests)**
- ✅ Calculate session statistics correctly
- ✅ Throw error for empty sessionId
- ✅ Handle session with no orders

## Usage Example

```typescript
import { sessionService } from '@/services';

// On user login
const handleLogin = async (userId: string) => {
  try {
    const session = await sessionService.startSession(userId);
    console.log('Session started:', session.id);
    // Store session.id for use in orders
  } catch (error) {
    console.error('Failed to start session:', error);
  }
};

// Get current session stats
const handleViewStats = async (sessionId: string) => {
  try {
    const stats = await sessionService.getSessionStatistics(sessionId);
    console.log('Revenue:', stats.totalRevenue);
    console.log('Orders:', stats.completedOrders);
  } catch (error) {
    console.error('Failed to get statistics:', error);
  }
};

// Close register at end of day
const handleCloseRegister = async (sessionId: string, actualCash: number) => {
  try {
    const session = await sessionService.endSession(sessionId, actualCash);
    if (session.discrepancy !== 0) {
      console.warn('Cash discrepancy:', session.discrepancy);
    }
    console.log('Session closed successfully');
  } catch (error) {
    console.error('Failed to close session:', error);
  }
};
```

## Next Steps

To integrate the session service into the application:

1. **Update AuthService** - Call `sessionService.startSession()` after successful login
2. **Update OrderService** - Ensure all orders include `session_id` from active session
3. **Create UI Components**:
   - Session status display in header
   - Session statistics dashboard
   - Cash register closure modal
4. **Add Navigation** - Routes for session management
5. **Add Session Context** - React context to track current session globally

## Notes

- Sessions are automatically associated with orders via the `session_id` foreign key
- Cash reconciliation happens only on session closure
- Statistics are calculated on-demand, not stored
- Complimentary and cancelled orders are excluded from revenue calculations
- Session history is maintained for auditing and reporting purposes
