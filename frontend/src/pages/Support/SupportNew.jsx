import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

const SupportNew = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [subject, setSubject] = useState('');
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
      setMessage({ type: 'error', text: 'Only images (PNG, JPG) allowed.' });
    }
    setScreenshots(list.length ? list : []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      setMessage({ type: 'error', text: 'Please login first.' });
      return;
    }
    if (!description.trim()) {
      setMessage({ type: 'error', text: 'Please describe your issue.' });
      return;
    }
    setMessage({ type: '', text: '' });
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('subject', (subject.trim() || 'Support Request'));
      formData.append('description', description.trim());
      screenshots.forEach((file) => formData.append('screenshots', file));

      const response = await fetch(`${API_BASE_URL}/help-desk/tickets`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Request sent. We’ll reply within 24 hours.' });
        setSubject('');
        setDescription('');
        setScreenshots([]);
        const input = document.getElementById('support-screenshots');
        if (input) input.value = '';
      } else {
        setMessage({ type: 'error', text: data.message || 'Something went wrong. Try again.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    try {
      const prev = sessionStorage.getItem('prevPathname');
      if (prev && prev !== '/support' && prev !== '/support/new') {
        navigate(prev);
        return;
      }
    } catch (_) {}
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-md mx-auto pt-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="min-w-[44px] min-h-[44px] rounded-full bg-white/10 flex items-center justify-center shrink-0 touch-manipulation"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Support</h1>
            <p className="text-xs text-gray-500">We reply within 24 hours</p>
          </div>
        </div>

        {pageLoading ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#1a1a1a] border border-white/10 p-4 space-y-3 skeleton-shimmer">
              <div className="h-4 w-28 bg-white/10 rounded" />
              <div className="h-12 w-full bg-white/10 rounded-xl" />
            </div>
            <div className="rounded-2xl bg-[#1a1a1a] border border-white/10 p-4 space-y-3 skeleton-shimmer">
              <div className="h-4 w-32 bg-white/10 rounded" />
              <div className="h-24 w-full bg-white/10 rounded-xl" />
            </div>
            <div className="rounded-2xl bg-[#1a1a1a] border border-white/10 p-4 skeleton-shimmer">
              <div className="h-4 w-24 bg-white/10 rounded mb-3" />
              <div className="h-10 w-full bg-white/10 rounded-lg" />
            </div>
            <div className="h-12 w-full rounded-xl bg-white/10 skeleton-shimmer" />
          </div>
        ) : !userId ? (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-center text-amber-200 text-sm">
            Please log in to send a request.
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="support-subject" className="block text-sm text-gray-400 mb-1.5">
                  What’s it about?
                </label>
                <input
                  id="support-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Payment, Game, Account"
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label htmlFor="support-description" className="block text-sm text-gray-400 mb-1.5">
                  What happened? <span className="text-amber-400">*</span>
                </label>
                <textarea
                  id="support-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your issue in a few lines..."
                  rows={4}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              <div>
                <label htmlFor="support-screenshots" className="block text-sm text-gray-400 mb-1.5">
                  Add photos (optional)
                </label>
                <input
                  id="support-screenshots"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  multiple
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-amber-500 file:text-black file:font-medium file:cursor-pointer"
                />
                {screenshots.length > 0 && (
                  <p className="mt-1.5 text-xs text-gray-500">{screenshots.length} photo(s) added</p>
                )}
              </div>

              {message.text && (
                <div
                  className={`p-3 rounded-xl text-sm ${
                    message.type === 'success'
                      ? 'bg-green-500/10 text-green-300 border border-green-500/30'
                      : 'bg-red-500/10 text-red-300 border border-red-500/30'
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
                {loading ? 'Sending...' : 'Send request'}
              </button>
            </form>

            <p className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navigate('/support/status')}
                className="text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2"
              >
                View my tickets
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default SupportNew;
