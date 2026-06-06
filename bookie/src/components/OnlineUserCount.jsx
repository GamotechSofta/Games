import React, { useState, useEffect, useMemo } from 'react';
import { subscribeOnlineClock, computeIsOnline } from '../utils/onlineActivity';

const OnlineUserCount = ({ users }) => {
    const [nowMs, setNowMs] = useState(() => Date.now());
    useEffect(() => subscribeOnlineClock(setNowMs), []);

    const count = useMemo(
        () => (users || []).filter((u) => computeIsOnline(u, nowMs)).length,
        [users, nowMs],
    );

    return count;
};

export default OnlineUserCount;
