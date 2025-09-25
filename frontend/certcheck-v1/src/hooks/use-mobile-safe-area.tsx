import { useEffect, useState } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export function useMobileSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Set status bar style for better visibility
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    }
  }, []);

  return {
    safeArea,
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  };
}