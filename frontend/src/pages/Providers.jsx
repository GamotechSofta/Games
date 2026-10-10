import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaGamepad, FaSearch, FaTimes, FaLayerGroup } from 'react-icons/fa';
import { iconBtn, textPrimary } from '../styles/appTheme';
import { BACKEND_BASE_URL } from '../config/api';
import { getApiErrorMessage } from '../utils/apiErrorMessage';

const Providers = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch enabled games to calculate exact game count per provider
      const gamesRes = await fetch(`${BACKEND_BASE_URL}/api/game/enabled?currency=INR`).catch(() => null);
      let gamesList = [];
      if (gamesRes && gamesRes.ok) {
        const gamesData = await gamesRes.json();
        gamesList = Array.isArray(gamesData?.data)
          ? gamesData.data
          : Array.isArray(gamesData?.data?.message)
          ? gamesData.data.message
          : Array.isArray(gamesData?.message)
          ? gamesData.message
          : [];
      }

      // Count games per provider name / code
      const countMap = new Map();
      gamesList.forEach((g) => {
        const name = String(g.provider_details?.name || g.provider || '').trim();
        const code = String(g.provider_details?.code || g.provider || '').trim().toLowerCase();
        if (name) {
          countMap.set(name.toLowerCase(), (countMap.get(name.toLowerCase()) || 0) + 1);
        }
        if (code && code !== name.toLowerCase()) {
          countMap.set(code, (countMap.get(code) || 0) + 1);
        }
      });

      // 2. Fetch providers list from backend API
      let providerItems = [];
      try {
        const provRes = await fetch(`${BACKEND_BASE_URL}/api/game/providers`);
        if (provRes.ok) {
          const provData = await provRes.json();
          const list = Array.isArray(provData?.data)
            ? provData.data
            : Array.isArray(provData?.data?.message)
            ? provData.data.message
            : Array.isArray(provData?.message)
            ? provData.message
            : [];
          if (list.length > 0) {
            providerItems = list;
          }
        }
      } catch {
        // Fallback below
      }

      // 3. If API didn't return providers (or 404), extract directly from games
      if (providerItems.length === 0 && gamesList.length > 0) {
        const seen = new Set();
        gamesList.forEach((g) => {
          const name = String(g.provider_details?.name || g.provider || '').trim();
          const code = String(g.provider_details?.code || g.provider || '').trim();
          const id = g.provider_details?.id || code || name;
          if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            providerItems.push({
              id,
              name,
              code,
              image: '',
            });
          }
        });
      }

      // 4. Merge game counts & sort by game count descending (only active providers)
      const enriched = providerItems
        .map((p) => {
          const nameKey = String(p.name || '').trim().toLowerCase();
          const codeKey = String(p.code || '').trim().toLowerCase();
          const count = countMap.get(nameKey) || countMap.get(codeKey) || 0;
          return {
            ...p,
            gameCount: count,
          };
        })
        .filter((p) => p.gameCount > 0);

      enriched.sort((a, b) => b.gameCount - a.gameCount || a.name.localeCompare(b.name));
      setProviders(enriched);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load providers'));
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const filteredProviders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) => {
      const name = String(p.name || '').toLowerCase();
      const code = String(p.code || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [providers, searchQuery]);

  const handleSelectProvider = (provider) => {
    const queryName = provider.name || provider.code;
    navigate(`/games?provider=${encodeURIComponent(queryName)}`);
  };

  return (
    <div className="w-full text-gray-900 dark:text-white px-3 py-4 min-h-[50vh] flex flex-col max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={`w-10 h-10 flex items-center justify-center ${iconBtn}`}
            aria-label={t('common.back', { defaultValue: 'Back' })}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className={`text-xl font-bold ${textPrimary}`}>
              {t('providers.title', { defaultValue: 'Game Providers' })}
            </h1>
            {!loading && providers.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {providers.length} {t('providers.available', { defaultValue: 'providers available' })}
              </p>
            )}
          </div>
        </div>

        {/* Action button & Search */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => navigate('/games')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-white transition"
          >
            <FaGamepad className="text-sm text-[#d32f2f]" />
            <span>{t('games.viewAll', { defaultValue: 'All Games' })}</span>
          </button>

          {/* Search box */}
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('providers.search', { defaultValue: 'Search providers...' })}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] pl-9 pr-8 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#d32f2f]/50 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <FaTimes className="text-xs" />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-gray-200/80 animate-pulse dark:bg-white/10"
            />
          ))}
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center px-4 py-16">
          <FaLayerGroup className="mb-3 h-10 w-10 text-gray-400 dark:text-white/30" />
          <p className="text-lg font-semibold text-gray-700 dark:text-white/80">
            {searchQuery
              ? t('providers.noSearchResults', { defaultValue: 'No providers match your search' })
              : t('providers.noneAvailable', { defaultValue: 'No providers available' })}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            {searchQuery
              ? t('providers.tryDifferentSearch', { defaultValue: 'Try searching for another provider name.' })
              : t('providers.retryHint', { defaultValue: 'Could not load provider list. Please retry.' })}
          </p>
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 rounded-xl bg-gray-200 dark:bg-white/10 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-white"
            >
              {t('common.clearSearch', { defaultValue: 'Clear Search' })}
            </button>
          ) : (
            <button
              type="button"
              onClick={loadProviders}
              className="mt-4 rounded-xl bg-[#d32f2f] px-4 py-2 text-sm font-semibold text-white"
            >
              {t('common.retry', { defaultValue: 'Retry' })}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
          {filteredProviders.map((provider) => {
            const logo = String(provider.image || '').trim();
            const hasValidImage = logo && !logo.includes('no-image');

            return (
              <button
                key={provider.id || provider.code || provider.name}
                type="button"
                onClick={() => handleSelectProvider(provider)}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white  text-left shadow-sm hover:cursor-pointer transition  dark:border-white/10 dark:bg-[#1a1a1c]"
              >
                {/* Logo or placeholder box */}
                <div className="relative mb-3 flex aspect-[16/10] w-full items-center justify-center overflow-hidden  bg-white p-3 border border-gray-100 dark:border-white/5 group-hover:border-[#d32f2f]/30 transition">
                  {hasValidImage ? (
                    <img
                      src={logo}
                      alt={provider.name}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                  ) : null}

                  {/* Fallback stylized badge if logo is missing or fails */}
                  <div className={`flex flex-col items-center justify-center text-center ${hasValidImage ? 'hidden' : ''}`}>
                    <FaLayerGroup className="h-6 w-6 text-[#d32f2f] mb-1 opacity-80" />
                    <span className="text-xs font-black tracking-wider uppercase text-gray-900 truncate max-w-[120px]">
                      {provider.name}
                    </span>
                  </div>
                </div>

                {/* Info row */}
                <div className="px-3 pb-3 flex items-center justify-between gap-2 mt-auto">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs sm:text-sm font-bold text-gray-900 dark:text-white  transition" title={provider.name}>
                      {provider.name}
                    </p>
                  </div>
                  {provider.gameCount > 0 && (
                    <span className="shrink-0 rounded-full bg-red-500/10 dark:bg-red-500/20 px-2 py-0.5 text-[10px] font-bold  ">
                      {provider.gameCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Providers;
