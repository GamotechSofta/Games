import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ResponsiveSidebarLayout from '../components/ResponsiveSidebarLayout';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { backBtn } from '../styles/appTheme';
import FundsSidebar from './funds/FundsSidebar';
import FundsContentArea from './funds/FundsContentArea';

const AddFund = lazy(() => import('./funds/AddFund'));
const WithdrawFund = lazy(() => import('./funds/WithdrawFund'));
const BankDetail = lazy(() => import('./funds/BankDetail'));
const AddFundHistory = lazy(() => import('./funds/AddFundHistory'));
const WithdrawFundHistory = lazy(() => import('./funds/WithdrawFundHistory'));

const TAB_COMPONENTS = {
  'add-fund': AddFund,
  'withdraw-fund': WithdrawFund,
  'bank-detail': BankDetail,
  'add-fund-history': AddFundHistory,
  'withdraw-fund-history': WithdrawFundHistory,
};

function FundsTabFallback() {
  return (
    <div className="px-3 py-6 max-w-[520px] md:max-w-none mx-auto md:mx-0 animate-pulse space-y-4">
      <div className="h-32 rounded-2xl bg-gray-200 dark:bg-white/10" />
      <div className="h-12 rounded-xl bg-gray-200 dark:bg-white/10" />
      <div className="h-12 rounded-xl bg-gray-200 dark:bg-white/10" />
    </div>
  );
}

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
    },
  ]), [t]);

  const { isDesktop } = useBreakpoint();
  const tabParam = searchParams.get('tab');
  const defaultKey = 'add-fund';
  const [activeKey, setActiveKey] = useState(() =>
    tabParam && items.some((i) => i.key === tabParam) ? tabParam : defaultKey,
  );
  const [mobileView, setMobileView] = useState(() =>
    !isDesktop && tabParam && items.some((i) => i.key === tabParam) ? tabParam : null,
  );

  useEffect(() => {
    if (!tabParam || !items.some((i) => i.key === tabParam)) return;
    setActiveKey(tabParam);
    if (!isDesktop) setMobileView(tabParam);
  }, [tabParam, isDesktop, items]);

  const activeItem = items.find((i) => i.key === activeKey) || items[0];
  const mobileDetailItem = mobileView ? items.find((i) => i.key === mobileView) : null;
  const ActiveComponent = TAB_COMPONENTS[activeKey] || TAB_COMPONENTS[defaultKey];
  const showList = mobileView === null || isDesktop;
  const showContent = mobileView !== null || isDesktop;

  const setTabInUrl = useCallback(
    (key) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (key) next.set('tab', key);
          else next.delete('tab');
          next.delete('step');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleItemClick = useCallback(
    (key) => {
      if (key == null) return;
      setActiveKey(key);
      if (!isDesktop) {
        setMobileView(key);
        setTabInUrl(key);
      } else {
        setTabInUrl(key);
      }
    },
    [isDesktop, setTabInUrl],
  );

  const handleMobileBack = () => {
    setMobileView(null);
    if (!isDesktop) {
      navigate({ pathname: '/funds', search: '' }, { replace: true });
    }
  };

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

  const shouldRemoveCardBackground =
    mobileView === 'add-fund' ||
    mobileView === 'withdraw-fund' ||
    mobileView === 'bank-detail' ||
    mobileView === 'add-fund-history' ||
    mobileView === 'withdraw-fund-history';

  return (
    <div className="w-full text-gray-900 dark:text-white">
      <div className="mx-auto w-full max-w-[1440px] px-3 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-3 max-md:pl-[max(1rem,env(safe-area-inset-left,0px))] max-md:pr-[max(1rem,env(safe-area-inset-right,0px))] sm:px-4 md:pt-4 lg:px-6 xl:px-8">
        <div className="mb-2 shrink-0 md:mb-4 md:grid md:grid-cols-[360px_1fr] md:gap-6 md:items-center">
          <div className="flex items-center gap-3 px-1 py-2 md:px-0 md:py-0">
            <button
              type="button"
              onClick={handleBack}
              className={backBtn}
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
            <div className="text-2xl font-extrabold text-gray-900 dark:text-white">{activeItem?.title}</div>
          </div>
        </div>

        <ResponsiveSidebarLayout
          sidebar={
            showList ? (
              <FundsSidebar items={items} activeKey={activeKey} onItemClick={handleItemClick} />
            ) : null
          }
          content={
            showContent ? (
              <FundsContentArea
                isDesktop={isDesktop}
                activeItem={activeItem}
                ActiveComponent={ActiveComponent}
                mobileDetailItem={mobileDetailItem}
                shouldRemoveCardBackground={shouldRemoveCardBackground}
                tabFallback={<FundsTabFallback />}
              />
            ) : null
          }
        />
      </div>
    </div>
  );
};

export default Funds;
