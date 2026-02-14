import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

const SupportNew = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subject, setSubject] = useState('Support Request');
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
      setMessage({ type: 'error', text: 'Only image files (e.g. PNG, JPG) are allowed.' });
    }
    setScreenshots(list.length ? list : []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      setMessage({ type: 'error', text: 'Please login to submit a support request.' });
      return;
    }
    if (!description.trim()) {
      setMessage({ type: 'error', text: 'Please describe your problem.' });
      return;
    }
    setMessage({ type: '', text: '' });
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('subject', subject.trim() || 'Support Request');
      formData.append('description', description.trim());
      screenshots.forEach((file) => formData.append('screenshots', file));

      const response = await fetch(`${API_BASE_URL}/help-desk/tickets`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Your request has been submitted. We will get back to you soon.' });
        setDescription('');
        setScreenshots([]);
        const input = document.getElementById('support-screenshots');
        if (input) input.value = '';
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to submit. Please try again.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white px-3 sm:px-6 md:px-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-xl mx-auto">
        <div className="flex items-center gap-3 pt-4 pb-2">
          <button
            type="button"
            onClick={() => navigate('/support')}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all shrink-0"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Raise help ticket</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Describe your problem and attach screenshots if needed</p>
          </div>
        </div>

        {!userId && (
          <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm text-center">
            Please login to submit a support request.
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 p-4 sm:p-6 w-full">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="support-subject" className="block text-sm font-medium text-gray-400 mb-2">Subject</label>
              <input
                id="support-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Payment issue, Game error"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition"
                disabled={!userId}
              />
            </div>
            <div>
              <label htmlFor="support-description" className="block text-sm font-medium text-gray-400 mb-2">
                Describe your problem <span className="text-red-400">*</span>
              </label>
              <textarea
                id="support-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain your issue in detail..."
                rows={5}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 resize-y transition"
                disabled={!userId}
              />
            </div>
            <div>
              <label htmlFor="support-screenshots" className="block text-sm font-medium text-gray-400 mb-2">
                Screenshots (optional, max 5 images)
              </label>
              <input
                id="support-screenshots"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif"
                multiple
                onChange={handleFileChange}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-gradient-to-r file:from-amber-500 file:to-orange-600 file:text-black file:font-semibold file:cursor-pointer hover:file:opacity-90 transition"
                disabled={!userId}
              />
              {screenshots.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">{screenshots.length} file(s) selected</p>
              )}
            </div>
            {message.text && (
              <div
                className={`p-4 rounded-xl text-sm ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}
              >
                {message.text}
              </div>
            )}
            <button
              type="submit"
              disabled={!userId || loading}
              className="w-full px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl transition shadow-lg shadow-amber-500/20"
            >
              {loading ? 'Submitting...' : 'Submit ticket'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SupportNew;
