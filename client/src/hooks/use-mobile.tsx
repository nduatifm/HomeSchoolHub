import { useState, useEffect } from "react";

// Hook to detect if the current device is mobile
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Function to check if device is mobile
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      
      // Check if userAgent matches common mobile patterns
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      
      // Also check screen width for responsive layouts
      const isMobileDevice = mobileRegex.test(userAgent) || window.innerWidth <= 768;
      
      setIsMobile(isMobileDevice);
    };

    // Initial check
    checkIfMobile();
    
    // Check on resize
    window.addEventListener("resize", checkIfMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  return isMobile;
}