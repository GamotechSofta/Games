import { formatAmount, formatDateTime, statusBadgeClass } from '../../utils/format';

const BetCell = ({ bet }) => {
    if (!bet) return <span className="text-gray-400 text-sm">Never</span>;
    const market = bet.marketName || '—';
    return (
        <div className="space-y-0.5">
            <p className="font-mono text-sm font-medium text-gray-900">{formatAmount(bet.amount)}</p>
            <p className="text-xs text-gray-600 truncate max-w-[180px]" title={market}>
                {market}
                {bet.betNumber != null && bet.betNumber !== '' ? ` · ${bet.betNumber}` : ''}
            </p>
            <p className="text-xs text-gray-500">{formatDateTime(bet.createdAt)}</p>
            {bet.status && (
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border capitalize ${statusBadgeClass(bet.status)}`}>
                    {bet.status}
                </span>
            )}
        </div>
    );
};

export default BetCell;
