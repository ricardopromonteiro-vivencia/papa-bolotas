# Store Module

This directory contains Zustand stores for global state management across the application.

## Available Stores

### Connection Store (`connectionStore.ts`)

Manages the application's connection status, including network connectivity and Supabase database connection health.

#### Usage Example

```typescript
import { useConnectionStore } from '@/store';

function MyComponent() {
  // Access the entire store
  const { status, setOnline, isFullyConnected } = useConnectionStore();
  
  // Or subscribe to specific parts
  const isOnline = useConnectionStore((state) => state.status.isOnline);
  const latency = useConnectionStore((state) => state.status.latency);
  
  return (
    <div>
      <p>Status: {isFullyConnected() ? 'Connected' : 'Disconnected'}</p>
      <p>Online: {status.isOnline ? 'Yes' : 'No'}</p>
      <p>Supabase: {status.isSupabaseConnected ? 'Connected' : 'Disconnected'}</p>
      {latency && <p>Latency: {latency}ms</p>}
    </div>
  );
}
```

#### Store State

- `status: ConnectionStatus` - Current connection status object containing:
  - `isOnline: boolean` - Network connectivity status
  - `isSupabaseConnected: boolean` - Supabase database connection status
  - `latency?: number` - Connection latency in milliseconds (optional)
  - `lastChecked: Date` - Timestamp of last status check

#### Store Actions

- `setStatus(updates: Partial<ConnectionStatus>)` - Update multiple status fields at once
- `setOnline(isOnline: boolean)` - Update network connectivity status
- `setSupabaseConnected(isConnected: boolean, latency?: number)` - Update Supabase connection status with optional latency
- `isFullyConnected(): boolean` - Check if both network and Supabase are connected

#### Integration with Other Services

The connection store is automatically updated by the `ConnectionStatus` component, which:
1. Monitors browser online/offline events using the `useOnlineStatus` hook
2. Checks Supabase connection health using `checkConnection()` and `monitorConnection()`
3. Updates the store whenever connection status changes

Other components can subscribe to the store to react to connection changes without needing to implement their own monitoring logic.

## Best Practices

1. **Selective Subscription**: Subscribe only to the state you need to avoid unnecessary re-renders
   ```typescript
   // Good - only re-renders when isOnline changes
   const isOnline = useConnectionStore((state) => state.status.isOnline);
   
   // Less optimal - re-renders on any status change
   const status = useConnectionStore((state) => state.status);
   ```

2. **Actions Outside Components**: Call store actions from service layers or event handlers
   ```typescript
   // In a service file
   import { useConnectionStore } from '@/store';
   
   export async function syncData() {
     const { isFullyConnected } = useConnectionStore.getState();
     
     if (!isFullyConnected()) {
       console.log('Cannot sync - offline');
       return;
     }
     
     // Proceed with sync...
   }
   ```

3. **Computed Values**: Use getter functions for computed state like `isFullyConnected()`

4. **Testing**: Access store state directly in tests using `getState()` and `setState()`
   ```typescript
   import { useConnectionStore } from '@/store';
   
   test('my test', () => {
     const { setOnline } = useConnectionStore.getState();
     setOnline(false);
     
     // Test offline behavior...
   });
   ```

## Future Stores

As the application grows, additional stores may be added for:
- Session management
- Order state
- Menu items cache
- Sync queue status
- User preferences

Each store should follow the same patterns established here for consistency.
