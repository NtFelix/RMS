import { useState, useEffect } from 'react';

// This is a simplified hook for mobile detection.
// A more robust solution might use window.matchMedia.
export function useIsVisible() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
}
