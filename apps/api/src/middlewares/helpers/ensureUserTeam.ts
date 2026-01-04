// apps/api/src/middlewares/helpers/ensureUserTeam.ts
import Team from '../../models/team.model.js';
import TeamMember from '../../models/team_member.model.js';
import { logger } from '../../utils/logger.js';

/**
 * Ensures a user has a team. If no team exists (owned or membership), creates one.
 * This handles migration for old users who don't have teams yet.
 * 
 * @param userId - The user's ID
 * @param teamName - Optional team name (defaults to "AC")
 * @returns The team info { teamId, isNewTeam } or null if creation failed
 */
export async function ensureUserTeam(
  userId: string,
  teamName: string = 'AC'
): Promise<{ teamId: string; isNewTeam: boolean } | null> {
  try {
    // Check if user owns a team
    const ownedTeam = await Team.findOne({ ownerId: userId });
    if (ownedTeam) {
      // Also ensure TeamMember entry exists for owner (migration for old data)
      const existingMembership = await TeamMember.findOne({
        teamId: String(ownedTeam._id),
        userId: userId,
      });
      
      if (!existingMembership) {
        await TeamMember.create({
          teamId: String(ownedTeam._id),
          userId: userId,
          role: 'owner',
          joinedAt: new Date(),
        });
        logger.info(`Created missing TeamMember entry for team owner: ${userId}`);
      }
      
      return { teamId: String(ownedTeam._id), isNewTeam: false };
    }

    // Check if user is a member of any team
    const membership = await TeamMember.findOne({ userId: userId });
    if (membership) {
      return { teamId: membership.teamId, isNewTeam: false };
    }

    // No team found - create a new one
    const team = await Team.create({
      name: teamName,
      ownerId: userId,
    });

    // Create TeamMember entry for owner
    await TeamMember.create({
      teamId: String(team._id),
      userId: userId,
      role: 'owner',
      joinedAt: new Date(),
    });

    logger.info(`Default team "${teamName}" created for user: ${userId}`);
    return { teamId: String(team._id), isNewTeam: true };
  } catch (error) {
    logger.warn(`Failed to ensure team for user ${userId}: ${error}`);
    return null;
  }
}
