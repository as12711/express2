import { body, validationResult } from 'express-validator';
/**
 * Validation rules for fatherhood signup
 */
export const signupValidation = [
    body('full_name')
        .trim()
        .notEmpty().withMessage('Full name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail(),
    body('phone_number')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .matches(/^[\d\s\-\(\)\+]+$/).withMessage('Please enter a valid phone number'),
    body('address')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('Address too long'),
    body('zip_code')
        .optional()
        .trim()
        .matches(/^\d{5}(-\d{4})?$/).withMessage('Please enter a valid ZIP code'),
    body('number_of_children')
        .optional()
        .isInt({ min: 0, max: 20 }).withMessage('Number of children must be between 0-20'),
    body('children_ages')
        .optional()
        .isArray().withMessage('Children ages must be an array'),
    body('referral_source')
        .optional()
        .trim()
        .isLength({ max: 100 }),
    body('interests')
        .optional()
        .isArray().withMessage('Interests must be an array'),
    body('availability')
        .optional()
        .trim()
        .isLength({ max: 255 }),
    body('additional_notes')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Additional notes too long'),
    body('consent_to_contact')
        .optional()
        .isBoolean().withMessage('Consent must be true or false'),
    body('consent_to_sms')
        .optional()
        .isBoolean().withMessage('SMS consent must be true or false')
];
/**
 * Validation middleware - checks for errors
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            message: 'Please check your input and try again',
            details: errors.array().map(err => ({
                field: err.type === 'field' ? err.path : 'unknown',
                message: err.msg
            }))
        });
    }
    next();
};
