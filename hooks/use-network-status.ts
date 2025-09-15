import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export interface UseNetworkStatusReturn extends NetworkStatus {
  checkConnectivity: () => Promise<boolean>;
  lastOnlineTime: Date | null;
  lastOfflineTime: Date | null;
}

/**
 * Custom hook for monitoring network connectivity status
 * Provides real-time network status updates and connectivity checking
 */
export function useNetworkStatus(): UseNetworkStatusReturn {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine;
    }
    return true; // Assume online during SSR
  });

  const [connectionInfo, setConnectionInfo] = useState<Partial<NetworkStatus>>({});
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);
  const [lastOfflineTime, setLastOfflineTime] = useState<Date | null>(null);

  // Update connection info from navigator.connection if available
  const updateConnectionInfo = useCallback(() => {
    if (typeof window !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        setConnectionInfo({
          connectionType: connection.type,
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        });
      }
    }
  }, []);

  // Check actual connectivity by making a lightweight request
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') {
      return true;
    }

    try {
      // Use a lightweight request to check actual connectivity
      // We'll ping our own API with a HEAD request to minimize data usage
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      // If the request fails, we're likely offline or have connectivity issues
      return false;
    }
  }, []);

  // Handle online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineTime(new Date());
      updateConnectionInfo();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastOfflineTime(new Date());
    };

    const handleConnectionChange = () => {
      updateConnectionInfo();
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes if supported
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', handleConnectionChange);
      }
    }

    // Initial connection info update
    updateConnectionInfo();

    // Set initial online time if we're online
    if (navigator.onLine && !lastOnlineTime) {
      setLastOnlineTime(new Date());
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          connection.removeEventListener('change', handleConnectionChange);
        }
      }
    };
  }, [updateConnectionInfo, lastOnlineTime]);

  return {
    isOnline,
    isOffline: !isOnline,
    connectionType: connectionInfo.connectionType,
    effectiveType: connectionInfo.effectiveType,
    downlink: connectionInfo.downlink,
    rtt: connectionInfo.rtt,
    checkConnectivity,
    lastOnlineTime,
    lastOfflineTime
  };
}