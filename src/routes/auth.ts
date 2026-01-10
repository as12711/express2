import express, { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '../config/supabase.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Email and password are required' 
      })
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ 
        error: 'Service unavailable',
        message: 'Admin authentication service is not configured' 
      })
    }

    // Find user by email (case-insensitive)
    const { data: user, error: userError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .ilike('email', email.trim().toLowerCase())
      .single()

    if (userError || !user) {
      // Don't reveal if user exists or not (security best practice)
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Invalid email or password' 
      })
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ 
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact an administrator.' 
      })
    }

    // Check if password is set (first-time login)
    if (!user.password_hash) {
      return res.status(403).json({ 
        error: 'Password not set',
        message: 'Please set your password first',
        requiresPasswordSetup: true,
        email: user.email,
        name: user.name
      })
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash)
    if (!passwordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Invalid email or password' 
      })
    }

    // Generate JWT token (24 hour expiration)
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured')
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Authentication system not properly configured' 
      })
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        name: user.name 
      },
      jwtSecret,
      { expiresIn: '24h' }
    )

    // Update last login and activity timestamps
    await supabaseAdmin
      .from('admin_users')
      .update({ 
        last_login_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        first_login: false 
      })
      .eq('id', user.id)

    // Success response
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstLogin: user.first_login
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ 
      error: 'Server error',
      message: 'An unexpected error occurred during login' 
    })
  }
})

/**
 * POST /api/auth/setup-password
 * Set or update password (for first-time login or password reset)
 */
router.post('/setup-password', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Email and password are required' 
      })
    }

    // Password requirements validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        error: 'Password requirements not met',
        message: 'Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number' 
      })
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ 
        error: 'Service unavailable',
        message: 'Admin authentication service is not configured' 
      })
    }

    // Find user by email
    const { data: user, error: userError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .ilike('email', email.trim().toLowerCase())
      .single()

    if (userError || !user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'No account found with this email address' 
      })
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ 
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact an administrator.' 
      })
    }

    // Hash password
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Update user with password hash
    const { error: updateError } = await supabaseAdmin
      .from('admin_users')
      .update({ 
        password_hash: passwordHash,
        first_login: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Password update error:', updateError)
      throw updateError
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured')
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Authentication system not properly configured' 
      })
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        name: user.name 
      },
      jwtSecret,
      { expiresIn: '24h' }
    )

    // Update last login
    await supabaseAdmin
      .from('admin_users')
      .update({ 
        last_login_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      })
      .eq('id', user.id)

    // Success response
    res.json({
      success: true,
      message: 'Password set successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstLogin: false
      }
    })

  } catch (error) {
    console.error('Setup password error:', error)
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to set password. Please try again.' 
    })
  }
})

/**
 * GET /api/auth/verify
 * Verify JWT token and return user info
 */
router.get('/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Token is already verified by middleware, user info attached to req.user
    res.json({
      success: true,
      user: req.user
    })
  } catch (error) {
    console.error('Verify token error:', error)
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to verify token' 
    })
  }
})

/**
 * POST /api/auth/logout
 * Logout (client-side token removal, but update last activity)
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Update last activity before logout
    if (supabaseAdmin && req.user?.id) {
      await supabaseAdmin
        .from('admin_users')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', req.user.id)
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    console.error('Logout error:', error)
    // Even if update fails, return success since token removal is client-side
    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  }
})

/**
 * POST /api/auth/update-activity
 * Update last activity timestamp (called periodically from client)
 */
router.post('/update-activity', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (supabaseAdmin && req.user?.id) {
      await supabaseAdmin
        .from('admin_users')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', req.user.id)
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Update activity error:', error)
    res.json({ success: true }) // Don't fail silently for activity updates
  }
})

export default router
