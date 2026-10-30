import React, { useState, useEffect, useRef } from 'react';

interface NothingDecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  characters?: string;
  className?: string;
  encryptedClassName?: string;
  animateOnHover?: boolean;
  revealDirection?: 'start' | 'end' | 'random';
}

const DEFAULT_CHARS = '•◦.·:0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const NothingDecryptedText: React.FC<NothingDecryptedTextProps> = ({
  text,
  speed = 40,
  maxIterations = 10,
  characters = DEFAULT_CHARS,
  className = '',
  encryptedClassName = 'text-nothing-red',
  animateOnHover = true,
  revealDirection = 'start',
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<any>(null);

  const startScramble = () => {
    let iteration = 0;
    clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(() =>
        text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            const progress = iteration / maxIterations;
            const threshold =
              revealDirection === 'start'
                ? progress * text.length
                : revealDirection === 'end'
                ? text.length - progress * text.length
                : Math.random() * text.length;

            const isRevealed =
              revealDirection === 'start'
                ? index < threshold
                : revealDirection === 'end'
                ? index > threshold
                : progress > 0.8;

            if (isRevealed || iteration >= maxIterations) {
              return char;
            }
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join('')
      );

      if (iteration >= maxIterations) {
        clearInterval(intervalRef.current);
        setDisplayText(text);
      }
      iteration++;
    }, speed);
  };

  useEffect(() => {
    startScramble();
    return () => clearInterval(intervalRef.current);
  }, [text]);

  return (
    <span
      onMouseEnter={() => {
        if (animateOnHover) {
          setIsHovered(true);
          startScramble();
        }
      }}
      onMouseLeave={() => setIsHovered(false)}
      className={`inline-block font-ndot tracking-wider cursor-default select-none ${className}`}
    >
      {displayText}
    </span>
  );
};
