import React, { useState, useEffect } from 'react';

interface NothingSplitFlapProps {
  value: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  activeColor?: string;
}

export const NothingSplitFlap: React.FC<NothingSplitFlapProps> = ({
  value,
  label,
  className = '',
  size = 'md',
  activeColor = 'text-white',
}) => {
  const chars = value.split('');

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 min-w-[20px] h-6',
    md: 'text-sm px-2 py-1 min-w-[26px] h-8',
    lg: 'text-xl px-2.5 py-1.5 min-w-[34px] h-11',
  };

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      {label && (
        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1">
          {label}
        </span>
      )}
      <div className="flex items-center space-x-1 font-ndot select-none">
        {chars.map((char, index) => (
          <div
            key={index}
            className={`relative flex items-center justify-center rounded-md bg-[#121215] border border-white/15 text-center shadow-inner font-bold tracking-wider ${sizeClasses[size]} ${activeColor}`}
          >
            {/* Split Hinge Line */}
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/80 pointer-events-none" />
            <span className="relative z-10 leading-none">{char}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

