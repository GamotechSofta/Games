const TableShell = ({ children, minWidth = '600px' }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth }}>
                {children}
            </table>
        </div>
    </div>
);

export default TableShell;
