exports.errorHandler = (err, req, res, next) => {
    console.error('Error:', err.stack);

    const errorResponse = {
        success: false,
        message: err.message || 'Internal Server Error'
    };

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        errorResponse.message = messages.join(', ');
        return res.status(400).json(errorResponse);
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        errorResponse.message = `${field} already exists`;
        return res.status(400).json(errorResponse);
    }

    // Mongoose CastError
    if (err.name === 'CastError') {
        errorResponse.message = 'Invalid resource ID';
        return res.status(400).json(errorResponse);
    }

    res.status(err.statusCode || 500).json(errorResponse);
};