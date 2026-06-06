const ListFooter = ({ shown, total, loading }) => {
    if (loading || shown === 0) return null;
    return (
        <p className="mt-3 text-xs text-gray-500">
            Showing {shown} on this page · {total} matching · Auto-refresh every 5 min
        </p>
    );
};

export default ListFooter;
