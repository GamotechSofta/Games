import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ResponsiveSidebarLayout from '../components/ResponsiveSidebarLayout';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { AddFund, WithdrawFund, BankDetail, AddFundHistory, WithdrawFundHistory } from './funds/index';
import FundsSidebar from './funds/FundsSidebar';
import FundsContentArea from './funds/FundsContentArea';

const Funds = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const items = useMemo(() => ([
    {
      key: 'add-fund',
      title: t('funds.addFund'),
      subtitle: t('funds.addFundSubtitle'),
      color: '#34a853',
      icon: <span className="text-3xl font-extrabold text-black leading-none">₹</span>,
      component: AddFund,
    },
    {
      key: 'withdraw-fund',
      title: t('funds.withdrawFund'),
      subtitle: t('funds.withdrawFundSubtitle'),
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
      title: t('funds.bankDetail'),
      subtitle: t('funds.bankDetailSubtitle'),
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
      title: t('funds.addFundHistory'),
      subtitle: t('funds.addFundHistorySubtitle'),
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
      title: t('funds.withdrawFundHistory'),
      subtitle: t('funds.withdrawFundHistorySubtitle'),
      color: '#f59e0b',
      icon: (
        <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5l3 2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 11-2.343-5.657" />
        </svg>
      ),
      component: WithdrawFundHistory,
    },
  ]), [t]);

  const { isDesktop } = useBreakpoint();
  const tabParam = searchParams.get('tab');
  const [activeKey, setActiveKey] = useState(() => (tabParam && items.some((i) => i.key === tabParam)) ? tabParam : (items[0]?.key || 'add-fund'));
  const [mobileView, setMobileView] = useState(() => (!isDesktop && tabParam && items.some((i) => i.key === tabParam)) ? tabParam : null); // mobile: null = list, key = detail
  const userJustSelectedTabRef = useRef(false);
  const lastSyncedTabRef = useRef(tabParam);

  // Sync activeKey to URL: on desktop always; on mobile push when opening a sub-view. Preserve other params (e.g. step) when updating tab.
  useEffect(() => {
    const desiredTab = (!isDesktop && mobileView === null) ? null : activeKey;
    if (desiredTab === null) {
      if (tabParam != null) {
        lastSyncedTabRef.current = null;
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('tab');
          next.delete('step');
          return next;
        }, { replace: true });
      }
      return;
    }
    if (lastSyncedTabRef.current === desiredTab) return;
    if (tabParam === desiredTab) return;
    lastSyncedTabRef.current = desiredTab;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', desiredTab);
      next.delete('step');
      return next;
    }, { replace: isDesktop });
  }, [activeKey, isDesktop, mobileView, tabParam]);

  // Sync tabParam from URL to state when navigating (e.g. device back or external link). Don't reset mobileView to list when tabParam is still null after a tap — URL updates async.
  useEffect(() => {
    if (tabParam && items.some((i) => i.key === tabParam)) {
      userJustSelectedTabRef.current = false;
      lastSyncedTabRef.current = tabParam;
      if (tabParam !== activeKey) {
        setActiveKey(tabParam);
      }
      if (!isDesktop && tabParam !== mobileView) {
        setMobileView(tabParam);
      }
    } else if (!tabParam || !items.some((i) => i.key === tabParam)) {
      lastSyncedTabRef.current = null;
      // No tab or invalid tab → show list. Don't reset when user just tapped a tab (URL hasn't updated yet).
      if (!userJustSelectedTabRef.current) {
        if (activeKey !== (items[0]?.key || 'add-fund')) {
          setActiveKey(items[0]?.key || 'add-fund');
        }
        if (!isDesktop && mobileView !== null) {
          setMobileView(null);
        }
      }
    }
  }, [tabParam, activeKey, mobileView, isDesktop, items]);

  // Device/hardware back: ensure we sync to list when user presses browser back (popstate).
  useEffect(() => {
    const handlePopState = () => {
      userJustSelectedTabRef.current = false;
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const activeItem = items.find((i) => i.key === activeKey) || items[0];
  const mobileDetailItem = mobileView ? items.find((i) => i.key === mobileView) : null;
  const ActiveComponent = activeItem?.component;
  const showList = mobileView === null || isDesktop;
  const showContent = mobileView !== null || isDesktop;

  const handleItemClick = useCallback((key) => {
    if (key == null) return;
    userJustSelectedTabRef.current = true;
    setActiveKey(key);
    if (!isDesktop) {
      setMobileView(key);
      // Do not setSearchParams here — the sync effect will push one history entry. Otherwise we push twice and device back needs two presses.
    }
  }, [isDesktop]);

  const handleMobileBack = () => {
    userJustSelectedTabRef.current = false;
    setMobileView(null);
    if (!isDesktop) {
      navigate({ pathname: '/funds', search: '' }, { replace: true });
    }
  };

  // Back from main Funds list: same behaviour as My Bets (desktop → home, mobile → prev or home).
  const isFundsPath = (p) => !p || p === '/funds' || p.startsWith('/funds?');
  const handleBack = () => {
    if (mobileView) {
      handleMobileBack();
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
              aria-label={t('common.back')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold">
              {showContent && !isDesktop ? (mobileDetailItem || activeItem)?.title : t('funds.fundsTitle')}
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
