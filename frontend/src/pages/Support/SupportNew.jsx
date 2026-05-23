import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../config/api';
import { bidAccent, iconBtn, inputSurface, textMuted } from '../../styles/appTheme';

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
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 dark:bg-black dark:text-white px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-md mx-auto pt-4">
        {/* Header - relative z-10 to ensure back button is above any overlay */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <button
            type="button"
            onClick={handleBack}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 touch-manipulation cursor-pointer active:scale-95 select-none ${iconBtn}`}
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t('support.title')}</h1>
            <p className="text-xs text-gray-500">{t('support.subtitle')}</p>
          </div>
        </div>

        {pageLoading ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white border border-gray-200 dark:bg-[#1a1a1a] dark:border-white/10 p-4 space-y-3 skeleton-shimmer">
              <div className="h-4 w-28 bg-gray-200 dark:bg-white/10 rounded" />
              <div className="h-12 w-full bg-gray-200 dark:bg-white/10 rounded-xl" />
            </div>
            <div className="rounded-2xl bg-white border border-gray-200 dark:bg-[#1a1a1a] dark:border-white/10 p-4 space-y-3 skeleton-shimmer">
              <div className="h-4 w-32 bg-gray-200 dark:bg-white/10 rounded" />
              <div className="h-24 w-full bg-gray-200 dark:bg-white/10 rounded-xl" />
            </div>
            <div className="rounded-2xl bg-white border border-gray-200 dark:bg-[#1a1a1a] dark:border-white/10 p-4 skeleton-shimmer">
              <div className="h-4 w-24 bg-gray-200 dark:bg-white/10 rounded mb-3" />
              <div className="h-10 w-full bg-gray-200 dark:bg-white/10 rounded-lg" />
            </div>
            <div className="h-12 w-full rounded-xl bg-gray-200 dark:bg-white/10 skeleton-shimmer" />
          </div>
        ) : !userId ? (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200 text-sm">
            {t('support.loginRequired')}
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="support-description" className={`block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1.5`}>
                  {t('support.descriptionLabel')} <span className="text-amber-700 dark:text-amber-400">*</span>
                </label>
                <textarea
                  id="support-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('support.descriptionPlaceholder')}
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 resize-none ${inputSurface}`}
                />
              </div>

              <div>
                <label htmlFor="support-screenshots" className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1.5">
                  {t('support.photosLabel')} <span className="text-amber-700 dark:text-amber-400">*</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
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
                    className="inline-flex py-2 px-3 rounded-lg bg-amber-500 text-black font-medium cursor-pointer text-sm hover:bg-amber-400 transition"
                  >
                    {t('support.chooseFiles')}
                  </label>
                  <span className={`text-sm ${textMuted}`}>
                    {screenshots.length > 0 ? t('support.photosAdded', { count: screenshots.length }) : t('support.noFileChosen')}
                  </span>
                </div>
              </div>

              {message.text && (
                <div
                  className={`p-3 rounded-xl text-sm ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30'
                      : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold transition"
              >
                {loading ? t('support.sending') : t('support.sendRequest')}
              </button>
            </form>

            <p className="mt-6 text-center">
              <Link
                to="/support/status"
                className={`inline-block py-2 px-4 text-sm font-medium underline underline-offset-2 touch-manipulation cursor-pointer hover:opacity-80 ${bidAccent}`}
              >
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
