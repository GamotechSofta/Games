import { computeIsOnline } from '../../utils/playerActivity';

const PlayerStatusBadge = ({ player }) => {
    const online = computeIsOnline(player);
    const suspended = player.isBlocked || player.isActive === false;

    return (
        <div className="flex flex-col gap-1">
            <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border w-fit ${
                    online
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}
            >
                <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                {online ? 'Online' : 'Offline'}
            </span>
            {suspended && (
                <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-800 border border-amber-200 w-fit">
                    Suspended
                </span>
            )}
        </div>
    );
};

export default PlayerStatusBadge;
