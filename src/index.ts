import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import fatherhoodRoutes from './routes/fatherhood.js'
import authRoutes from './routes/auth.js'

const app = express()

// Configure helmet FIRST with proper CORS-friendly settings
// This ensures helmet doesn't interfere with CORS headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow CORS
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://as12711.github.io"]
    }
  }
}))

// CORS configuration - comes after helmet to ensure CORS headers are properly applied
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? (process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || ['https://as12711.github.io'])
  : ['http://localhost:3000', 'http://localhost:19006', 'http://localhost:8081', 'http://127.0.0.1:5500', 'http://localhost:5500', '*']

const isDevelopment = process.env.NODE_ENV === 'development'
const isDebugMode = process.env.CORS_DEBUG === 'true' || isDevelopment

// Log CORS configuration on startup (useful for debugging production issues)
if (isDebugMode) {
  console.log('CORS Configuration:', {
    environment: process.env.NODE_ENV,
    allowedOrigins,
    credentials: true
  })
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    if (!origin) {
      if (isDebugMode) {
        console.log('CORS: Allowing request with no origin header')
      }
      return callback(null, true)
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      if (isDebugMode) {
        console.log(`CORS: Allowing origin: ${origin}`)
      }
      callback(null, true)
    } else {
      if (isDebugMode) {
        console.log(`CORS: Blocking origin: ${origin}`)
      }
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Safety middleware to guarantee Access-Control-Allow-Origin is set on all responses
// This acts as a fallback to ensure the header is present even if helmet or other middleware interferes
// The validation logic intentionally mirrors the cors package above for consistency
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin
  if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
    // Ensure the header is set even if helmet or other middleware interferes
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
  next()
})

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
// Public authentication routes
app.use('/api/auth', authRoutes)

// Fatherhood routes
app.use('/api/fatherhood', fatherhoodRoutes)

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    service: 'Fatherhood Initiative API',
    timestamp: new Date().toISOString() 
  })
})

// API health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    service: 'Fatherhood Initiative API',
    timestamp: new Date().toISOString() 
  })
})

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({ 
    message: 'Man Up! Inc. Fatherhood Initiative API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      signup: 'POST /api/fatherhood/signup',
      signups: 'GET /api/fatherhood/signups',
      auth: {
        login: 'POST /api/auth/login',
        verify: 'GET /api/auth/verify',
        logout: 'POST /api/auth/logout'
      }
    }
  })
})

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.stack)
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  })
})

export default app
