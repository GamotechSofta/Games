const DetailRow = ({ label, children }) => (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-gray-100 last:border-0">
        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide sm:w-36 shrink-0 pt-0.5">
            {label}
        </dt>
        <dd className="text-sm text-gray-900 flex-1 min-w-0">{children}</dd>
    </div>
);

export default DetailRow;
