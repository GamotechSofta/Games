import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../config/api';
import {
  backBtn,
  bidAccent,
  bidAccentBold,
  bidBtnGhost,
  bidFieldLabel,
  bidInput,
  bidSurface,
  pageShell,
  surface,
  textMuted,
} from '../../styles/appTheme';

const SupportNew = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const userId = user?._id || user?.id;

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch (_) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setPageLoading(false);
    const onUserChange = () => {
      const r = localStorage.getItem('user');
      setUser(r ? JSON.parse(r) : null);
    };
    window.addEventListener('userLogin', onUserChange);
    window.addEventListener('userLogout', onUserChange);
    return () => {
      window.removeEventListener('userLogin', onUserChange);
      window.removeEventListener('userLogout', onUserChange);
    };
  }, []);

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length !== files.length) {
      setMessage({ type: 'error', text: t('support.onlyImagesAllowed') });
    }
    setScreenshots(list.length ? list : []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      setMessage({ type: 'error', text: t('support.loginRequired') });
      return;
    }
    if (!description.trim()) {
      setMessage({ type: 'error', text: t('support.descriptionRequired') });
      return;
    }
    if (!screenshots.length) {
      setMessage({ type: 'error', text: t('support.photosRequired') });
      return;
    }
    setMessage({ type: '', text: '' });
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('subject', t('support.supportRequestDefault'));
      formData.append('description', description.trim());
      screenshots.forEach((file) => formData.append('screenshots', file));

      const response = await fetch(`${API_BASE_URL}/help-desk/tickets`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: t('support.requestSent') });
        setDescription('');
        setScreenshots([]);
        const input = document.getElementById('support-screenshots');
        if (input) input.value = '';
      } else {
        setMessage({ type: 'error', text: data.message || t('support.somethingWentWrong') });
      }
    } catch (err) {
      setMessage({ type: 'error', text: t('support.networkError') });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    try {
      const prev = sessionStorage.getItem('prevPathname');
      if (prev && prev !== '/support' && prev !== '/support/new' && prev !== '/support/status') {
        navigate(prev, { replace: false });
        return;
      }
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/', { replace: true });
      }
    } catch (_) {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className={`${pageShell} px-4 sm:px-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]`}>
      <div className="max-w-lg mx-auto pt-4 sm:pt-6">
        <div className="flex items-center gap-3 mb-5 sm:mb-6 relative z-10">
          <button type="button" onClick={handleBack} className={backBtn} aria-label="Back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{t('support.title')}</h1>
            <p className={`text-xs sm:text-sm mt-0.5 ${textMuted}`}>{t('support.subtitle')}</p>
          </div>
        </div>

        {pageLoading ? (
          <div className={`rounded-2xl p-5 space-y-4 skeleton-shimmer ${surface}`}>
            <div className="h-4 w-28 bg-gray-200 dark:bg-white/10 rounded" />
            <div className="h-24 w-full bg-gray-200 dark:bg-white/10 rounded-xl" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-white/10 rounded" />
            <div className="h-10 w-40 bg-gray-200 dark:bg-white/10 rounded-lg" />
            <div className="h-12 w-full bg-gray-200 dark:bg-white/10 rounded-xl" />
          </div>
        ) : !userId ? (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-5 text-center text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-200 text-sm">
            {t('support.loginRequired')}
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className={`rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm ${bidSurface}`}
            >
              <div>
                <label htmlFor="support-description" className={`block text-sm font-medium mb-2 ${bidFieldLabel}`}>
                  {t('support.descriptionLabel')} <span className={bidAccentBold}>*</span>
                </label>
                <textarea
                  id="support-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('support.descriptionPlaceholder')}
                  rows={5}
                  className={`w-full px-4 py-3 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-200 dark:focus:ring-white/10 focus:border-red-500 dark:focus:border-white/35 ${bidInput}`}
                />
              </div>

              <div>
                <label htmlFor="support-screenshots" className={`block text-sm font-medium mb-2 ${bidFieldLabel}`}>
                  {t('support.photosLabel')} <span className={bidAccentBold}>*</span>
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    id="support-screenshots"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="support-screenshots"
                    className={`inline-flex items-center justify-center py-2.5 px-4 rounded-xl font-semibold cursor-pointer text-sm transition active:scale-[0.98] ${bidBtnGhost}`}
                  >
                    <svg className="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {t('support.chooseFiles')}
                  </label>
                  <span className={`text-sm ${textMuted}`}>
                    {screenshots.length > 0
                      ? t('support.photosAdded', { count: screenshots.length })
                      : t('support.noFileChosen')}
                  </span>
                </div>
                {screenshots.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {screenshots.map((file, i) => (
                      <span
                        key={`${file.name}-${i}`}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 dark:bg-white/10 dark:text-gray-200 dark:border-white/20"
                      >
                        {file.name.length > 20 ? `${file.name.slice(0, 18)}…` : file.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {message.text && (
                <div
                  className={`p-3 rounded-xl text-sm border ${
                    message.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
                      : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:opacity-50 text-white font-semibold shadow-md transition active:scale-[0.98] dark:border dark:border-white/20"
              >
                {loading ? t('support.sending') : t('support.sendRequest')}
              </button>
            </form>

            <p className="mt-6 text-center">
              <Link
                to="/support/status"
                className={`inline-flex items-center gap-1.5 py-2 px-4 text-sm font-semibold rounded-xl border border-red-200 dark:border-white/20 transition hover:bg-red-50 dark:hover:bg-white/10 ${bidAccent}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {t('support.viewTickets')}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default SupportNew;
