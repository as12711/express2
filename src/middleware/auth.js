import jwt from 'jsonwebtoken';
/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header
 */
export const authenticateToken = (req, res, next) => {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'No authentication token provided'
        });
    }
    try {
        // Verify token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET not configured');
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'Authentication system not properly configured'
            });
        }
        const decoded = jwt.verify(token, jwtSecret);
        // Attach user info to request object
        req.user = {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name
        };
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Token has expired. Please log in again.'
            });
        }
        else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token'
            });
        }
        console.error('Token verification error:', error);
        return res.status(500).json({
            error: 'Authentication error',
            message: 'Failed to verify authentication token'
        });
    }
};
