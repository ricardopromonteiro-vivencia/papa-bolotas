import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore } from './connectionStore';

describe('connectionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { status } = useConnectionStore.getState();
    useConnectionStore.setState({
      status: {
        isOnline: true,
        isSupabaseConnected: false,
        lastChecked: new Date(),
      },
    });
  });

  describe('Initial State', () => {
    it('should have initial state with online from navigator', () => {
      const { status } = useConnectionStore.getState();
      
      expect(status.isOnline).toBeDefined();
      expect(status.isSupabaseConnected).toBe(false);
      expect(status.lastChecked).toBeInstanceOf(Date);
    });
  });

  describe('setOnline', () => {
    it('should update online status to true', () => {
      const { setOnline } = useConnectionStore.getState();
      
      setOnline(true);
      
      const { status } = useConnectionStore.getState();
      expect(status.isOnline).toBe(true);
    });

    it('should update online status to false', () => {
      const { setOnline } = useConnectionStore.getState();
      
      setOnline(false);
      
      const { status } = useConnectionStore.getState();
      expect(status.isOnline).toBe(false);
    });

    it('should set Supabase disconnected when going offline', () => {
      const { setOnline, setSupabaseConnected } = useConnectionStore.getState();
      
      // First set both to connected
      setOnline(true);
      setSupabaseConnected(true);
      
      // Then go offline
      setOnline(false);
      
      const { status } = useConnectionStore.getState();
      expect(status.isOnline).toBe(false);
      expect(status.isSupabaseConnected).toBe(false);
    });

    it('should update lastChecked timestamp', () => {
      const { setOnline, status: initialStatus } = useConnectionStore.getState();
      const initialTime = initialStatus.lastChecked;
      
      // Wait a bit to ensure timestamp changes
      setTimeout(() => {
        setOnline(false);
        
        const { status } = useConnectionStore.getState();
        expect(status.lastChecked.getTime()).toBeGreaterThan(initialTime.getTime());
      }, 10);
    });
  });

  describe('setSupabaseConnected', () => {
    it('should update Supabase connection status to true', () => {
      const { setSupabaseConnected } = useConnectionStore.getState();
      
      setSupabaseConnected(true);
      
      const { status } = useConnectionStore.getState();
      expect(status.isSupabaseConnected).toBe(true);
    });

    it('should update Supabase connection status to false', () => {
      const { setSupabaseConnected } = useConnectionStore.getState();
      
      setSupabaseConnected(false);
      
      const { status } = useConnectionStore.getState();
      expect(status.isSupabaseConnected).toBe(false);
    });

    it('should store latency when provided', () => {
      const { setSupabaseConnected } = useConnectionStore.getState();
      
      setSupabaseConnected(true, 45);
      
      const { status } = useConnectionStore.getState();
      expect(status.latency).toBe(45);
    });

    it('should preserve existing latency when not provided', () => {
      const { setSupabaseConnected, setStatus } = useConnectionStore.getState();
      
      // First set latency
      setStatus({ latency: 50 });
      
      // Then update connection without latency
      setSupabaseConnected(true);
      
      const { status } = useConnectionStore.getState();
      expect(status.latency).toBe(50);
    });

    it('should update lastChecked timestamp', () => {
      const { setSupabaseConnected, status: initialStatus } = useConnectionStore.getState();
      const initialTime = initialStatus.lastChecked;
      
      // Wait a bit to ensure timestamp changes
      setTimeout(() => {
        setSupabaseConnected(true);
        
        const { status } = useConnectionStore.getState();
        expect(status.lastChecked.getTime()).toBeGreaterThan(initialTime.getTime());
      }, 10);
    });
  });

  describe('setStatus', () => {
    it('should update status with partial updates', () => {
      const { setStatus } = useConnectionStore.getState();
      
      setStatus({ isOnline: false, latency: 100 });
      
      const { status } = useConnectionStore.getState();
      expect(status.isOnline).toBe(false);
      expect(status.latency).toBe(100);
    });

    it('should preserve unchanged properties', () => {
      const { setStatus, setSupabaseConnected } = useConnectionStore.getState();
      
      // Set initial Supabase connection
      setSupabaseConnected(true);
      
      // Update only latency
      setStatus({ latency: 75 });
      
      const { status } = useConnectionStore.getState();
      expect(status.isSupabaseConnected).toBe(true);
      expect(status.latency).toBe(75);
    });

    it('should update lastChecked timestamp', () => {
      const { setStatus, status: initialStatus } = useConnectionStore.getState();
      const initialTime = initialStatus.lastChecked;
      
      // Wait a bit to ensure timestamp changes
      setTimeout(() => {
        setStatus({ latency: 50 });
        
        const { status } = useConnectionStore.getState();
        expect(status.lastChecked.getTime()).toBeGreaterThan(initialTime.getTime());
      }, 10);
    });
  });

  describe('isFullyConnected', () => {
    it('should return true when both online and Supabase connected', () => {
      const { setOnline, setSupabaseConnected, isFullyConnected } = useConnectionStore.getState();
      
      setOnline(true);
      setSupabaseConnected(true);
      
      expect(isFullyConnected()).toBe(true);
    });

    it('should return false when online but Supabase not connected', () => {
      const { setOnline, setSupabaseConnected, isFullyConnected } = useConnectionStore.getState();
      
      setOnline(true);
      setSupabaseConnected(false);
      
      expect(isFullyConnected()).toBe(false);
    });

    it('should return false when offline but Supabase connected', () => {
      const { setOnline, setSupabaseConnected, isFullyConnected } = useConnectionStore.getState();
      
      setOnline(false);
      setSupabaseConnected(true);
      
      expect(isFullyConnected()).toBe(false);
    });

    it('should return false when both offline and Supabase not connected', () => {
      const { setOnline, setSupabaseConnected, isFullyConnected } = useConnectionStore.getState();
      
      setOnline(false);
      setSupabaseConnected(false);
      
      expect(isFullyConnected()).toBe(false);
    });
  });
});
