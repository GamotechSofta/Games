/** Shared MongoDB timeout / connectivity detection for API handlers. */
export function isMongoTimeoutError(error) {
    const name = error?.name || '';
    const message = String(error?.message || '');
    return (
        (name === 'MongoServerError' && error?.code === 50)
        || name === 'MongoNetworkTimeoutError'
        || name === 'MongoServerSelectionError'
        || name === 'MongooseError' && message.includes('buffering timed out')
        || message.includes('timed out')
        || message.includes('timeout')
    );
}

export const DB_QUERY_MS = Number.parseInt(process.env.DB_QUERY_MAX_MS || '12000', 10) || 12000;
