const ErrorAlert = ({ message }) => {
    if (!message) return null;
    return (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {message}
        </div>
    );
};

export default ErrorAlert;
