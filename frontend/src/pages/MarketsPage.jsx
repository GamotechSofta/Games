import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import MarketSections from '../components/MarketSections';

export default function MarketsPage() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';
  const { isDesktop } = useBreakpoint();

  if (isDesktop) {
    return <MarketSections searchQuery={searchQuery} />;
  }

  return (
    <div className="px-3 pb-8">
      <MarketSections />
    </div>
  );
}
