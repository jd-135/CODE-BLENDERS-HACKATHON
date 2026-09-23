"use client";

import { useState, useEffect } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
  saveData?: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [networkInfo, setNetworkInfo] = useState<Partial<NetworkStatus>>({});

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Network Information API if supported
    const nav = navigator as unknown as {
      connection?: {
        effectiveType?: string;
        rtt?: number;
        downlink?: number;
        saveData?: boolean;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
    };

    const updateConnectionInfo = () => {
      if (nav.connection) {
        setNetworkInfo({
          effectiveType: nav.connection.effectiveType,
          rtt: nav.connection.rtt,
          downlink: nav.connection.downlink,
          saveData: nav.connection.saveData,
        });
      }
    };

    updateConnectionInfo();

    if (nav.connection?.addEventListener) {
      nav.connection.addEventListener("change", updateConnectionInfo);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (nav.connection?.removeEventListener) {
        nav.connection.removeEventListener("change", updateConnectionInfo);
      }
    };
  }, []);

  return {
    isOnline,
    ...networkInfo,
  };
}
