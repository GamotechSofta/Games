const CalledCheckbox = ({ checked, onChange, label = 'Called' }) => (
    <label
        className="inline-flex items-center gap-2 cursor-pointer select-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
    >
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => {
                e.stopPropagation();
                onChange(e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            aria-label={label}
        />
        <span className="text-xs text-gray-600 hidden sm:inline">{label}</span>
    </label>
);

export default CalledCheckbox;
