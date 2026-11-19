# Session Components

Components for displaying and managing session information.

## SessionStatusDisplay

A component that displays real-time session information including session start time, duration, order count, revenue, and connection status.

### Requirements

- **19.4**: Display session duration in the interface
- **3.5**: Display the current connection status (online/offline) to the Admin_User

### Props

```typescript
interface SessionStatusDisplayProps {
  sessionId: string; // ID of the active session to display
}
```

### Features

- **Session Start Time**: Shows when the current session began
- **Auto-updating Duration**: Real-time session duration in HH:MM:SS format
- **Order Count**: Number of completed orders (with complimentary count)
- **Revenue**: Total revenue for the session (formatted as currency)
- **Connection Status**: Visual indicator showing online/offline status
- **Periodic Refresh**: Statistics refresh every 30 seconds automatically

### Usage

```tsx
import { SessionStatusDisplay } from '@/components/session';

function DashboardPage() {
  const { session } = useAuth(); // Get current active session
  
  if (!session) {
    return <div>No active session</div>;
  }
  
  return (
    <div>
      <h1>Dashboard</h1>
      <SessionStatusDisplay sessionId={session.id} />
      {/* Other dashboard content */}
    </div>
  );
}
```

### Styling

The component uses Tailwind CSS classes and is fully responsive:
- Mobile: Single column layout
- Tablet/Desktop: 2-column grid layout

### Accessibility

- Proper ARIA labels for screen readers
- Loading and error states clearly communicated
- Color contrast meets WCAG AA standards
- Connection status updates are announced via `aria-live="polite"`

### Dependencies

- **SessionService**: For fetching session data and statistics
- **ConnectionStore**: For monitoring network/database connection status
- **lucide-react**: Icons for visual indicators

### Notes

- The component automatically refreshes statistics every 30 seconds
- Duration updates every second for real-time display
- Connection status is monitored through the global ConnectionStore
- Component handles loading and error states gracefully

---

## SalesReport

A comprehensive sales report component that displays session statistics, revenue, order counts, and item sales breakdown.

### Requirements

- **10.1**: Generate sales report for current session
- **10.2**: Display total revenue (excluding complimentary/cancelled)
- **10.6**: List menu items sold with quantities and subtotals
- **10.7**: Display session start time and current time
- **10.8**: Calculate sales statistics in real-time

### Props

```typescript
interface SalesReportProps {
  sessionId: string;           // ID of the session to display report for
  autoRefresh?: boolean;       // Whether to auto-refresh statistics (default: true)
  refreshInterval?: number;    // Refresh interval in ms (default: 30000)
}
```

### Features

- **Total Revenue**: Displays total revenue excluding cancelled/complimentary orders
- **Order Counts**: Shows completed, complimentary, and cancelled order counts
- **Session Information**: Start time and duration display
- **Item Breakdown**: Detailed table of all items sold, sorted by revenue
- **Real-time Updates**: Automatically refreshes data every 30 seconds (configurable)
- **Responsive Layout**: Adapts to mobile, tablet, and desktop screens
- **Professional Design**: Uses gradient cards and clear visual hierarchy

### Usage

```tsx
import { SalesReport } from '@/components/session';

function ReportsPage() {
  const { session } = useAuth();
  
  if (!session) {
    return <div>No active session</div>;
  }
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Sales Report</h1>
      <SalesReport 
        sessionId={session.id}
        autoRefresh={true}
        refreshInterval={30000}
      />
    </div>
  );
}
```

### Display Sections

1. **Header Card**
   - Session start date/time
   - Session duration (e.g., "2h 30m")
   - Last update timestamp

2. **Key Metrics Grid**
   - Total Revenue (green gradient card)
   - Completed Orders (blue gradient card)
   - Complimentary Orders (amber gradient card)
   - Cancelled Orders (red gradient card)

3. **Item Sales Breakdown Table**
   - Item name, quantity, and subtotal for each product
   - Sorted by revenue (highest to lowest)
   - Totals row at the bottom
   - Empty state when no items sold

4. **Summary Footer**
   - Total orders processed count
   - Session revenue total

### Styling

- Uses shadcn/ui Card components for consistent layout
- Gradient backgrounds for visual appeal
- Responsive grid layouts (1/2/4 columns based on screen size)
- Professional table design with hover effects
- Color-coded metrics (green for revenue, blue for orders, etc.)

### Accessibility

- Semantic HTML structure
- ARIA labels where appropriate
- Loading states with aria-live regions
- Error states clearly communicated
- Keyboard navigable

### Dependencies

- **SalesReportService**: For fetching formatted sales report data
- **Card Components**: UI components from shadcn/ui
- **lucide-react**: Icons for visual indicators

### Data Format

The component uses `FormattedSalesReport` from the SalesReportService which includes:
- Pre-formatted currency strings (e.g., "€145,50")
- Human-readable duration (e.g., "2h 30m")
- Items sorted by revenue
- Total order counts

### Notes

- Automatically refreshes every 30 seconds by default
- Refresh can be disabled by setting `autoRefresh={false}`
- Handles loading and error states gracefully
- Revenue displays in Portuguese format (€ symbol, comma decimals)
- All dates/times use Portuguese locale formatting
