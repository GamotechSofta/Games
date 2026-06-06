import React, { useState, useEffect } from 'react';
import { subscribeOnlineClock, computeIsOnline } from '../utils/onlineActivity';

const OnlineStatusBadge = ({ user }) => {
    const [nowMs, setNowMs] = useState(() => Date.now());
    useEffect(() => subscribeOnlineClock(setNowMs), []);

    const online = computeIsOnline(user, nowMs);

    return (
        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold border ${
            online ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-700/30 text-slate-400 border-slate-700/50'
        }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-500'}`} />
            {online ? 'Online' : 'Offline'}
        </div>
    );
};

export default OnlineStatusBadge;
