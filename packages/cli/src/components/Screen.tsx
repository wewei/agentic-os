import React, { useCallback, useEffect, useRef } from 'react';

import type { ScreenProps } from '../types.ts';

/**
 * Screen component wrapper with resize handling
 */
export const Screen: React.FC<ScreenProps> = ({
  children,
  onResize,
}) => {
  const screenRef = useRef<{ width: number; height: number; on: (event: string, handler: () => void) => void; removeListener: (event: string, handler: () => void) => void } | null>(null);

  const handleResize = useCallback(() => {
    if (screenRef.current && onResize) {
      const { width, height } = screenRef.current;
      onResize(width, height);
    }
  }, [onResize]);

  useEffect(() => {
    const currentScreen = screenRef.current;
    if (currentScreen) {
      currentScreen.on('resize', handleResize);
      return () => {
        currentScreen.removeListener('resize', handleResize);
      };
    }
  }, [handleResize]);

  return (
    // @ts-expect-error - react-blessed types not properly recognized
    <screen
      ref={screenRef}
      smartCSR={true}
      title="Agentic OS"
      fullUnicode={true}
    >
      {children}
    {/* @ts-expect-error - react-blessed types not properly recognized */}
    </screen>
  );
};
