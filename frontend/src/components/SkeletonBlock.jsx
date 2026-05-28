import React from 'react';

export default function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200/70 dark:bg-white/10 ${className}`} aria-hidden />;
}

