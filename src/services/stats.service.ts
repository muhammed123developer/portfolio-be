import type { DashboardStats } from '../types/domain'
import type {
  ContactMessageRepository,
  EducationRepository,
  ExperienceRepository,
  ProjectRepository,
  SkillRepository,
} from '../repositories/types'

/**
 * Admin dashboard statistics.
 *
 * Exists so the dashboard's seven cards cost one HTTP round trip rather than
 * seven. Each repository exposes a purpose-built count method, so this never
 * loads full collections just to measure their length.
 */
export class StatsService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly skills: SkillRepository,
    private readonly experience: ExperienceRepository,
    private readonly education: EducationRepository,
    private readonly messages: ContactMessageRepository
  ) {}

  async get(): Promise<DashboardStats> {
    // Independent counts, so they run concurrently rather than in series.
    const [projectCounts, totalSkills, totalExperience, totalEducation, messageCounts] =
      await Promise.all([
        this.projects.countAll(),
        this.skills.count(),
        this.experience.count(),
        this.education.count(),
        this.messages.countByStatus(),
      ])

    return {
      totalProjects: projectCounts.total,
      featuredProjects: projectCounts.featured,
      totalSkills,
      totalExperience,
      totalEducation,
      unreadMessages: messageCounts.unread,
      totalMessages: messageCounts.total,
    }
  }
}
