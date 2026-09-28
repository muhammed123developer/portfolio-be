import { Admin } from './Admin'
import { Project } from './Project'
import { Technology } from './Technology'
import { Experience } from './Experience'
import { Education } from './Education'
import { Skill } from './Skill'
import { ContactMessage } from './ContactMessage'
import { Profile } from './Profile'

/**
 * Model registry.
 *
 * Importing from '../models' (this file) rather than from an individual model
 * file guarantees every model has been registered with Mongoose — which
 * matters for `ref: 'Technology'` in Project, because `populate()` resolves
 * that name against the registry at query time.
 *
 * There is no associations block here. In the SQL version this file wired up
 * belongsToMany through an explicit join model; in MongoDB the reference array
 * on Project carries the relationship, so the join collection no longer exists.
 */

export { Admin, Project, Technology, Experience, Education, Skill, ContactMessage, Profile }

export type { AdminAttributes, AdminDocument } from './Admin'
export type { ProjectAttributes, ProjectDocument, PopulatedProject } from './Project'
export type { TechnologyAttributes, TechnologyDocument } from './Technology'
export type { ExperienceAttributes, ExperienceDocument } from './Experience'
export type { EducationAttributes, EducationDocument } from './Education'
export type { SkillAttributes, SkillDocument } from './Skill'
export type { ContactMessageAttributes, ContactMessageDocument } from './ContactMessage'
export type { ProfileAttributes, ProfileDocument } from './Profile'

/**
 * Every model, in dependency order.
 *
 * Used by the index sync script, the seed script and the test teardown, so a
 * new model only has to be added here once to be picked up by all three.
 */
export const models = {
  Admin,
  Profile,
  Technology,
  Project,
  Experience,
  Education,
  Skill,
  ContactMessage,
} as const

export type ModelName = keyof typeof models
