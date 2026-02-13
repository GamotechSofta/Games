import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ResponsiveSidebarLayout from '../components/ResponsiveSidebarLayout';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { AddFund, WithdrawFund, BankDetail, AddFundHistory, WithdrawFundHistory } from './funds/index';
import FundsSidebar from './funds/FundsSidebar';
import FundsContentArea from './funds/FundsContentArea';

const Funds = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const items = useMemo(() => ([
    {
      key: 'add-fund',
      title: 'Add Fund',
      subtitle: 'You can add fund to your wallet',
      color: '#34a853',
      icon: <span className="text-3xl font-extrabold text-black leading-none">₹</span>,
      component: AddFund,
    },
    {
      key: 'withdraw-fund',
      title: 'Withdraw Fund',
      subtitle: 'You can withdraw winnings',
      color: '#ef4444',
      icon: (
        <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-4-4l4 4 4-4M16 6a6 6 0 00-8 0" />
        </svg>
      ),
      component: WithdrawFund,
    },
    {
      key: 'bank-detail',
      title: 'Bank Detail',
      subtitle: 'Add your bank detail for withdrawals',
      color: '#3b82f6',
      icon: (
        <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 18h18M4 10l8-4 8 4" />
        </svg>
      ),
      component: BankDetail,
    },
    {
      key: 'add-fund-history',
      title: 'Add Fund History',
      subtitle: 'You can check your add point history',
      color: '#1e3a8a',
      icon: (
        <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5l3 2" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      ),
      component: AddFundHistory,
    },
    {
      key: 'withdraw-fund-history',
      title: 'Withdraw Fund History',
      subtitle: 'You can check your Withdraw point history',
      color: '#f59e0b',
      icon: (
        <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5l3 2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 11-2.343-5.657" />
        </svg>
      ),
      component: WithdrawFundHistory,
    },
  ]), []);

  const { isDesktop } = useBreakpoint();
  const tabParam = searchParams.get('tab');
  const [activeKey, setActiveKey] = useState(() => (tabParam && items.some((i) => i.key === tabParam)) ? tabParam : (items[0]?.key || 'add-fund'));
  const [mobileView, setMobileView] = useState(null); // mobile: null = list, key = detail

  // Sync activeKey to URL: on desktop always; on mobile push when opening a sub-view. When tabParam is null (list view) don't write tab — avoids flicker when opening Funds from bottom bar.
  useEffect(() => {
    if (!isDesktop && mobileView === null) {
      if (tabParam) setSearchParams({}, { replace: true });
      return;
    }
    if (tabParam != null && tabParam !== activeKey) {
      setSearchParams({ tab: activeKey }, { replace: isDesktop });
    }
  }, [activeKey, isDesktop, mobileView, tabParam]);

  // Sync tabParam from URL to state when navigating (e.g. device back or external link)
  useEffect(() => {
    if (tabParam && items.some((i) => i.key === tabParam) && tabParam !== activeKey) {
      setActiveKey(tabParam);
      if (!isDesktop) setMobileView(tabParam);
    } else if (!tabParam || !items.some((i) => i.key === tabParam)) {
      // No tab or invalid tab → show list
      setActiveKey(items[0]?.key || 'add-fund');
      setMobileView(null);
    }
  }, [tabParam]);

  const activeItem = items.find((i) => i.key === activeKey) || items[0];
  const mobileDetailItem = mobileView ? items.find((i) => i.key === mobileView) : null;
  const ActiveComponent = activeItem?.component;
  const showList = mobileView === null || isDesktop;
  const showContent = mobileView !== null || isDesktop;

  const handleItemClick = (key) => {
    setActiveKey(key);
    if (!isDesktop) {
      setMobileView(key);
      setSearchParams({ tab: key }, { replace: false }); // push so device back goes to list
    }
  };

  const handleMobileBack = () => {
    setMobileView(null);
  };

  // Back from main Funds list: same behaviour as My Bets (desktop → home, mobile → prev or home).
  const isFundsPath = (p) => !p || p === '/funds' || p.startsWith('/funds?');
  const handleBack = () => {
    if (mobileView) {
      handleMobileBack();
      if (!isDesktop) setSearchParams({}, { replace: true });
      return;
    }
    try {
      if (window?.matchMedia?.('(min-width: 768px)')?.matches) {
        navigate('/');
        return;
      }
    } catch (_) {}
    try {
      const prev = sessionStorage.getItem('prevPathname');
      if (prev && !isFundsPath(prev)) {
        navigate(prev);
        return;
      }
    } catch (_) {}
    navigate('/');
  };

  const isAddFundMobileView = mobileView === 'add-fund';
  const isWithdrawFundMobileView = mobileView === 'withdraw-fund';
  const isBankDetailMobileView = mobileView === 'bank-detail';
  const isAddFundHistoryMobileView = mobileView === 'add-fund-history';
  const isWithdrawFundHistoryMobileView = mobileView === 'withdraw-fund-history';
  const shouldRemoveCardBackground = isAddFundMobileView || isWithdrawFundMobileView || isBankDetailMobileView || isAddFundHistoryMobileView || isWithdrawFundHistoryMobileView;

  return (
    <div className="min-h-screen bg-black text-white pl-3 pr-3 sm:pl-4 sm:pr-4 pt-0 md:pt-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-lg md:max-w-none mx-auto md:mx-0">
        <div className="mb-4 md:grid md:grid-cols-[360px_1fr] md:gap-6 md:items-center">
          <div className="flex items-center gap-3 pt-4 md:pt-0">
            <button
              type="button"
              onClick={handleBack}
              className="min-w-[44px] min-h-[44px] rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/15 active:scale-95 transition touch-manipulation"
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold">
              {showContent && !isDesktop ? (mobileDetailItem || activeItem)?.title : 'Funds'}
            </h1>
          </div>

          <div className="hidden md:flex items-center justify-between gap-4 px-1">
            <div className="text-2xl font-extrabold text-white">{activeItem?.title}</div>
          </div>
        </div>

        <ResponsiveSidebarLayout
          sidebar={showList ? (
            <FundsSidebar
              items={items}
              activeKey={activeKey}
              onItemClick={handleItemClick}
            />
          ) : null}
          content={showContent ? (
            <FundsContentArea
              isDesktop={isDesktop}
              activeItem={activeItem}
              ActiveComponent={ActiveComponent}
              mobileDetailItem={mobileDetailItem}
              shouldRemoveCardBackground={shouldRemoveCardBackground}
            />
          ) : null}
        />
      </div>
    </div>
  );
};

export default Funds;
