import { formatAmount } from '../../utils/format';

const WalletBalanceCell = ({ balance }) => {
    const n = Number(balance);
    if (!Number.isFinite(n)) {
        return <span className="text-gray-400 text-sm">—</span>;
    }
    return (
        <p className="font-mono text-sm font-semibold text-teal-700">
            {formatAmount(n)}
        </p>
    );
};

export default WalletBalanceCell;
