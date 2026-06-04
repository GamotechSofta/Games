import { FaTimes } from 'react-icons/fa';
import PhoneLink from '../layout/PhoneLink';
import PlayerStatusBadge from './PlayerStatusBadge';
import DateTimeCell from './DateTimeCell';
import DetailRow from './DetailRow';
import CalledCheckbox from './CalledCheckbox';
import CallSummaryBox from './CallSummaryBox';

const PlayerDetailModal = ({
    player,
    onClose,
    isCalled = false,
    onToggleCalled,
    callSummary = '',
    onSaveCallSummary,
    summarySaving = false,
    summaryDisabled = false,
}) => {
    if (!player) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-detail-title"
        >
            <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label="Close"
                onClick={onClose}
            />
            <div className="relative bg-white w-full sm:max-w-lg max-h-[92vh] sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
                <div className="px-4 py-4 border-b border-gray-200 flex items-start justify-between gap-3 shrink-0">
                    <div className="min-w-0">
                        <h2 id="player-detail-title" className="text-lg font-bold text-gray-900 truncate">
                            {player.username || 'Player'}
                        </h2>
                        <div className="mt-2">
                            <PhoneLink phone={player.phone} />
                        </div>
                        <div className="mt-2">
                            <PlayerStatusBadge player={player} />
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 shrink-0"
                        aria-label="Close"
                    >
                        <FaTimes className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto px-4 py-2 flex-1">
                    <p className="text-xs text-gray-500 py-2">
                        All activity for this player (no payment or bet amounts).
                    </p>
                    <dl>
                        <DetailRow label="Mobile">
                            <PhoneLink phone={player.phone} />
                        </DetailRow>
                        <DetailRow label="Last deposit">
                            <DateTimeCell at={player.lastDeposit?.createdAt} status={player.lastDeposit?.status} />
                        </DetailRow>
                        <DetailRow label="Last withdrawal">
                            <DateTimeCell at={player.lastWithdrawal?.createdAt} status={player.lastWithdrawal?.status} />
                        </DetailRow>
                        <DetailRow label="Last wallet add">
                            <DateTimeCell at={player.lastWalletCredit?.createdAt} />
                        </DetailRow>
                        <DetailRow label="Last wallet deduct">
                            <DateTimeCell at={player.lastWalletDebit?.createdAt} />
                        </DetailRow>
                        <DetailRow label="Last bet">
                            <DateTimeCell at={player.lastBet?.createdAt} status={player.lastBet?.status} />
                        </DetailRow>
                    </dl>
                    {onSaveCallSummary && (
                        <CallSummaryBox
                            savedValue={callSummary}
                            onSave={onSaveCallSummary}
                            saving={summarySaving}
                            disabled={summaryDisabled}
                        />
                    )}
                </div>

                <div className="px-4 py-3 border-t border-gray-200 shrink-0 space-y-2">
                    {onToggleCalled && (
                        <div className="flex items-center justify-center py-1">
                            <CalledCheckbox
                                checked={isCalled}
                                onChange={onToggleCalled}
                                label="Mark call as done"
                            />
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PlayerDetailModal;
