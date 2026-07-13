'use client';

import React from 'react';

export const ChatTypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 p-3.5 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl max-w-[80px] border border-gray-200/50 dark:border-gray-700/50 shadow-sm animate-pulse">
      <div className="flex space-x-1.5 items-center justify-center w-full">
        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }} />
        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }} />
      </div>
    </div>
  );
};
