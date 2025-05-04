import React, { useState, useEffect } from 'react';

// A component that only renders its children on the client side
export default function ClientOnly({ children }: { children: React.ReactNode }): React.ReactElement | null {
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  if (!hasMounted) {
    return null;
  }
  
  return <>{children}</>;
} 