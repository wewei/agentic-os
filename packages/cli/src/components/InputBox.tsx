import React, { useCallback } from 'react';

import type { InputBoxProps } from '../types.ts';

/**
 * InputBox component for user input
 */
export const InputBox: React.FC<InputBoxProps> = ({
  onSubmit,
  onExit,
  height,
  width,
}) => {
  const handleSubmit = useCallback((value: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue) {
      onSubmit(trimmedValue);
    }
  }, [onSubmit]);

  const handleKeyPress = useCallback((ch: string, key: { name: string }) => {
    if (key.name === 'escape') {
      onExit();
    }
  }, [onExit]);

  return (
    // @ts-expect-error - react-blessed types not properly recognized
    <textbox
      bottom={0}
      left={0}
      width={width}
      height={height}
      inputOnFocus={true}
      fullUnicode={true}
      border={{
        type: 'line',
      }}
      style={{
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'green',
        },
        focus: {
          border: {
            fg: 'yellow',
          },
        },
      }}
      autoPadding={true}
      keys={true}
      mouse={true}
      shrink={true}
      onSubmit={handleSubmit}
      onKeypress={handleKeyPress}
    />
  );
};
