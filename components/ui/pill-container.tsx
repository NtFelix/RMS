import React from 'react';
import { cn } from '@/lib/utils';

interface PillContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const PillContainer: React.FC<PillContainerProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        "glass shadow-lg rounded-full h-16 p-4 flex items-center backdrop-blur-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export { PillContainer };
