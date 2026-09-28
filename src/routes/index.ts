import { Router } from 'express'

import type { Container } from '../container'
import { env } from '../config/env'

import { createAuthRoutes } from './auth.routes'
import { createProjectRoutes } from './project.routes'
import { createTechnologyRoutes } from './technology.routes'
import { createExperienceRoutes } from './experience.routes'
import { createEducationRoutes } from './education.routes'
import { createSkillRoutes } from './skill.routes'
import { createContactRoutes } from './contact.routes'
import { createAdminRoutes, createProfileRoutes } from './profile.routes'
import { createUploadRoutes } from './upload.routes'

/**
 * The single API router.
 *
 * app.ts mounts this once at /api, so the entire public surface of the
 * application is visible in this one file — there is no hidden mounting
 * scattered across the codebase.
 *
 * Takes the container rather than importing controllers directly, so route
 * wiring stays a pure function of the dependency graph built in container.ts.
 */
export function createApiRouter(container: Container): Router {
  const router = Router()
  const { requireAuth } = container.middleware
  const c = container.controllers

  /** Liveness probe for uptime monitors and deployment platforms. */
  router.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        uptime: Math.round(process.uptime()),
        dataSource: env.dataSource,
        timestamp: new Date().toISOString(),
      },
    })
  })

  router.use('/auth', createAuthRoutes(c.auth, requireAuth))
  router.use('/projects', createProjectRoutes(c.projects, requireAuth))
  router.use('/technologies', createTechnologyRoutes(c.technologies, requireAuth))
  router.use('/experience', createExperienceRoutes(c.experience, requireAuth))
  router.use('/education', createEducationRoutes(c.education, requireAuth))
  router.use('/skills', createSkillRoutes(c.skills, requireAuth))
  router.use('/contact', createContactRoutes(c.contact, requireAuth))
  router.use('/profile', createProfileRoutes(c.profile, requireAuth))
  router.use('/admin', createAdminRoutes(c.profile, requireAuth))
  router.use('/uploads', createUploadRoutes(c.uploads, requireAuth))

  return router
}
