import path from 'node:path'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Typed, validated access to process.env.
 *
 * Every other module imports `env` from here rather than touching process.env
 * directly, so a missing or malformed variable fails once, loudly, at boot —
 * not deep inside a request handler in production.
 *
 * Zod is intentionally not used (see README "Technology Stack"); this is
 * hand-rolled validation with no runtime dependency.
 */

type NodeEnv = 'development' | 'test' | 'production'

/** Which repository implementation the container wires up. */
export type DataSource = 'memory' | 'mongo'

/** Collected so the operator sees every problem at once, not one per restart. */
const problems: string[] = []

function required(key: string): string {
  const value = process.env[key]?.trim()
  if (!value) {
    problems.push(`${key} is required but was not set`)
    return ''
  }
  return value
}

function optional(key: string, fallback: string): string {
  const value = process.env[key]?.trim()
  return value ? value : fallback
}

function optionalNumber(key: string, fallback: number): number {
  const raw = process.env[key]?.trim()
  if (!raw) return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    problems.push(`${key} must be a number, received "${raw}"`)
    return fallback
  }
  return parsed
}

function optionalBoolean(key: string, fallback: boolean): boolean {
  const raw = process.env[key]?.trim().toLowerCase()
  if (!raw) return fallback
  return raw === 'true' || raw === '1' || raw === 'yes'
}

function parseNodeEnv(): NodeEnv {
  const raw = optional('NODE_ENV', 'development')
  if (raw === 'development' || raw === 'test' || raw === 'production') return raw
  problems.push(`NODE_ENV must be development, test or production — received "${raw}"`)
  return 'development'
}

const nodeEnv = parseNodeEnv()
const isTest = nodeEnv === 'test'
const isProduction = nodeEnv === 'production'

/**
 * Which persistence backend the repository layer resolves to.
 *
 * 'memory' — in-memory repositories, optionally mirrored to JSON on disk.
 * 'mongo'  — Mongoose repositories against MongoDB Atlas.
 *
 * Everything above the repository layer is identical either way; this is the
 * single switch that decides which implementation is wired up.
 */
function parseDataSource(): DataSource {
  const raw = optional('DATA_SOURCE', 'memory')
  if (raw === 'memory' || raw === 'mongo') return raw
  problems.push(`DATA_SOURCE must be "memory" or "mongo" — received "${raw}"`)
  return 'memory'
}

const dataSource = parseDataSource()

/**
 * MONGODB_URI matters only when Mongo is actually the active backend, so a
 * missing or broken connection string cannot block development while the app
 * is running on mock data. Tests never use it at all.
 */
const usesMongo = dataSource === 'mongo' && !isTest
const mongodbUri = usesMongo ? required('MONGODB_URI') : optional('MONGODB_URI', '')

if (usesMongo && mongodbUri && !/^mongodb(\+srv)?:\/\//.test(mongodbUri)) {
  problems.push(
    'MONGODB_URI must start with mongodb:// or mongodb+srv:// — copy the connection string from ' +
      'Atlas via Connect > Drivers'
  )
}

/**
 * Whether in-memory data is mirrored to JSON files on disk.
 *
 * On in development, so a project created through the admin panel survives a
 * dev-server restart. Always off under test, so each run starts from the same
 * deterministic dataset and tests cannot contaminate one another.
 */
const dataPersist = isTest ? false : optionalBoolean('DATA_PERSIST', true)

const jwtSecret = required('JWT_SECRET')

// A short secret defeats the point of signing the token at all.
if (jwtSecret && jwtSecret.length < 32) {
  problems.push(
    'JWT_SECRET must be at least 32 characters. Generate one with: ' +
      'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  )
}

/**
 * Admin session lifetime, enforced server-side on every request.
 *
 * Idle: how long a session survives without any API request.
 * Max: the absolute cap from login, however active the session is.
 */
const sessionIdleMinutes = optionalNumber('SESSION_IDLE_MINUTES', 30)
const sessionMaxHours = optionalNumber('SESSION_MAX_HOURS', 8)

if (sessionIdleMinutes <= 0 || sessionMaxHours <= 0) {
  problems.push('SESSION_IDLE_MINUTES and SESSION_MAX_HOURS must both be greater than 0')
} else if (sessionIdleMinutes > sessionMaxHours * 60) {
  problems.push('SESSION_IDLE_MINUTES cannot be longer than SESSION_MAX_HOURS')
}

/**
 * How many reverse proxies sit in front of the app — Express's `trust proxy`.
 *
 * Off by default. Trusting X-Forwarded-For without a proxy that overwrites it
 * lets any client choose its own IP, which defeats every per-IP rate limit
 * (including the login limiter). Set it to the real hop count in production,
 * usually 1 behind a single load balancer. `true` (trust every hop) is refused
 * for the same reason.
 */
function parseTrustProxy(): number | false {
  const raw = process.env.TRUST_PROXY?.trim().toLowerCase()
  if (!raw || raw === 'false' || raw === '0') return false
  const hops = Number(raw)
  if (!Number.isInteger(hops) || hops < 0) {
    problems.push(`TRUST_PROXY must be a whole number of proxy hops (e.g. 1) — received "${raw}"`)
    return false
  }
  return hops
}

const clientUrl = optional('CLIENT_URL', 'http://localhost:5173')

/**
 * Whether auth cookies carry the Secure flag (HTTPS only).
 *
 * Defaults on in production *and* whenever the frontend is served over HTTPS,
 * so a deployment that forgets NODE_ENV=production still gets Secure cookies.
 * Can only be switched off explicitly, and never in production.
 */
const cookieSecure = optionalBoolean(
  'COOKIE_SECURE',
  isProduction || clientUrl.startsWith('https://')
)

if (isProduction && !cookieSecure) {
  problems.push('COOKIE_SECURE cannot be false in production — auth cookies must be HTTPS-only')
}

const uploadDir = optional('UPLOAD_DIR', 'uploads')

export const env = {
  nodeEnv,
  isDevelopment: nodeEnv === 'development',
  isTest,
  isProduction,

  port: optionalNumber('PORT', 5000),

  /* --- Persistence ------------------------------------------------------ */
  dataSource,
  usesMemoryStore: dataSource === 'memory' || isTest,
  dataPersist,
  /** Directory holding the JSON mirror of the in-memory store. Gitignored. */
  dataDir: path.resolve(process.cwd(), optional('DATA_DIR', 'data')),

  mongodbUri,
  /**
   * Set explicitly rather than taken from the URI path — Atlas hands out a
   * connection string with no database in it, and the driver would otherwise
   * default to a database called "test".
   */
  mongodbDbName: optional('MONGODB_DB_NAME', 'portfolio'),

  jwtSecret,
  sessionIdleMs: sessionIdleMinutes * 60 * 1000,
  sessionMaxMs: sessionMaxHours * 60 * 60 * 1000,
  cookieSecure,
  trustProxy: parseTrustProxy(),

  /** Exact origin — cannot be "*" because the API sends credentials. */
  clientUrl,

  /** Read only by the admin seeder, never by a request handler. */
  adminEmail: process.env.ADMIN_EMAIL?.trim() ?? '',
  adminPassword: process.env.ADMIN_PASSWORD ?? '',
  adminName: optional('ADMIN_NAME', 'Portfolio Admin'),

  uploadDir,
  uploadDirAbsolute: path.resolve(process.cwd(), uploadDir),
  maxUploadBytes: optionalNumber('MAX_UPLOAD_SIZE_MB', 2) * 1024 * 1024,

  /**
   * Cloudinary, for the profile picture and project thumbnails only. Optional:
   * with any of the three missing, the upload endpoint returns a clean 503 and
   * pasting an image URL by hand still works.
   */
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY?.trim() ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() ?? '',
    /** Parent folder in the Cloudinary media library. */
    folder: optional('CLOUDINARY_FOLDER', 'portfolio'),
  },

  aiProvider: optional('AI_PROVIDER', 'none'),
  aiApiKey: process.env.AI_API_KEY?.trim() ?? '',
} as const

if (problems.length > 0) {
  throw new Error(
    `Invalid environment configuration:\n` +
      problems.map((p) => `  - ${p}`).join('\n') +
      `\n\nCopy backend/.env.example to backend/.env and fill in the missing values.`
  )
}
