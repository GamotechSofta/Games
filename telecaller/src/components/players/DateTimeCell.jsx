import { formatDateTime, statusBadgeClass } from '../../utils/format';

/** Activity timestamp only — no amounts. */
const DateTimeCell = ({ at, status }) => {
    if (!at) {
        return <span className="text-gray-400 text-sm">Never</span>;
    }
    return (
        <div className="space-y-1">
            <p className="text-sm text-gray-900">{formatDateTime(at)}</p>
            {status && (
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border capitalize ${statusBadgeClass(status)}`}>
                    {status}
                </span>
            )}
        </div>
    );
};

export default DateTimeCell;
