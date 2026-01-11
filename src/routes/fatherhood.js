import express from 'express';
import rateLimit from 'express-rate-limit';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { signupValidation, validate } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
// Rate limiting for signup endpoint
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per hour
    message: {
        error: 'Too many signup attempts',
        message: 'Too many signup attempts from this IP, please try again later.'
    }
});
/**
 * POST /api/fatherhood/signup
 * Register a new participant for the Fatherhood Initiative (public endpoint)
 */
router.post('/signup', signupLimiter, ...signupValidation, validate, async (req, res) => {
    try {
        const { full_name, email, phone_number, address, zip_code, number_of_children, children_ages, referral_source, interests, availability, additional_notes, consent_to_contact, consent_to_sms } = req.body;
        // Check for existing email
        const { data: existing, error: checkError } = await supabase
            .from('fatherhood_signups')
            .select('id')
            .ilike('email', email)
            .maybeSingle();
        if (checkError) {
            console.error('Email check error:', checkError);
        }
        if (existing) {
            return res.status(409).json({
                error: 'Email already registered',
                message: 'This email is already signed up for the Fatherhood Initiative. If you need to update your information, please contact fatherhood@manupinc.org'
            });
        }
        // Insert new signup
        const { data, error } = await supabase
            .from('fatherhood_signups')
            .insert([{
                full_name,
                email: email.toLowerCase(),
                phone_number,
                address: address || null,
                zip_code: zip_code || null,
                number_of_children: number_of_children || null,
                children_ages: children_ages || null,
                referral_source: referral_source || null,
                interests: interests || null,
                availability: availability || null,
                additional_notes: additional_notes || null,
                consent_to_contact: consent_to_contact !== false,
                consent_to_sms: consent_to_sms || false,
                status: 'pending'
            }])
            .select()
            .single();
        if (error) {
            console.error('Supabase insert error:', error);
            // Handle unique constraint violation
            if (error.code === '23505') {
                return res.status(409).json({
                    error: 'Email already registered',
                    message: 'This email is already signed up.'
                });
            }
            return res.status(500).json({
                error: 'Failed to save signup',
                message: 'We couldn\'t process your signup. Please try again or contact fatherhood@manupinc.org'
            });
        }
        console.log(`✅ New Fatherhood signup: ${data.full_name} (${data.email})`);
        // Success response
        res.status(201).json({
            success: true,
            message: 'Thank you for signing up for the Fatherhood Initiative!',
            data: {
                full_name: data.full_name,
                email: data.email,
                signup_date: data.signup_date
            }
        });
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'An unexpected error occurred. Please try again.'
        });
    }
});
/**
 * GET /api/fatherhood/signups
 * Get all signups (admin only - requires authentication)
 */
router.get('/signups', authenticateToken, async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(503).json({
                error: 'Admin access not configured',
                message: 'SUPABASE_SERVICE_KEY is required for this endpoint'
            });
        }
        const { status, limit, offset = '0' } = req.query;
        let query = supabaseAdmin
            .from('fatherhood_signups')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });
        // Apply pagination only if limit is specified
        if (limit) {
            const offsetNum = parseInt(offset);
            const limitNum = parseInt(limit);
            query = query.range(offsetNum, offsetNum + limitNum - 1);
        }
        if (status) {
            query = query.eq('status', status);
        }
        const { data, error, count } = await query;
        if (error) {
            console.error('Fetch signups error:', error);
            throw error;
        }
        const response = {
            success: true,
            data
        };
        // Include pagination info only if limit was specified
        if (limit) {
            const offsetNum = parseInt(offset);
            const limitNum = parseInt(limit);
            response.pagination = {
                total: count,
                limit: limitNum,
                offset: offsetNum,
                hasMore: (offsetNum + (data?.length || 0)) < (count || 0)
            };
        }
        res.json(response);
    }
    catch (error) {
        console.error('Get signups error:', error);
        res.status(500).json({
            error: 'Failed to fetch signups',
            message: 'Could not retrieve signup data'
        });
    }
});
/**
 * GET /api/fatherhood/signups/:id
 * Get a specific signup by ID (admin only)
 */
router.get('/signups/:id', authenticateToken, async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(503).json({
                error: 'Admin access not configured'
            });
        }
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('fatherhood_signups')
            .select('*')
            .eq('id', id)
            .single();
        if (error || !data) {
            return res.status(404).json({
                error: 'Signup not found'
            });
        }
        res.json({ success: true, data });
    }
    catch (error) {
        console.error('Get signup error:', error);
        res.status(500).json({ error: 'Failed to fetch signup' });
    }
});
/**
 * PATCH /api/fatherhood/signups/:id/status
 * Update signup status (admin only)
 */
router.patch('/signups/:id/status', authenticateToken, async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(503).json({
                error: 'Admin access not configured'
            });
        }
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['pending', 'contacted', 'enrolled', 'inactive', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                validStatuses
            });
        }
        const { data, error } = await supabaseAdmin
            .from('fatherhood_signups')
            .update({ status })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        console.log(`📝 Updated signup ${id} status to: ${status}`);
        res.json({ success: true, data });
    }
    catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});
/**
 * GET /api/fatherhood/stats
 * Get signup statistics (admin only)
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(503).json({
                error: 'Admin access not configured'
            });
        }
        // Get total count
        const { count: total } = await supabaseAdmin
            .from('fatherhood_signups')
            .select('*', { count: 'exact', head: true });
        // Get counts by status
        const { data: statusData } = await supabaseAdmin
            .from('fatherhood_signups')
            .select('status');
        const statusCounts = statusData?.reduce((acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
        }, {}) || {};
        // Get this week's signups
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count: thisWeek } = await supabaseAdmin
            .from('fatherhood_signups')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', weekAgo.toISOString());
        res.json({
            success: true,
            stats: {
                total,
                thisWeek,
                byStatus: statusCounts
            }
        });
    }
    catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
/**
 * PUT /api/fatherhood/signups/:id
 * Update a participant (admin only)
 */
router.put('/signups/:id', authenticateToken, async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(503).json({
                error: 'Admin access not configured'
            });
        }
        const { id } = req.params;
        const updateData = { ...req.body };
        // Remove fields that shouldn't be updated directly
        delete updateData.id;
        delete updateData.created_at;
        const { data, error } = await supabaseAdmin
            .from('fatherhood_signups')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        if (!data) {
            return res.status(404).json({
                error: 'Participant not found'
            });
        }
        console.log(`📝 Updated participant ${id}`);
        res.json({ success: true, data });
    }
    catch (error) {
        console.error('Update participant error:', error);
        res.status(500).json({ error: 'Failed to update participant' });
    }
});
/**
 * POST /api/fatherhood/signups (admin manual entry)
 * Create a new participant manually (admin only)
 */
router.post('/signups', authenticateToken, async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(503).json({
                error: 'Admin access not configured'
            });
        }
        const insertData = {
            ...req.body,
            entry_source: req.body.entry_source || 'manual'
        };
        const { data, error } = await supabaseAdmin
            .from('fatherhood_signups')
            .insert([insertData])
            .select()
            .single();
        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({
                    error: 'Email already exists',
                    message: 'A participant with this email already exists.'
                });
            }
            throw error;
        }
        console.log(`✅ Admin created participant: ${data.full_name} (${data.email})`);
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        console.error('Create participant error:', error);
        res.status(500).json({
            error: 'Failed to create participant',
            message: error.message
        });
    }
});
/**
 * DELETE /api/fatherhood/signups/:id
 * Delete a participant (admin only)
 */
router.delete('/signups/:id', authenticateToken, async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(503).json({
                error: 'Admin access not configured'
            });
        }
        const { id } = req.params;
        const { error } = await supabaseAdmin
            .from('fatherhood_signups')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        console.log(`🗑️  Deleted participant ${id}`);
        res.json({ success: true, message: 'Participant deleted successfully' });
    }
    catch (error) {
        console.error('Delete participant error:', error);
        res.status(500).json({ error: 'Failed to delete participant' });
    }
});
export default router;
