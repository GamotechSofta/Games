import React, { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { FaEye, FaEyeSlash } from 'react-icons/fa';

import { useAuth } from '../context/AuthContext';

import { API_BASE_URL } from '../utils/api';



const ALLOWED_ROLES = new Set(['super_admin', 'specific_admin', 'telecaller']);

const PHONE_REGEX = /^[6-9]\d{9}$/;



const Login = () => {

    const [phone, setPhone] = useState('');

    const [password, setPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);

    const [error, setError] = useState('');

    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const { session, login } = useAuth();



    useEffect(() => {

        if (session?.token) navigate('/dashboard', { replace: true });

    }, [session, navigate]);



    const handleSubmit = async (e) => {

        e.preventDefault();

        setError('');

        const normalized = String(phone || '').replace(/\D/g, '').slice(0, 10);

        const p = password.trim();

        if (!normalized || !p) {

            setError('Mobile number and password are required');

            return;

        }

        if (!PHONE_REGEX.test(normalized)) {

            setError('Enter a valid 10-digit mobile number (starting with 6–9)');

            return;

        }

        setLoading(true);

        try {

            const response = await fetch(`${API_BASE_URL}/admin/login`, {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({ username: normalized, password: p }),

            });

            const data = await response.json();

            if (!data.success) {

                setError(data.message || 'Login failed');

                return;

            }

            if (data.data?.status === 'inactive') {

                setError('This account is inactive. Contact your admin.');

                return;

            }

            const role = data.data?.role;

            if (!ALLOWED_ROLES.has(role)) {

                setError('This account cannot access the telecaller panel. Use an admin login.');

                return;

            }

            if (role === 'specific_admin') {

                const tabs = data.data?.allowedTabs || [];

                if (!tabs.includes('/all-users') && !tabs.includes('/telecaller')) {

                    setError('Your admin account does not have access to the telecaller panel.');

                    return;

                }

            }

            login({

                ...data.data,

                phone: data.data?.phone || normalized,

            });

            navigate('/dashboard', { replace: true });

        } catch {

            setError('Network error. Check that the backend is running.');

        } finally {

            setLoading(false);

        }

    };



    return (

        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center p-4">

            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-200">

                <div className="text-center mb-8">

                    <div className="w-16 h-16 mx-auto mb-4 bg-teal-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">

                        TC

                    </div>

                    <h1 className="text-2xl font-bold text-gray-900">Telecaller Dashboard</h1>

                    <p className="text-gray-500 text-sm mt-1">Player deposits, withdrawals &amp; bets</p>

                </div>



                {error && (

                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">

                        {error}

                    </div>

                )}



                <form onSubmit={handleSubmit} className="space-y-5">

                    <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile number</label>

                        <input

                            type="tel"

                            inputMode="numeric"

                            value={phone}

                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}

                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"

                            autoComplete="tel"

                            placeholder="10-digit mobile"

                            required

                        />

                    </div>

                    <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>

                        <div className="relative">

                            <input

                                type={showPassword ? 'text' : 'password'}

                                value={password}

                                onChange={(e) => setPassword(e.target.value)}

                                className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"

                                autoComplete="current-password"

                                required

                            />

                            <button

                                type="button"

                                onClick={() => setShowPassword((v) => !v)}

                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"

                                aria-label={showPassword ? 'Hide password' : 'Show password'}

                            >

                                {showPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}

                            </button>

                        </div>

                    </div>

                    <button

                        type="submit"

                        disabled={loading}

                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"

                    >

                        {loading ? 'Signing in…' : 'Sign in'}

                    </button>

                </form>

            </div>

        </div>

    );

};



export default Login;

