import express, { type Express } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'

import { env } from './config/env'
import { createContainer, type Container } from './container'
import { createApiRouter } from './routes'
import { generalLimiter } from './middleware/rateLimiters'
import { notFoundHandler } from './middleware/notFoundHandler'
import { errorHandler } from './middleware/errorHandler'

/**
 * Builds the Express application.
 *
 * Exported as a factory returning the app *without* starting a listener, so the
 * test suite can drive it through Supertest in-process while server.ts owns the
 * real port binding. Middleware order below is deliberate — see comments.
 *
 * Accepts a container so a test can inject stub repositories; defaults to the
 * real object graph.
 */
export function createApp(container: Container = createContainer()): Express {
  const app = express()

  // Behind Render/Railway/Heroku/nginx, TRUST_PROXY must be the real hop count
  // or every client shares the proxy's IP. Off by default: trusting
  // X-Forwarded-For with no proxy in front lets a client pick its own IP and
  // walk straight past the login rate limit. See env.ts.
  app.set('trust proxy', env.trustProxy)

  // Hide the framework fingerprint.
  app.disable('x-powered-by')

  // 1. Security headers first, so they apply even to responses from the
  //    middleware that follows.
  app.use(
    helmet({
      // Uploaded images are served from this origin and embedded by the
      // frontend on a different origin; without this, the browser blocks them.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  )

  // 2. CORS with credentials, so the browser will send and store the auth
  //    cookie. A credentialed request may not use a wildcard origin, so the
  //    frontend origin must be named exactly.
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    })
  )

  // 3. Parsers. The auth middleware reads the JWT from a cookie, so
  //    cookie-parser must run before any route.
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(cookieParser())

  // 4. Request logging — quiet during tests so the suite output stays readable.
  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'))
  }

  // 5. Uploaded images. Served read-only and explicitly NOT executable:
  //    index listings are off and dotfiles are denied.
  app.use(
    '/uploads',
    express.static(env.uploadDirAbsolute, {
      index: false,
      dotfiles: 'deny',
      maxAge: env.isProduction ? '7d' : 0,
      setHeaders: (res) => {
        // Stops a crafted upload from being interpreted as a script by a browser.
        res.setHeader('X-Content-Type-Options', 'nosniff')
      },
    })
  )

  // 6. Baseline throttling for the whole API. Tighter per-route limiters are
  //    layered on top inside the individual routers.
  app.use('/api', generalLimiter)

  // 7. The application itself.
  app.use('/api', createApiRouter(container))

  // 8. Unmatched route -> 404 in our JSON envelope.
  app.use(notFoundHandler)

  // 9. Central error handler. Must be registered last to catch everything above.
  app.use(errorHandler)

  return app
}
