import { formatAmount, formatDateTime, statusBadgeClass } from '../../utils/format';

const ActivityCell = ({ amount, at, status, extra }) => {
    if (!amount && !at) {
        return <span className="text-gray-400 text-sm">Never</span>;
    }
    return (
        <div className="space-y-0.5">
            <p className="font-mono text-sm font-medium text-gray-900">{formatAmount(amount)}</p>
            <p className="text-xs text-gray-500">{formatDateTime(at)}</p>
            {extra && (
                <p className="text-xs text-gray-600 truncate max-w-[180px]" title={extra}>
                    {extra}
                </p>
            )}
            {status && (
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border capitalize ${statusBadgeClass(status)}`}>
                    {status}
                </span>
            )}
        </div>
    );
};

export default ActivityCell;
