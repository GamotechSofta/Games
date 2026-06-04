const LoadingSpinner = ({ message = 'Loading…' }) => (
    <div className="p-12 text-center">
        <div className="w-10 h-10 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500 text-sm">{message}</p>
    </div>
);

export default LoadingSpinner;
