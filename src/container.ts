import type { RequestHandler } from 'express'

import { createRepositories, type Repositories } from './repositories'

import { AuthService } from './services/auth.service'
import { ProjectService } from './services/project.service'
import { TechnologyService } from './services/technology.service'
import { ExperienceService } from './services/experience.service'
import { EducationService } from './services/education.service'
import { SkillService } from './services/skill.service'
import { ContactService } from './services/contact.service'
import { ProfileService } from './services/profile.service'
import { StatsService } from './services/stats.service'
import { UploadService } from './services/upload.service'

import { AuthController } from './controllers/auth.controller'
import { ProjectController } from './controllers/project.controller'
import { TechnologyController } from './controllers/technology.controller'
import { ExperienceController } from './controllers/experience.controller'
import { EducationController } from './controllers/education.controller'
import { SkillController } from './controllers/skill.controller'
import { ContactController } from './controllers/contact.controller'
import { ProfileController } from './controllers/profile.controller'
import { UploadController } from './controllers/upload.controller'

import { createRequireAuth } from './middleware/requireAuth'

/**
 * Composition root.
 *
 * The single place where concrete implementations are chosen and wired
 * together. Services declare what they need through their constructors and
 * never reach for a module-level singleton, which is what makes the storage
 * backend swappable and every service trivially testable — a test constructs
 * one with stub repositories and nothing else changes.
 *
 * Note how the dependencies read: ProjectService needs the technology
 * repository to validate references, and TechnologyService needs the project
 * repository to run the delete cascade. Those relationships are explicit here
 * rather than hidden behind imports scattered through the service files.
 *
 * Nothing below this file imports it: dependencies flow outward from here.
 */

export interface Services {
  auth: AuthService
  projects: ProjectService
  technologies: TechnologyService
  experience: ExperienceService
  education: EducationService
  skills: SkillService
  contact: ContactService
  profile: ProfileService
  stats: StatsService
  uploads: UploadService
}

export interface Controllers {
  auth: AuthController
  projects: ProjectController
  technologies: TechnologyController
  experience: ExperienceController
  education: EducationController
  skills: SkillController
  contact: ContactController
  profile: ProfileController
  uploads: UploadController
}

export interface Container {
  repositories: Repositories
  services: Services
  controllers: Controllers
  middleware: {
    requireAuth: RequestHandler
  }
}

/**
 * Builds the object graph.
 *
 * `overrides` lets a test replace individual repositories — for example to
 * assert behaviour when one throws — without constructing the whole graph by
 * hand.
 */
export function createContainer(overrides: Partial<Repositories> = {}): Container {
  const repositories: Repositories = { ...createRepositories(), ...overrides }

  const services: Services = {
    auth: new AuthService(repositories.admins, repositories.sessions),
    projects: new ProjectService(repositories.projects, repositories.technologies),
    technologies: new TechnologyService(repositories.technologies, repositories.projects),
    experience: new ExperienceService(repositories.experience),
    education: new EducationService(repositories.education),
    skills: new SkillService(repositories.skills),
    contact: new ContactService(repositories.contactMessages),
    profile: new ProfileService(repositories.profile),
    stats: new StatsService(
      repositories.projects,
      repositories.skills,
      repositories.experience,
      repositories.education,
      repositories.contactMessages
    ),
    uploads: new UploadService(),
  }

  const controllers: Controllers = {
    auth: new AuthController(services.auth),
    projects: new ProjectController(services.projects),
    technologies: new TechnologyController(services.technologies),
    experience: new ExperienceController(services.experience),
    education: new EducationController(services.education),
    skills: new SkillController(services.skills),
    contact: new ContactController(services.contact),
    profile: new ProfileController(services.profile, services.stats),
    uploads: new UploadController(services.uploads),
  }

  return {
    repositories,
    services,
    controllers,
    middleware: { requireAuth: createRequireAuth(services.auth) },
  }
}
