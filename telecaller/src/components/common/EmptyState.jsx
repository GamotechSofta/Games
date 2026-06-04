const EmptyState = ({ message = 'No players found.' }) => (
    <p className="p-8 text-center text-gray-500">{message}</p>
);

export default EmptyState;
