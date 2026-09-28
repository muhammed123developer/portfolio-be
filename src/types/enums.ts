/**
 * Enumerations shared by the models, the validators and the seeders.
 *
 * Each is declared once as a `const` array and the TypeScript union is derived
 * from it, so the Mongoose schema `enum`, the express-validator `isIn` check
 * and the compile-time type can never drift apart. Adding a value here is the
 * only edit needed on the backend.
 */

export const PROJECT_STATUSES = ['draft', 'in_progress', 'completed', 'archived'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const SKILL_CATEGORIES = [
  'frontend',
  'backend',
  'database',
  'devops',
  'tools',
  'other',
] as const
export type SkillCategory = (typeof SKILL_CATEGORIES)[number]

/** Technologies are grouped with the same vocabulary as skills. */
export const TECHNOLOGY_CATEGORIES = SKILL_CATEGORIES
export type TechnologyCategory = SkillCategory

export const MESSAGE_STATUSES = ['unread', 'read', 'archived'] as const
export type MessageStatus = (typeof MESSAGE_STATUSES)[number]

/** Human-readable labels for the admin UI and seed data. */
export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Database',
  devops: 'DevOps',
  tools: 'Tools',
  other: 'Other',
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
}
