import jwt from 'jsonwebtoken'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../src/app'
import { env } from '../src/config/env'
import { resetStore } from '../src/repositories/memory/store'

/**
 * Admin session handling: server-side revocation, idle timeout, absolute cap,
 * cookie attributes and token validation.
 *
 * Credentials come from backend/.env (ADMIN_EMAIL / ADMIN_PASSWORD) and are
 * never printed.
 */

const MINUTE = 60 * 1000

async function login(app: ReturnType<typeof createApp>) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: env.adminEmail, password: env.adminPassword })
  expect(response.status).toBe(200)

  const cookies = ([] as string[]).concat(response.headers['set-cookie'] ?? [])
  const cookieHeader = cookies.map((cookie) => cookie.split(';')[0]).join('; ')
  return { response, cookies, cookieHeader, csrfToken: response.body.data.csrfToken as string }
}

describe('admin sessions', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(async () => {
    await resetStore()
    app = createApp()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('issues browser-session cookies with the right flags and no caching', async () => {
    const { response, cookies } = await login(app)

    const token = cookies.find((cookie) => cookie.startsWith('token='))
    const csrf = cookies.find((cookie) => cookie.startsWith('csrfToken='))
    expect(token).toBeDefined()
    expect(csrf).toBeDefined()

    for (const cookie of [token!, csrf!]) {
      // No Max-Age / Expires: the cookie dies with the browser session.
      expect(cookie).not.toMatch(/Max-Age/i)
      expect(cookie).not.toMatch(/Expires/i)
      expect(cookie).toMatch(/SameSite=Lax/i)
    }
    expect(token).toMatch(/HttpOnly/i)
    expect(csrf).not.toMatch(/HttpOnly/i)

    expect(response.headers['cache-control']).toBe('no-store')
    expect(JSON.stringify(response.body)).not.toMatch(/password/i)
  })

  it('revokes the token on logout, even if a copy of the cookie survives', async () => {
    const { cookieHeader, csrfToken } = await login(app)

    await request(app).get('/api/auth/me').set('Cookie', cookieHeader).expect(200)

    await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', csrfToken)
      .expect(200)

    // Replaying the pre-logout cookie must no longer work.
    await request(app).get('/api/auth/me').set('Cookie', cookieHeader).expect(401)
  })

  it('still clears cookies when logging out after the session already ended', async () => {
    const { cookieHeader, csrfToken } = await login(app)
    await resetStore() // simulates a restart: the session is gone

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', csrfToken)
      .expect(200)

    const cleared = ([] as string[]).concat(response.headers['set-cookie'] ?? [])
    expect(cleared.some((cookie) => cookie.startsWith('token=;'))).toBe(true)
  })

  it('expires a session after the idle timeout', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const { cookieHeader } = await login(app)

    vi.setSystemTime(Date.now() + env.sessionIdleMs + MINUTE)

    const response = await request(app).get('/api/auth/me').set('Cookie', cookieHeader)
    expect(response.status).toBe(401)
    expect(response.body.message).toMatch(/expired/i)
  })

  it('keeps an active session alive, but only up to the absolute cap', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const start = Date.now()
    const { cookieHeader } = await login(app)

    // A request every (idle - 5 min) keeps the session alive...
    const step = env.sessionIdleMs - 5 * MINUTE
    let elapsed = 0
    while (elapsed + step < env.sessionMaxMs) {
      elapsed += step
      vi.setSystemTime(start + elapsed)
      await request(app).get('/api/auth/me').set('Cookie', cookieHeader).expect(200)
    }

    // ...until the absolute cap, however active the admin has been.
    vi.setSystemTime(start + env.sessionMaxMs + MINUTE)
    await request(app).get('/api/auth/me').set('Cookie', cookieHeader).expect(401)
  })

  it('ends every session when the server restarts', async () => {
    const { cookieHeader } = await login(app)
    await resetStore()
    await request(app).get('/api/auth/me').set('Cookie', cookieHeader).expect(401)
  })

  it('rejects tokens that are forged, unsigned, or not bound to a live session', async () => {
    const { cookieHeader } = await login(app)
    const realToken = /token=([^;]+)/.exec(cookieHeader)![1]!
    const { sub } = jwt.decode(realToken) as { sub: string }

    const unsigned = jwt.sign({ sub, sid: 'x' }, '', { algorithm: 'none' })
    const wrongSecret = jwt.sign({ sub, sid: 'x' }, 'not-the-real-secret-not-the-real-secret')
    const unknownSession = jwt.sign({ sub, sid: 'no-such-session' }, env.jwtSecret)
    const noSession = jwt.sign({ sub }, env.jwtSecret) // the old, pre-session token shape

    for (const token of [unsigned, wrongSecret, unknownSession, noSession]) {
      await request(app).get('/api/auth/me').set('Cookie', `token=${token}`).expect(401)
    }
  })

  it('refuses admin endpoints without a session, whatever the frontend thinks', async () => {
    const adminRequests = [
      request(app).get('/api/auth/me'),
      request(app).get('/api/admin/stats'),
      request(app).get('/api/contact'),
      request(app).put('/api/profile').send({}),
      request(app).post('/api/projects').send({}),
      request(app).post('/api/uploads/project'),
    ]
    for (const pending of adminRequests) {
      expect((await pending).status).toBe(401)
    }
  })

  it('does not trust X-Forwarded-For unless TRUST_PROXY is configured', () => {
    expect(app.get('trust proxy')).toBe(env.trustProxy)
    expect(env.trustProxy).toBe(false)
  })
})
