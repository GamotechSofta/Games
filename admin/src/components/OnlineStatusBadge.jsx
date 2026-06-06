import React, { useState, useEffect } from 'react';
import { subscribeOnlineClock, computeIsOnline } from '../utils/onlineActivity';

const STYLES = {
    compact: {
        wrap: (on) => `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${on ? 'text-green-400' : 'text-gray-500'}`,
        dot: (on) => `w-1.5 h-1.5 rounded-full ${on ? 'bg-green-500' : 'bg-gray-500'}`,
    },
    minimal: {
        wrap: (on) => `inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${on ? 'text-green-400' : 'text-gray-500'}`,
        dot: (on) => `w-1.5 h-1.5 rounded-full ${on ? 'bg-green-500' : 'bg-gray-500'}`,
    },
    pill: {
        wrap: (on) => `inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
            on ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-gray-700 text-gray-400 border border-gray-600'
        }`,
        dot: (on) => `w-2 h-2 rounded-full ${on ? 'bg-green-500' : 'bg-gray-500'}`,
    },
};

const OnlineStatusBadge = ({ user, variant = 'pill' }) => {
    const [nowMs, setNowMs] = useState(() => Date.now());
    useEffect(() => subscribeOnlineClock(setNowMs), []);

    const online = computeIsOnline(user, nowMs);
    const style = STYLES[variant] || STYLES.pill;

    return (
        <span className={style.wrap(online)}>
            <span className={style.dot(online)} />
            {online ? 'Online' : 'Offline'}
        </span>
    );
};

export default OnlineStatusBadge;
