import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';

const PHONE_REGEX = /^[6-9]\d{9}$/;

const Login = () => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { bookie, login } = useAuth();

    useEffect(() => {
        if (bookie) navigate('/dashboard');
    }, [bookie, navigate]);

    const handlePhoneChange = (e) => {
        setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!phone || !password) {
            setError('Phone number and password are required');
            return;
        }
        if (!PHONE_REGEX.test(phone)) {
            setError('Please enter a valid 10-digit phone number (starting with 6–9)');
            return;
        }
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/bookie/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone, password }),
            });

            const data = await response.json();

            if (data.success) {
                login(data.data);
                localStorage.setItem('bookiePassword', password);
                navigate('/dashboard');
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Network error. Please check if the server is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="glass-panel rounded-2xl p-8 w-full max-w-md relative z-10 shadow-2xl shadow-black/50">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent mb-2 tracking-tight">
                        Bookie Panel
                    </h1>
                    <p className="text-slate-400 text-sm">Secure access for authorized partners</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0"></div>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                                handlePhoneChange(e);
                                setError('');
                            }}
                            maxLength={10}
                            className="w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:bg-black/30 transition-all font-mono"
                            placeholder="10-digit mobile number"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
                            className="w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:bg-black/30 transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm uppercase tracking-wide shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                Authenticating...
                            </div>
                        ) : (
                            'Access Dashboard'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
