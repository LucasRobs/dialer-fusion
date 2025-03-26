
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(true); // Default to true for mobile-first approach

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // Check on initial load
    checkMobile();
    
    // Add event listener for window resize
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => checkMobile();
    
    // Modern way to add event listener (supports newer browsers)
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
    } else {
      // Fallback for older browsers
      window.addEventListener("resize", onChange);
    }
    
    // Cleanup
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", onChange);
      } else {
        window.removeEventListener("resize", onChange);
      }
    };
  }, []);

  return isMobile;
}
