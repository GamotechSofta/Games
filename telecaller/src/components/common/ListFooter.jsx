const ListFooter = ({ shown, total, loading }) => {
    if (loading || shown === 0) return null;
    return (
        <p className="mt-3 text-xs text-gray-500">
            Showing {shown} of {total} players · Auto-refresh every 60s
        </p>
    );
};

export default ListFooter;
