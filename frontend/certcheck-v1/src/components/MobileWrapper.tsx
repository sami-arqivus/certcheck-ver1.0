import React from 'react';
import { useMobileSafeArea } from '@/hooks/use-mobile-safe-area';

interface MobileWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileWrapper: React.FC<MobileWrapperProps> = ({ 
  children, 
  className = '' 
}) => {
  const { isNative, platform } = useMobileSafeArea();

  return (
    <div 
      className={`
        ${className} 
        ${isNative ? 'safe-area-all' : ''}
        ${platform === 'ios' ? 'ios-specific' : ''}
        ${platform === 'android' ? 'android-specific' : ''}
      `.trim()}
      data-platform={platform}
      data-native={isNative}
    >
      {children}
    </div>
  );
};