import { useState, useEffect } from 'react';

/**
 * Custom hook to track online/offline status
 * Listens to browser online/offline events and provides current connection state
 * 
 * @returns boolean indicating if the browser is online
 * 
 * @example
 * const isOnline = useOnlineStatus();
 * 
 * return (
 *   <div>
 *     {isOnline ? 'Connected' : 'Offline'}
 *   </div>
 * );
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      console.log('Connection restored - now online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('Connection lost - now offline');
      setIsOnline(false);
    };

    // Listen to online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
