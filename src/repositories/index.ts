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

import { MongoAdminRepository } from './mongo/admin.repository'
import { MongoSessionRepository } from './mongo/session.repository'
import { MongoContactMessageRepository } from './mongo/contactMessage.repository'
import { MongoEducationRepository } from './mongo/education.repository'
import { MongoExperienceRepository } from './mongo/experience.repository'
import { MongoProfileRepository } from './mongo/profile.repository'
import { MongoProjectRepository } from './mongo/project.repository'
import { MongoSkillRepository } from './mongo/skill.repository'
import { MongoTechnologyRepository } from './mongo/technology.repository'

/**
 * Repository factory — the single place that decides which storage
 * implementation the application runs on.
 *
 * This is the seam the whole architecture is built around: both backends
 * implement the interfaces in `./types`, so no controller, service, route,
 * validator or frontend file knows which one is active.
 *
 * The test suite always runs on the in-memory backend (`usesMemoryStore` is
 * forced on under NODE_ENV=test), so tests can never touch a real cluster.
 */
export function createRepositories(): Repositories {
  if (!env.usesMemoryStore) {
    return {
      admins: new MongoAdminRepository(),
      sessions: new MongoSessionRepository(),
      profile: new MongoProfileRepository(),
      technologies: new MongoTechnologyRepository(),
      projects: new MongoProjectRepository(),
      experience: new MongoExperienceRepository(),
      education: new MongoEducationRepository(),
      skills: new MongoSkillRepository(),
      contactMessages: new MongoContactMessageRepository(),
    }
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
