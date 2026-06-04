const StatCard = ({ label, value, valueClass = 'text-gray-900' }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
    </div>
);

const StatsGrid = ({ stats }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Players" value={stats.total} />
        <StatCard label="Online now" value={stats.online} valueClass="text-teal-600" />
        <StatCard label="Had deposit" value={stats.withDeposit} valueClass="text-emerald-600" />
        <StatCard label="Had withdrawal" value={stats.withWithdrawal} valueClass="text-amber-600" />
        <StatCard label="Wallet add" value={stats.withWalletCredit} valueClass="text-cyan-600" />
        <StatCard label="Placed bet" value={stats.withBet} valueClass="text-indigo-600" />
    </div>
);

export default StatsGrid;
