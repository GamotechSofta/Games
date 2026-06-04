const Chip = ({ label, active }) => (
    <span
        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium border ${
            active
                ? 'bg-teal-50 text-teal-800 border-teal-200'
                : 'bg-gray-50 text-gray-400 border-gray-200'
        }`}
    >
        {label}
    </span>
);

const PlayerActivitySummary = ({ player }) => (
    <div className="flex flex-wrap gap-1">
        <Chip label="Deposit" active={!!player.lastDeposit} />
        <Chip label="Withdraw" active={!!player.lastWithdrawal} />
        <Chip label="Wallet" active={!!player.lastWalletCredit || !!player.lastWalletDebit} />
        <Chip label="Bet" active={!!player.lastBet} />
    </div>
);

export default PlayerActivitySummary;
