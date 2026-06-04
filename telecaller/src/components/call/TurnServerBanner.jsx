import { useEffect, useState } from 'react';
import { getRtcConfiguration } from '../../services/iceConfigService';

/** Warn when API has no TURN — cross-network calls will fail. */
export default function TurnServerBanner() {
    const [turnOk, setTurnOk] = useState(true);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        getRtcConfiguration()
            .then((cfg) => setTurnOk(Boolean(cfg.turnConfigured)))
            .catch(() => setTurnOk(false))
            .finally(() => setChecked(true));
    }, []);

    if (!checked || turnOk) return null;

    return (
        <div className="mb-4 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-bold">Cross-network calls disabled on server</p>
            <p className="mt-1 text-red-800">
                The API has no TURN relay yet. Run your own{' '}
                <strong>coturn</strong> server (see{' '}
                <code className="text-xs bg-red-100 px-1 rounded">backend/turn-server/README.md</code>
                ), then set{' '}
                <code className="text-xs bg-red-100 px-1 rounded">TURN_URL</code>,{' '}
                <code className="text-xs bg-red-100 px-1 rounded">TURN_USERNAME</code>,{' '}
                <code className="text-xs bg-red-100 px-1 rounded">TURN_PASSWORD</code>
                {' '}
                on <strong>api.aakda.in</strong> and restart the backend.
            </p>
        </div>
    );
}
