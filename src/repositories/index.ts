import { env } from '../config/env'
import type { Repositories } from './types'

import { MemoryAdminRepository } from './memory/admin.repository'
import { MemorySessionRepository } from './memory/session.repository'
import { MemoryContactMessageRepository } from './memory/contactMessage.repository'
import { MemoryEducationRepository } from './memory/education.repository'
import { MemoryExperienceRepository } from './memory/experience.repository'
import { MemoryProfileRepository } from './memory/profile.repository'
import { MemoryProjectRepository } from './memory/project.repository'
import { MemorySkillRepository } from './memory/skill.repository'
import { MemoryTechnologyRepository } from './memory/technology.repository'

/**
 * Repository factory — the single place that decides which storage
 * implementation the application runs on.
 *
 * This is the seam the whole architecture is built around. Adding MongoDB
 * means writing `./mongo/*.repository.ts` against the interfaces in `./types`
 * and adding one branch here. No controller, service, route, validator or
 * frontend file changes.
 */
export function createRepositories(): Repositories {
  if (env.dataSource === 'mongo' && !env.isTest) {
    // Reached only once repositories/mongo/ exists. Until then this throws
    // loudly rather than silently falling back to mock data, which would be a
    // far more confusing failure in production.
    throw new Error(
      'DATA_SOURCE=mongo is not implemented yet. The MongoDB repositories are the final ' +
        'migration step — set DATA_SOURCE=memory until then.'
    )
  }

  return {
    admins: new MemoryAdminRepository(),
    sessions: new MemorySessionRepository(),
    profile: new MemoryProfileRepository(),
    technologies: new MemoryTechnologyRepository(),
    projects: new MemoryProjectRepository(),
    experience: new MemoryExperienceRepository(),
    education: new MemoryEducationRepository(),
    skills: new MemorySkillRepository(),
    contactMessages: new MemoryContactMessageRepository(),
  }
}

export type { Repositories } from './types'
