import React from 'react';
import Layout from '../components/Layout';
import { FaCog, FaCreditCard, FaHandHoldingUsd, FaShieldAlt } from 'react-icons/fa';

const Settings = () => {
    return (
        <Layout title="Settings">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                        <FaCog className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Account Settings</h1>
                        <p className="text-slate-500 text-xs">Payment configuration is now simplified</p>
                    </div>
                </div>

                <div className="glass-panel glass-panel-card p-4 rounded-xl border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/10">
                            <FaHandHoldingUsd className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                                Admin Collects Account
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-bold bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</span>
                            </h2>
                            <p className="text-slate-500 text-xs mt-0.5">
                                Admin handles collections and withdrawals. Your earnings continue through commission on player activity.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="glass-panel glass-panel-card p-4 rounded-xl border border-slate-200">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                            <FaCreditCard className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 mb-1">Deposit Handling</h2>
                            <p className="text-slate-500 text-sm">
                                Players now add funds through the payment gateway. No UPI ID setup is required in bookie settings.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="glass-panel glass-panel-card p-4 rounded-xl border border-slate-200">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                            <FaShieldAlt className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 mb-1">Withdrawals</h2>
                            <p className="text-slate-500 text-sm">
                                Withdrawal requests are reviewed from the admin side, so no payment collection settings are needed here.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Settings;
