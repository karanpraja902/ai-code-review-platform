// apps/api/src/middlewares/helpers/getUserTeam.ts
import Team from '../../models/team.model.js';
import TeamMember from '../../models/team_member.model.js';

/**
 * Gets the user's primary team (owned team first, then as member).
 * Returns the team document and the user's role in that team.
 * 
 * @param userId - The user's ID
 * @returns { team, teamId, role, isOwner } or null if no team found
 */
export async function getUserTeam(userId: string): Promise<{
  team: any;
  teamId: string;
  role: 'owner' | 'admin' | 'member';
  isOwner: boolean;
} | null> {
  // Check if user owns a team
  const ownedTeam = await Team.findOne({ ownerId: userId });
  if (ownedTeam) {
    return {
      team: ownedTeam,
      teamId: String(ownedTeam._id),
      role: 'owner',
      isOwner: true,
    };
  }

  // Check if user is a member of any team
  const membership = await TeamMember.findOne({ userId: userId });
  if (membership) {
    const team = await Team.findById(membership.teamId);
    if (team) {
      return {
        team,
        teamId: membership.teamId,
        role: membership.role as 'owner' | 'admin' | 'member',
        isOwner: false,
      };
    }
  }

  return null;
}

/**
 * Gets all teams a user belongs to (owned + member of).
 * 
 * @param userId - The user's ID
 * @returns Array of { teamId, team, role, isOwner }
 */
export async function getAllUserTeams(userId: string): Promise<Array<{
  team: any;
  teamId: string;
  role: 'owner' | 'admin' | 'member';
  isOwner: boolean;
}>> {
  const result: Array<{ team: any; teamId: string; role: 'owner' | 'admin' | 'member'; isOwner: boolean }> = [];

  // Find owned teams
  const ownedTeams = await Team.find({ ownerId: userId });
  for (const team of ownedTeams) {
    result.push({
      team,
      teamId: String(team._id),
      role: 'owner',
      isOwner: true,
    });
  }

  // Find memberships (exclude owned teams)
  const ownedTeamIds = ownedTeams.map(t => String(t._id));
  const memberships = await TeamMember.find({ 
    userId: userId,
    teamId: { $nin: ownedTeamIds },
  });

  for (const membership of memberships) {
    const team = await Team.findById(membership.teamId);
    if (team) {
      result.push({
        team,
        teamId: membership.teamId,
        role: membership.role as 'owner' | 'admin' | 'member',
        isOwner: false,
      });
    }
  }

  return result;
}
