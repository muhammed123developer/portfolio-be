import crypto from 'node:crypto'

import { env } from '../config/env'
import { hashPassword } from '../utils/password'
import { slugify } from '../utils/slug'
import type {
  AdminRecord,
  ContactMessage,
  Education,
  Experience,
  Profile,
  ProjectRecord,
  Skill,
  Technology,
} from '../types/domain'
import type { PersistedStore } from '../repositories/memory/store.types'

/* ===========================================================================
 * MOCK DATASET — REPLACE BEFORE PUBLISHING
 * ===========================================================================
 *
 * Every organisation, qualification and message below is INVENTED. "Northwind
 * Labs", "Meridian Systems", "Coastline Digital" and "Harbourview Institute of
 * Technology" do not exist. Nothing here describes real employment, real
 * education or real correspondence — it exists so the UI can be built and
 * tested against realistic volumes and shapes.
 *
 * Replace it with your own details through the admin panel (or by editing this
 * file and running `npm run mock:reset`) before deploying publicly.
 *
 * Volumes are chosen to exercise the interface rather than to look tidy:
 *   12 projects       → pagination at 6/page, 4 featured, mixed statuses,
 *                       one with no image to prove the fallback renders
 *   27 messages       → 3 pages at 10/page, mixed unread/read/archived
 *   26 skills         → all six categories populated
 *    4 experience     → one current role (endDate: null)
 * ======================================================================== */

/**
 * Deterministic 24-character hex id derived from a stable seed string.
 *
 * Deterministic on purpose: project records reference technologies by id, and
 * regenerating the dataset must not break those links. Same shape as a MongoDB
 * ObjectId, so the ids survive the eventual migration unchanged.
 */
function id(seed: string): string {
  return crypto.createHash('md5').update(seed).digest('hex').slice(0, 24)
}

/** Fixed timestamps keep the dataset byte-identical between runs. */
function ts(date: string): string {
  return `${date}T09:00:00.000Z`
}

/* ------------------------------------------------------------ Technologies */

interface TechSeed {
  name: string
  category: Technology['category']
  icon: string
}

const TECH_SEEDS: TechSeed[] = [
  { name: 'React', category: 'frontend', icon: 'atom' },
  { name: 'TypeScript', category: 'frontend', icon: 'file-code' },
  { name: 'JavaScript', category: 'frontend', icon: 'braces' },
  { name: 'Tailwind CSS', category: 'frontend', icon: 'wind' },
  { name: 'shadcn/ui', category: 'frontend', icon: 'component' },
  { name: 'Vite', category: 'frontend', icon: 'zap' },
  { name: 'HTML5', category: 'frontend', icon: 'code' },
  { name: 'CSS3', category: 'frontend', icon: 'palette' },
  { name: 'Node.js', category: 'backend', icon: 'hexagon' },
  { name: 'Express', category: 'backend', icon: 'server' },
  { name: 'REST API', category: 'backend', icon: 'plug' },
  { name: 'JWT', category: 'backend', icon: 'key-round' },
  { name: 'Socket.IO', category: 'backend', icon: 'radio' },
  { name: 'MongoDB', category: 'database', icon: 'leaf' },
  { name: 'Mongoose', category: 'database', icon: 'database' },
  { name: 'PostgreSQL', category: 'database', icon: 'database' },
  { name: 'Redis', category: 'database', icon: 'zap' },
  { name: 'Docker', category: 'devops', icon: 'container' },
  { name: 'GitHub Actions', category: 'devops', icon: 'workflow' },
  { name: 'Nginx', category: 'devops', icon: 'network' },
  { name: 'Vercel', category: 'devops', icon: 'triangle' },
  { name: 'Git', category: 'tools', icon: 'git-branch' },
  { name: 'Figma', category: 'tools', icon: 'figma' },
  { name: 'Postman', category: 'tools', icon: 'send' },
]

function buildTechnologies(): Technology[] {
  return TECH_SEEDS.map((seed) => ({
    id: id(`tech:${seed.name}`),
    name: seed.name,
    slug: slugify(seed.name),
    category: seed.category,
    icon: seed.icon,
    createdAt: ts('2026-01-05'),
    updatedAt: ts('2026-01-05'),
  }))
}

/** Look up a technology id by name, for wiring projects to technologies. */
const tech = (name: string): string => id(`tech:${name}`)

/* ---------------------------------------------------------------- Projects */

interface ProjectSeed {
  title: string
  shortDescription: string
  description: string
  problem: string
  solution: string
  features: string[]
  architecture: string
  challenges: string
  lessonsLearned: string
  image: string | null
  githubUrl: string | null
  liveUrl: string | null
  featured: boolean
  status: ProjectRecord['status']
  technologies: string[]
  createdAt: string
}

const PROJECT_SEEDS: ProjectSeed[] = [
  {
    title: 'Developer Portfolio Platform',
    shortDescription:
      'A full-stack portfolio with a REST API, JWT-authenticated admin panel and a swappable persistence layer.',
    description:
      'A production-shaped portfolio application rather than a static site. The public pages render entirely from the API, and every piece of content — projects, skills, experience, education and the About copy — is editable through an authenticated admin panel. The persistence layer sits behind a repository interface, so the storage backend can be replaced without touching a controller, a service or a single line of frontend code.',
    problem:
      'Static portfolio sites prove that someone can style a page. They prove nothing about API design, authentication, data modelling or how a person structures an application that has to be maintained. Every content change also means a code change and a redeploy.',
    solution:
      'Split the application into a React frontend and an Express REST API with a layered backend: routes delegate to controllers, controllers to services, and services to repositories behind an interface. Content lives in the database and is managed through a protected admin panel, so updating a job title is an admin action rather than a deploy.',
    features: [
      'JWT authentication delivered in an httpOnly cookie with CSRF double-submit protection',
      'Full CRUD for projects, experience, education, skills and technologies',
      'Paginated, filterable contact-message inbox with unread/read/archived states',
      'Light, dark and system themes with the preference persisted',
      'Repository layer allowing the storage backend to be swapped in isolation',
      'Centralised error handling with a consistent response envelope',
    ],
    architecture:
      'React and Axios talk to an Express REST API. Requests pass through helmet, CORS, rate limiting, authentication and express-validator before reaching a thin controller, which delegates to a service holding the business logic. Services depend only on repository interfaces, so the concrete storage implementation is injected at a single composition root.',
    challenges:
      'Keeping the storage layer genuinely swappable meant resisting the temptation to leak query objects through the repository interface. Filters are expressed in domain vocabulary instead, which required designing purpose-built repository methods rather than one generic find().',
    lessonsLearned:
      'Cross-entity rules belong in the service layer, not in schema validators. Pushing date-ordering and uniqueness checks up one level meant they held for every storage backend rather than only the one that happened to be wired up.',
    image: '/images/projects/portfolio-platform.svg',
    githubUrl: 'https://github.com/example/portfolio-platform',
    liveUrl: 'https://portfolio.example.com',
    featured: true,
    status: 'completed',
    technologies: ['React', 'TypeScript', 'Node.js', 'Express', 'MongoDB', 'Tailwind CSS', 'JWT'],
    createdAt: '2026-08-14',
  },
  {
    title: 'Realtime Collaboration Board',
    shortDescription:
      'A multi-user kanban board with live cursors, optimistic updates and conflict resolution over WebSockets.',
    description:
      'A collaborative planning board where several people can drag cards simultaneously and see each other work in real time. The interesting part is not the board — it is reconciling concurrent edits without the UI flickering or losing a change.',
    problem:
      'Naive realtime boards either lock a card while someone drags it, which feels broken, or apply every event blindly, which means two people moving the same card produce an inconsistent result.',
    solution:
      'Optimistic local updates paired with a server-authoritative event log. Each mutation carries a client id and a monotonic sequence number, so late-arriving events can be reordered or discarded rather than blindly replayed.',
    features: [
      'Live cursors and presence indicators',
      'Optimistic drag-and-drop with server reconciliation',
      'Per-board access control',
      'Offline queueing with replay on reconnect',
      'Activity history per card',
    ],
    architecture:
      'A Socket.IO gateway sits alongside the REST API and shares its authentication middleware. Board state is held in Redis for fast fan-out, with periodic snapshots to the primary database.',
    challenges:
      'Reconnection was harder than the realtime path itself. A client that drops mid-drag must replay queued mutations without duplicating them, which meant making every mutation idempotent.',
    lessonsLearned:
      'Designing events to be idempotent from the start is far cheaper than retrofitting deduplication once the protocol is in use.',
    image: '/images/projects/collab-board.svg',
    githubUrl: 'https://github.com/example/collab-board',
    liveUrl: 'https://board.example.com',
    featured: true,
    status: 'completed',
    technologies: ['React', 'TypeScript', 'Socket.IO', 'Node.js', 'Redis', 'Express'],
    createdAt: '2026-06-02',
  },
  {
    title: 'Inventory Forecasting API',
    shortDescription:
      'A REST service that projects stock depletion from historical sales and flags reorder points.',
    description:
      'A backend service for small retailers that turns raw sales history into actionable reorder dates. Built API-first, with a scheduled job recomputing forecasts nightly and a thin dashboard consuming the same public endpoints.',
    problem:
      'Small retailers discover they are out of stock when a customer asks. Spreadsheets do not account for lead time or seasonal variation, so reorders are consistently late.',
    solution:
      'A weighted moving average over trailing sales, adjusted for per-supplier lead time, producing a projected depletion date per SKU. Anything inside its lead-time window is surfaced as a reorder alert.',
    features: [
      'Per-SKU depletion forecasting',
      'Supplier lead-time modelling',
      'Reorder alerts with configurable thresholds',
      'Bulk CSV import with per-row validation and error reporting',
      'Nightly scheduled recomputation',
    ],
    architecture:
      'Express REST API over PostgreSQL, with a scheduled worker recomputing forecasts out of band so request latency is unaffected by the heavier statistical work.',
    challenges:
      'CSV import was the source of most real-world failures. Reporting every bad row at once, rather than failing on the first, turned a frustrating loop into a single correction pass.',
    lessonsLearned:
      'Validation feedback quality matters more than validation strictness. Users abandon an import that rejects their file without saying which of 4,000 rows was wrong.',
    image: '/images/projects/inventory-api.svg',
    githubUrl: 'https://github.com/example/inventory-forecast',
    liveUrl: null,
    featured: true,
    status: 'completed',
    technologies: ['Node.js', 'Express', 'PostgreSQL', 'TypeScript', 'Docker', 'REST API'],
    createdAt: '2026-04-19',
  },
  {
    title: 'Accessible Component Library',
    shortDescription:
      'A themeable React component library built to WCAG 2.1 AA, with keyboard and screen-reader coverage.',
    description:
      'A set of composable React primitives — dialogs, menus, comboboxes, date pickers — built so accessibility is the default rather than a later remediation pass. Every component ships with documented keyboard interaction and automated a11y tests.',
    problem:
      'Teams adopt a component library for speed, then discover its dialogs trap focus incorrectly and its menus are unreachable by keyboard. Accessibility work then costs more than building the components correctly would have.',
    solution:
      'Build on unstyled accessible primitives and layer theming on top, so visual changes cannot regress focus management or ARIA semantics. Every component has an automated axe check in CI.',
    features: [
      'WCAG 2.1 AA conformance with documented keyboard interaction',
      'Token-driven theming with light and dark variants',
      'Automated accessibility checks in CI',
      'Tree-shakeable exports',
      'Live documentation site with editable examples',
    ],
    architecture:
      'A pnpm monorepo: the component package, a documentation site and a shared token package. Tokens compile to CSS custom properties consumed by both.',
    challenges:
      'Focus restoration across nested overlays. A dialog opening a popover that opens a tooltip must return focus in the right order when each closes.',
    lessonsLearned:
      'Automated checks catch contrast and missing labels, but not whether a flow is actually usable by keyboard. Manual testing stayed essential.',
    image: '/images/projects/component-library.svg',
    githubUrl: 'https://github.com/example/a11y-components',
    liveUrl: 'https://components.example.com',
    featured: true,
    status: 'completed',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'shadcn/ui', 'Vite'],
    createdAt: '2026-03-08',
  },
  {
    title: 'Markdown Knowledge Base',
    shortDescription:
      'A self-hosted documentation site that renders a Git repository of Markdown with full-text search.',
    description:
      'Documentation tooling for teams that want their docs in Git but their readers in a browser. Renders a repository of Markdown with cross-linking, versioned navigation and instant client-side search.',
    problem:
      'Docs in a repository are reviewable but hard to read; docs in a wiki are readable but drift from the code and skip review entirely.',
    solution:
      'Keep the source in Git and generate a static site on push, with a prebuilt search index so search needs no backend.',
    features: [
      'Git-backed content with build-on-push',
      'Client-side full-text search over a prebuilt index',
      'Versioned documentation branches',
      'Automatic broken-link detection at build time',
    ],
    architecture:
      'A build pipeline parses Markdown to HTML and emits a search index alongside the static output, served by Nginx.',
    challenges:
      'Keeping the search index small enough to ship to the browser. Storing positions for every token tripled the payload, so the index stores document-level matches and re-scans on demand.',
    lessonsLearned:
      'Shipping an index to the client removes a whole tier of infrastructure, but only if you are disciplined about what goes into it.',
    image: '/images/projects/knowledge-base.svg',
    githubUrl: 'https://github.com/example/md-knowledge-base',
    liveUrl: 'https://docs.example.com',
    featured: false,
    status: 'completed',
    technologies: ['TypeScript', 'Vite', 'Nginx', 'Docker', 'React'],
    createdAt: '2026-02-11',
  },
  {
    title: 'Expense Splitting App',
    shortDescription:
      'A shared-expense tracker that settles group debts in the fewest possible transfers.',
    description:
      'A mobile-first app for splitting costs across a group, with a settlement algorithm that minimises the number of payments needed to clear all debts.',
    problem:
      'Ledger apps show who owes what, but settling naively means everyone pays everyone. A group of six can face fifteen separate transfers to clear one weekend.',
    solution:
      'Reduce the debt graph to net positions, then greedily match the largest creditor against the largest debtor, which reliably produces near-minimal transfer counts.',
    features: [
      'Group expense tracking with uneven splits',
      'Debt simplification across the whole group',
      'Multi-currency with historical exchange rates',
      'Receipt photo attachments',
      'Settlement history',
    ],
    architecture:
      'React frontend against an Express API. Settlement runs server-side so every member sees an identical plan.',
    challenges:
      'Multi-currency made "who owes what" ambiguous — an expense must be settled at the rate on the date it was incurred, not today.',
    lessonsLearned:
      'Storing the exchange rate alongside each transaction, rather than deriving it later, removed an entire class of reconciliation bug.',
    image: '/images/projects/expense-split.svg',
    githubUrl: 'https://github.com/example/expense-split',
    liveUrl: null,
    featured: false,
    status: 'completed',
    technologies: ['React', 'Node.js', 'Express', 'MongoDB', 'Mongoose'],
    createdAt: '2026-01-23',
  },
  {
    title: 'CI Pipeline Dashboard',
    shortDescription:
      'An aggregated view of build health across repositories, with flaky-test detection.',
    description:
      'A dashboard that pulls build results from multiple repositories into one view and identifies tests that fail intermittently rather than consistently.',
    problem:
      'Flaky tests get re-run until they pass, so they never appear in failure counts and quietly erode trust in the whole suite.',
    solution:
      'Record every individual run rather than only final outcomes, then flag any test whose pass/fail result changes without its code changing.',
    features: [
      'Cross-repository build status',
      'Flaky-test detection and ranking',
      'Build duration trends',
      'Slack notifications on sustained failure',
    ],
    architecture:
      'A polling worker ingests CI provider webhooks into PostgreSQL; the dashboard reads precomputed aggregates.',
    challenges:
      'Webhook delivery is not ordered or guaranteed, so the ingest path had to tolerate duplicates and out-of-order arrivals.',
    lessonsLearned:
      'Treat every external webhook as at-least-once delivery. Assuming exactly-once produced duplicate builds within a day of going live.',
    image: '/images/projects/ci-dashboard.svg',
    githubUrl: 'https://github.com/example/ci-dashboard',
    liveUrl: null,
    featured: false,
    status: 'completed',
    technologies: ['TypeScript', 'Node.js', 'PostgreSQL', 'GitHub Actions', 'Docker'],
    createdAt: '2025-11-30',
  },
  {
    title: 'Recipe Scaling Tool',
    shortDescription:
      'A recipe manager that rescales ingredients correctly, including non-linear quantities.',
    description:
      'A recipe app that handles the parts of scaling people get wrong: unit conversion, sensible rounding, and ingredients that do not scale linearly.',
    problem:
      'Doubling a recipe by multiplying every quantity produces bad food. Salt, leavening and cooking time do not scale linearly.',
    solution:
      'Classify ingredients by scaling behaviour and apply the appropriate curve, with a clear explanation shown wherever the result is not a simple multiple.',
    features: [
      'Non-linear scaling for salt, leavening and spices',
      'Metric and imperial conversion with practical rounding',
      'Shopping list generation across several recipes',
      'Cooking-time adjustment by pan size',
    ],
    architecture:
      'A React frontend with a small Express API. Scaling rules are data, not code, so they can be tuned without a deploy.',
    challenges:
      'Rounding. Mathematically correct output like "1.33 eggs" is useless, so results snap to practical measures.',
    lessonsLearned:
      'Correct and useful are not the same thing. The rounding layer mattered more to users than the scaling maths underneath it.',
    image: null,
    githubUrl: 'https://github.com/example/recipe-scaler',
    liveUrl: null,
    featured: false,
    status: 'completed',
    technologies: ['React', 'JavaScript', 'Node.js', 'Express'],
    createdAt: '2025-10-12',
  },
  {
    title: 'Habit Streak Tracker',
    shortDescription: 'A habit tracker with forgiving streaks and honest progress statistics.',
    description:
      'A habit tracker built around the observation that all-or-nothing streaks cause people to quit entirely after one missed day.',
    problem:
      'Conventional streak counters reset to zero on a single miss, which reliably ends the habit rather than the streak.',
    solution:
      'Rolling completion rates over a trailing window, plus configurable grace days, so one missed day is visible without being catastrophic.',
    features: [
      'Rolling completion rate rather than brittle streaks',
      'Configurable grace days',
      'Per-habit reminder scheduling',
      'Heatmap calendar',
    ],
    architecture: 'React frontend with local-first storage and background sync to the API.',
    challenges:
      'Local-first sync meant handling edits made offline on two devices, resolved by last-write-wins per habit-day.',
    lessonsLearned:
      'Last-write-wins is often sufficient. Reaching for CRDTs before establishing that conflicts actually occur is premature.',
    image: '/images/projects/habit-tracker.svg',
    githubUrl: 'https://github.com/example/habit-tracker',
    liveUrl: null,
    featured: false,
    status: 'completed',
    technologies: ['React', 'TypeScript', 'MongoDB', 'Express'],
    createdAt: '2025-09-05',
  },
  {
    title: 'Query Performance Explorer',
    shortDescription:
      'A tool that captures slow queries and visualises their execution plans over time.',
    description:
      'A diagnostic tool that records slow queries in production and shows how an individual query plan changed as data volume grew.',
    problem:
      'A query that was fast at ten thousand rows can become pathological at ten million, and by the time anyone notices, nobody remembers what changed.',
    solution:
      'Sample execution plans continuously and store them, so a regression can be traced to the point the planner changed strategy.',
    features: [
      'Slow-query capture with plan snapshots',
      'Plan diffing across time',
      'Index suggestion based on observed predicates',
      'Per-endpoint query attribution',
    ],
    architecture:
      'A sampling agent writes plans to a time-series store; the explorer renders plan trees and diffs.',
    challenges:
      'Sampling overhead. Capturing every plan measurably slowed production, so sampling became adaptive to query cost.',
    lessonsLearned:
      'Observability that degrades the thing it observes will be switched off. Budget the overhead explicitly.',
    image: '/images/projects/query-explorer.svg',
    githubUrl: 'https://github.com/example/query-explorer',
    liveUrl: null,
    featured: false,
    status: 'in_progress',
    technologies: ['PostgreSQL', 'TypeScript', 'Node.js', 'Docker', 'React'],
    createdAt: '2026-09-01',
  },
  {
    title: 'Self-Hosted Link Shortener',
    shortDescription:
      'A privacy-respecting URL shortener with click analytics and no third-party tracking.',
    description:
      'A link shortener for teams that want custom short links and basic analytics without handing click data to an external service.',
    problem:
      'Hosted shorteners see every link an organisation shares, which is a meaningful data-exposure problem for private links.',
    solution:
      'A self-hosted service with aggregate-only analytics: counts and referrers, with no per-visitor identifiers stored.',
    features: [
      'Custom short codes with collision detection',
      'Aggregate click analytics without visitor tracking',
      'Optional link expiry',
      'Bulk creation via API',
    ],
    architecture:
      'Express API with Redis for hot-path redirect lookups, falling back to the primary database on a miss.',
    challenges:
      'Making redirects fast while keeping counts accurate meant buffering increments in Redis and flushing periodically.',
    lessonsLearned:
      'Exact analytics and fast redirects are in tension. Accepting eventual consistency in the counts made both acceptable.',
    image: '/images/projects/link-shortener.svg',
    githubUrl: 'https://github.com/example/link-shortener',
    liveUrl: null,
    featured: false,
    status: 'in_progress',
    technologies: ['Node.js', 'Express', 'Redis', 'Docker', 'Nginx'],
    createdAt: '2026-09-12',
  },
  {
    title: 'Static Site Image Optimiser',
    shortDescription:
      'A build-time image pipeline producing responsive formats with content-hashed filenames.',
    description:
      'A build plugin that converts source images into responsive AVIF and WebP variants with correct srcset markup, so pages ship appropriately sized images without manual work.',
    problem:
      'Hand-managing responsive images is tedious enough that it gets skipped, and pages ship 4000px originals to phones.',
    solution:
      'Generate variants at build time with content-hashed filenames for permanent caching, and emit the srcset markup automatically.',
    features: [
      'AVIF and WebP generation with fallbacks',
      'Automatic srcset and sizes emission',
      'Content-hashed filenames for immutable caching',
      'Build cache so unchanged images are not reprocessed',
    ],
    architecture: 'A Vite plugin wrapping a worker pool, with an on-disk cache keyed by content hash.',
    challenges:
      'Build times. Processing every image on every build was unusable, so the cache had to be correct before the feature was.',
    lessonsLearned:
      'A build-time tool has to be fast on the second run, not just correct on the first. Caching was the feature.',
    image: null,
    githubUrl: 'https://github.com/example/image-optimiser',
    liveUrl: null,
    featured: false,
    status: 'draft',
    technologies: ['TypeScript', 'Vite', 'Node.js'],
    createdAt: '2026-09-18',
  },
]

function buildProjects(): ProjectRecord[] {
  return PROJECT_SEEDS.map((seed, index) => ({
    id: id(`project:${seed.title}`),
    title: seed.title,
    slug: slugify(seed.title),
    shortDescription: seed.shortDescription,
    description: seed.description,
    problem: seed.problem,
    solution: seed.solution,
    features: seed.features,
    architecture: seed.architecture,
    challenges: seed.challenges,
    lessonsLearned: seed.lessonsLearned,
    image: seed.image,
    screenshots: [],
    githubUrl: seed.githubUrl,
    liveUrl: seed.liveUrl,
    featured: seed.featured,
    status: seed.status,
    displayOrder: index,
    technologyIds: seed.technologies.map(tech),
    createdAt: ts(seed.createdAt),
    updatedAt: ts(seed.createdAt),
  }))
}

/* ------------------------------------------------------------------ Skills */

const SKILL_SEEDS: Array<[string, Skill['category'], number, string]> = [
  ['React', 'frontend', 92, 'atom'],
  ['TypeScript', 'frontend', 90, 'file-code'],
  ['JavaScript', 'frontend', 93, 'braces'],
  ['HTML', 'frontend', 95, 'code'],
  ['CSS', 'frontend', 88, 'palette'],
  ['Tailwind CSS', 'frontend', 90, 'wind'],
  ['shadcn/ui', 'frontend', 84, 'component'],
  ['Accessibility (WCAG)', 'frontend', 78, 'accessibility'],
  ['Node.js', 'backend', 89, 'hexagon'],
  ['Express.js', 'backend', 88, 'server'],
  ['REST APIs', 'backend', 90, 'plug'],
  ['JWT', 'backend', 85, 'key-round'],
  ['WebSockets', 'backend', 74, 'radio'],
  ['MongoDB', 'database', 82, 'leaf'],
  ['Mongoose', 'database', 80, 'database'],
  ['PostgreSQL', 'database', 79, 'database'],
  ['Redis', 'database', 72, 'zap'],
  ['Data Modelling', 'database', 81, 'network'],
  ['Docker', 'devops', 76, 'container'],
  ['GitHub Actions', 'devops', 74, 'workflow'],
  ['Nginx', 'devops', 66, 'network'],
  ['Linux', 'devops', 71, 'terminal'],
  ['Git', 'tools', 92, 'git-branch'],
  ['VS Code', 'tools', 94, 'code-2'],
  ['Postman', 'tools', 83, 'send'],
  ['Technical Writing', 'other', 80, 'pen-line'],
]

function buildSkills(): Skill[] {
  const perCategory = new Map<string, number>()
  return SKILL_SEEDS.map(([name, category, proficiency, icon]) => {
    const order = perCategory.get(category) ?? 0
    perCategory.set(category, order + 1)
    return {
      id: id(`skill:${name}:${category}`),
      name,
      category,
      icon,
      proficiency,
      displayOrder: order,
      createdAt: ts('2026-01-05'),
      updatedAt: ts('2026-01-05'),
    }
  })
}

/* -------------------------------------------------------------- Experience */

function buildExperience(): Experience[] {
  const seeds: Array<Omit<Experience, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
      company: 'Northwind Labs',
      position: 'Senior Full-Stack Engineer',
      location: 'Remote',
      startDate: '2024-06-01',
      endDate: null,
      description:
        'Lead engineer on a customer-facing analytics product. Redesigned the reporting API around cursor pagination, cutting p95 response time from 1.8s to 240ms. Introduced a shared component library that removed roughly 6,000 lines of duplicated UI code across three applications, and mentored two engineers through their first production services.',
      technologies: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
      companyUrl: null,
      displayOrder: 0,
    },
    {
      company: 'Meridian Systems',
      position: 'Full-Stack Developer',
      location: 'Bristol, UK',
      startDate: '2022-09-01',
      endDate: '2024-05-31',
      description:
        'Built and maintained internal tooling for a logistics platform handling around 40,000 shipments a day. Replaced a nightly batch reconciliation job with an event-driven pipeline, reducing data staleness from 24 hours to under a minute. Owned the migration from JavaScript to TypeScript across four services.',
      technologies: ['React', 'JavaScript', 'TypeScript', 'Express', 'Redis'],
      companyUrl: null,
      displayOrder: 1,
    },
    {
      company: 'Coastline Digital',
      position: 'Frontend Developer',
      location: 'Bristol, UK',
      startDate: '2021-02-01',
      endDate: '2022-08-31',
      description:
        'Delivered client web applications in a small agency team. Introduced automated accessibility testing into the build pipeline, which took the default project template from repeated WCAG failures to AA conformance at handover.',
      technologies: ['React', 'JavaScript', 'CSS3', 'Figma'],
      companyUrl: null,
      displayOrder: 2,
    },
    {
      company: 'Harbourview Institute of Technology',
      position: 'Teaching Assistant, Web Development',
      location: 'Bristol, UK',
      startDate: '2020-09-01',
      endDate: '2021-01-31',
      description:
        'Supported an undergraduate web development module of around 120 students, running lab sessions on HTTP, REST design and relational modelling, and marking coursework.',
      technologies: ['JavaScript', 'HTML5', 'CSS3'],
      companyUrl: null,
      displayOrder: 3,
    },
  ]

  return seeds.map((seed) => ({
    ...seed,
    id: id(`experience:${seed.company}:${seed.position}`),
    createdAt: ts('2026-01-05'),
    updatedAt: ts('2026-01-05'),
  }))
}

/* --------------------------------------------------------------- Education */

function buildEducation(): Education[] {
  const seeds: Array<Omit<Education, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
      institution: 'Harbourview Institute of Technology',
      degree: 'BSc (Hons) Computer Science',
      field: 'Software Engineering',
      location: 'Bristol, UK',
      startDate: '2017-09-01',
      endDate: '2020-07-01',
      grade: 'First Class Honours',
      description:
        'Final-year project built a distributed task scheduler with at-least-once delivery guarantees. Coursework covered algorithms, databases, operating systems, computer networks and human-computer interaction.',
      displayOrder: 0,
    },
    {
      institution: 'Open Learning Collective',
      degree: 'Professional Certificate',
      field: 'Cloud Architecture and Containerisation',
      location: 'Online',
      startDate: '2023-01-01',
      endDate: '2023-06-01',
      grade: 'Distinction',
      description:
        'Part-time certificate covering container orchestration, infrastructure as code, observability and deployment strategy.',
      displayOrder: 1,
    },
    {
      institution: 'Open Learning Collective',
      degree: 'Short Course',
      field: 'Accessibility for Web Developers',
      location: 'Online',
      startDate: '2025-03-01',
      endDate: null,
      grade: null,
      description:
        'Ongoing study of WCAG 2.2 criteria, assistive technology behaviour and accessible design patterns.',
      displayOrder: 2,
    },
  ]

  return seeds.map((seed) => ({
    ...seed,
    id: id(`education:${seed.institution}:${seed.degree}:${seed.field}`),
    createdAt: ts('2026-01-05'),
    updatedAt: ts('2026-01-05'),
  }))
}

/* ---------------------------------------------------------------- Profile */

function buildProfile(): Profile {
  return {
    id: id('profile:singleton'),
    fullName: 'Alex Morgan',
    title: 'Full-Stack Developer',
    tagline: 'Building scalable, production-ready web applications.',
    introduction:
      "I'm a full-stack developer who enjoys the parts of the job that are invisible when they go well: clean API boundaries, data models that still make sense a year later, and interfaces that stay usable at 3am on a phone with one bar of signal.",
    philosophy:
      'Write the simplest thing that is genuinely correct, then make it fast only where measurement says it matters. Code is read far more often than it is written, so clarity beats cleverness almost every time. Anything that has to be remembered will eventually be forgotten, so encode it in types, tests or constraints instead.',
    currentFocus:
      'Deepening my work on distributed systems fundamentals, and getting better at designing APIs that stay pleasant to use as they grow.',
    technicalInterests: [
      'API and schema design',
      'Accessibility and inclusive interfaces',
      'Developer tooling and build performance',
      'Observability and production debugging',
      'Type systems',
    ],
    careerSummary:
      'Around five years building web applications across agency, logistics and analytics teams — most recently leading the redesign of a customer-facing reporting API, and consistently the person who ends up owning data modelling and API contracts.',
    publicEmail: 'hello@example.com',
    location: 'Bristol, UK',
    githubUrl: 'https://github.com/example',
    linkedinUrl: 'https://www.linkedin.com/in/example',
    websiteUrl: null,
    avatarUrl: null,
    resumeUrl: null,
    availableForWork: true,
    createdAt: ts('2026-01-05'),
    updatedAt: ts('2026-01-05'),
  }
}

/* -------------------------------------------------------- Contact messages */

const MESSAGE_SEEDS: Array<[string, string, string, string]> = [
  ['Priya Raman', 'priya.raman@example.com', 'Senior engineer role at Lumen Retail', 'We are hiring a senior full-stack engineer and your portfolio came up through a referral. The stack is React, Node and Postgres. Would you be open to an intro call this month?'],
  ['Daniel Okafor', 'daniel.okafor@example.com', 'Question about the collaboration board', 'I read your write-up on the realtime board and I am stuck on reconnection handling. How did you stop queued mutations replaying twice after a drop mid-drag?'],
  ['Sofia Lindqvist', 'sofia.l@example.com', 'Freelance dashboard project', 'We need an internal analytics dashboard built over an existing REST API. Roughly six weeks of work. Is your freelance availability open?'],
  ['Marcus Webb', 'm.webb@example.com', 'Conference talk invitation', 'I organise a regional frontend meetup and would love a 30-minute talk on accessibility testing in CI. We cover travel.'],
  ['Aisha Karim', 'aisha.karim@example.com', 'Component library licence', 'Is the accessible component library usable in a commercial product? The licence file was not obvious from the README.'],
  ['Tomasz Nowak', 'tomasz@example.com', 'Bug: CSV import rejects valid rows', 'The inventory forecasting import rejects rows with a trailing BOM. Happy to send a sample file if useful.'],
  ['Elena Vasquez', 'elena.v@example.com', 'Contract role — 6 months', 'We have a six-month contract for a full-stack developer on a logistics platform. Remote, flexible hours.'],
  ['James Fletcher', 'j.fletcher@example.com', 'Mentoring availability', 'I am switching into development from a QA role. Do you ever take on mentees, even informally?'],
  ['Nadia Hassan', 'nadia.hassan@example.com', 'Podcast interview request', 'I host a podcast on engineering practice and would love an episode on keeping storage layers swappable.'],
  ['Robert Chen', 'r.chen@example.com', 'Partnership enquiry', 'We build developer tooling and think there may be overlap with your query performance explorer. Worth a conversation?'],
  ['Grace Mbeki', 'grace.mbeki@example.com', 'Typo on the projects page', 'Small thing — the inventory forecasting card says "depeletion" rather than "depletion".'],
  ['Henrik Olsen', 'henrik@example.com', 'Rate card', 'Could you send your day rate for short consulting engagements? We need an API design review.'],
  ['Lucia Ferraro', 'lucia.ferraro@example.com', 'Speaking at our internal engineering day', 'We run an internal engineering day each quarter and would like an external speaker on API design.'],
  ['Omar Siddiqui', 'omar.s@example.com', 'Question on the repository pattern', 'How do you stop the repository interface leaking database-specific query shapes? Mine always ends up Mongo-flavoured.'],
  ['Hannah Reid', 'hannah.reid@example.com', 'Job spec attached — Staff Engineer', 'Attaching a staff engineer spec. Strong emphasis on platform and developer experience.'],
  ['Victor Petrov', 'victor.petrov@example.com', 'Open source contribution', 'I would like to add keyboard shortcut support to the component library. Do you accept outside PRs?'],
  ['Amara Diallo', 'amara.d@example.com', 'Workshop facilitation', 'Would you consider running a one-day workshop on testing strategy for a team of twelve?'],
  ['Felix Braun', 'felix.braun@example.com', 'Broken demo link', 'The live demo link on the knowledge base project returns a 502 for me.'],
  ['Ingrid Larsen', 'ingrid@example.com', 'Recruiting — platform team', 'We are building out a platform team and your experience with developer tooling looks like a strong match.'],
  ['Carlos Mendes', 'c.mendes@example.com', 'Thanks for the write-up', 'The piece on flaky test detection changed how we handle re-runs. We found 14 flaky tests in the first week.'],
  ['Yuki Tanaka', 'yuki.tanaka@example.com', 'Collaboration on an article', 'I am writing about swappable persistence layers and would like to quote your approach. Happy to review before publishing.'],
  ['Simone Rousseau', 'simone.r@example.com', 'Design system consultation', 'We are starting a design system and would value a few hours of consultation on token architecture.'],
  ['Adebayo Johnson', 'adebayo.j@example.com', 'Question about scaling', 'At what point did the link shortener need Redis? Trying to work out if we are optimising too early.'],
  ['Clara Hoffmann', 'clara.h@example.com', 'Internship mentorship programme', 'We run a summer internship and are looking for industry mentors for a few hours a month.'],
  ['Rafael Santos', 'rafael.santos@example.com', 'API documentation feedback', 'The API docs are clear, but the pagination section would benefit from a worked example of the cursor format.'],
  ['Mei Lin', 'mei.lin@example.com', 'Startup CTO role', 'Early-stage startup, seed funded, looking for a founding engineer. Equity heavy. Interested in a conversation?'],
  ['Thomas Wright', 't.wright@example.com', 'Accessibility audit request', 'We need an accessibility audit of an existing React application ahead of a compliance deadline.'],
]

function buildContactMessages(): ContactMessage[] {
  return MESSAGE_SEEDS.map(([name, email, subject, message], index) => {
    // A realistic inbox: recent items unread, older ones read, oldest archived.
    const status: ContactMessage['status'] =
      index < 8 ? 'unread' : index < 21 ? 'read' : 'archived'

    // Spread across ~3 months, newest first.
    const day = 20 - (index % 20)
    const month = index < 9 ? '09' : index < 18 ? '08' : '07'
    const createdAt = ts(`2026-${month}-${String(day).padStart(2, '0')}`)

    return {
      id: id(`message:${email}:${subject}`),
      name,
      email,
      subject,
      message,
      status,
      ipAddress: null,
      readAt: status === 'unread' ? null : createdAt,
      createdAt,
      updatedAt: createdAt,
    }
  })
}

/* ------------------------------------------------------------------ Public */

/** A pristine copy of the mock dataset. Rebuilt each call, so no shared state. */
export function buildMockData(): PersistedStore {
  return {
    profile: buildProfile(),
    technologies: buildTechnologies(),
    projects: buildProjects(),
    experience: buildExperience(),
    education: buildEducation(),
    skills: buildSkills(),
    contactMessages: buildContactMessages(),
  }
}

/**
 * Builds the admin account from environment variables.
 *
 * The password is read from ADMIN_PASSWORD and immediately bcrypt-hashed; the
 * plain text is never stored, logged or written to disk. There is no fallback
 * credential — a blank ADMIN_PASSWORD is a hard error, so the application can
 * never accidentally ship with a default login.
 */
export async function buildSeedAdmin(): Promise<AdminRecord> {
  if (!env.adminEmail || !env.adminPassword) {
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must be set in backend/.env before the store can seed an ' +
        'admin account. There is deliberately no default credential.'
    )
  }

  if (env.adminPassword.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.')
  }

  // bcrypt only reads the first 72 bytes; anything past that would be silently
  // ignored, so a longer password is weaker than it looks.
  if (Buffer.byteLength(env.adminPassword, 'utf8') > 72) {
    throw new Error('ADMIN_PASSWORD must be 72 bytes or fewer (bcrypt ignores anything longer).')
  }

  return {
    id: id(`admin:${env.adminEmail}`),
    name: env.adminName,
    email: env.adminEmail.toLowerCase(),
    passwordHash: await hashPassword(env.adminPassword),
    lastLoginAt: null,
    createdAt: ts('2026-01-05'),
    updatedAt: ts('2026-01-05'),
  }
}
