export function isMongoTimeoutError(error) {
    const name = error?.name || '';
    const message = String(error?.message || '');
    return (
        (name === 'MongoServerError' && error?.code === 50)
        || name === 'MongoNetworkTimeoutError'
        || name === 'MongoServerSelectionError'
        || name === 'MongoWaitQueueTimeoutError'
        || name === 'WaitQueueTimeoutError'
        || (name === 'MongooseError' && message.includes('buffering timed out'))
        || message.includes('timed out')
        || message.includes('timeout')
        || message.includes('WaitQueue')
    );
}

export function mongoTimeoutResponse(res, message = 'Database is slow or unreachable. Please try again.') {
    return res.status(503).json({
        success: false,
        message,
        code: 'DB_TIMEOUT',
    });
}
