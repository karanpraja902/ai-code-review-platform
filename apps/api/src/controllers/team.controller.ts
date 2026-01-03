// apps/api/src/controllers/team.controller.ts
import { NextFunction, Request, Response } from 'express';
import Team, { ITeam } from '../models/team.model.js';
import AIModel, { IAIModel } from '../models/ai_model.model.js';
import { clerkClient } from '@clerk/express';
import { Github_Installation } from '../models/github_installations.model.js';
import { Github_Repository } from '../models/github_repostries.model.js';
import { CustomError } from '../middlewares/error.js';
import { logger } from '../utils/logger.js';
import Analysis from '../models/analysis.model.js';
import GithubIssue from '../models/github_issue.model.js';
import GithubPullRequest from '../models/github_pull_request.model.js';
import mongoose from 'mongoose';

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');


const isTeamOwner = (team: ITeam, userId: string) =>
  team.ownerId === userId;


export const getOrCreateCurrentOrgTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.org?.id) {
      return next(new CustomError('Select an organization to continue', 400));
    }

    let team = await Team.findById(req.org.id);
    if (team) {
      return res.status(200).json({ success: true, data: team });
    }

    // Fetch org details from Clerk to seed the local team
    const org = await clerkClient.organizations.getOrganization({ organizationId: req.org.id });

    team = await Team.create({
      _id: req.org.id,
      name: org.name,
      ownerId: req.user._id,
    });

    return res.status(201).json({ success: true, data: team });
  } catch (err) {
    logger.error(`getOrCreateCurrentOrgTeam error: ${err}`);
    return next(new CustomError('Failed to ensure organization team', 500));
  }
};

export const createTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return next(new CustomError('Team name is required', 400));
    }

    // Check if user already has a team (ownerId is unique)
    const existingTeam = await Team.findOne({ ownerId: req.user._id });
    if (existingTeam) {
      return next(new CustomError('You already have a team. Each user can only own one team.', 400));
    }

    const team = await Team.create({
      name: name.trim(),
      ownerId: req.user._id,
    });

    const teamId = team._id;

    // Update user's team reference
    await mongoose.model('User').findByIdAndUpdate(req.user._id, {
      team: {
        id: teamId,
        role: 'admin',
      },
    });

    logger.info(`Team created: ${team.name} by user ${req.user._id}`);
    return res.status(201).json({ success: true, data: team });
  } catch (err: any) {
    logger.error(`createTeam error: ${err}`);
    // Handle duplicate key error for ownerId
    if (err.code === 11000) {
      return next(new CustomError('You already have a team. Each user can only own one team.', 400));
    }
    return next(new CustomError('Failed to create team', 500));
  }
};

export const getTeamInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get team ID from user's team or header
    const teamId = req.user?.team?.id || req.team?.id;
    
    if (!teamId) {
      return res.status(200).json({ 
        success: true, 
        data: null,
        message: 'No team associated with this user'
      });
    }

    const team = await Team.findById(teamId).lean() as { _id: string; name: string; ownerId: string } | null;
    if (!team) {
      return res.status(200).json({ 
        success: true, 
        data: null,
        message: 'Team not found'
      });
    }

    // Check if user is owner or member
    const isOwner = team.ownerId === req.user._id;
    const userRole = isOwner ? 'admin' : (req.user?.team?.role || 'member');

    return res.status(200).json({ 
      success: true, 
      data: {
        ...team,
        userRole,
        isOwner,
      }
    });
  } catch (err) {
    logger.error(`getTeamInfo error: ${err}`);
    return next(new CustomError('Failed to get team info', 500));
  }
};

export const getTeamMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.user?.team?.id || req.team?.id;
    
    if (!teamId) {
      return next(new CustomError('No team context available', 400));
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return next(new CustomError('Team not found', 404));
    }

    // Get owner info
    const User = mongoose.model('User');
    type UserInfo = { _id: string; firstName: string; lastName: string; email: string; avatarUrl?: string; username?: string; team?: { role?: string } };
    
    const owner = await User.findById(team.ownerId)
      .select('_id firstName lastName email avatarUrl username')
      .lean() as UserInfo | null;

    // Get all members (users where team.id matches)
    const members = await User.find({ 'team.id': teamId })
      .select('_id firstName lastName email avatarUrl username team.role')
      .lean() as UserInfo[];

    // Format response
    const memberList = [];
    
    // Add owner first
    if (owner) {
      memberList.push({
        _id: owner._id,
        firstName: owner.firstName,
        lastName: owner.lastName,
        email: owner.email,
        avatarUrl: owner.avatarUrl,
        username: owner.username,
        role: 'admin',
        isOwner: true,
      });
    }

    // Add other members
    for (const member of members) {
      // Skip if already added as owner
      if (member._id === team.ownerId) continue;
      
      memberList.push({
        _id: member._id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        avatarUrl: member.avatarUrl,
        username: member.username,
        role: member.team?.role || 'member',
        isOwner: false,
      });
    }

    return res.status(200).json({ 
      success: true, 
      data: memberList,
      total: memberList.length,
    });
  } catch (err) {
    logger.error(`getTeamMembers error: ${err}`);
    return next(new CustomError('Failed to get team members', 500));
  }
};

// ============ INVITATION CONTROLLERS ============

import TeamInvitation from '../models/team_invitation.model.js';

export const inviteToTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, role = 'member' } = req.body;
    
    if (!email || typeof email !== 'string') {
      return next(new CustomError('Email is required', 400));
    }

    // Get user's team (must be owner)
    const team = await Team.findOne({ ownerId: req.user._id });
    if (!team) {
      return next(new CustomError('You must own a team to invite members', 403));
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already invited (pending)
    const existingInvite = await TeamInvitation.findOne({
      teamId: team._id,
      inviteeEmail: normalizedEmail,
      status: 'pending',
    });
    if (existingInvite) {
      return next(new CustomError('User already has a pending invitation', 400));
    }

    // Check if user is already a member
    const User = mongoose.model('User');
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser?.team?.id === String(team._id)) {
      return next(new CustomError('User is already a member of this team', 400));
    }

    // Create invitation
    const invitation = await TeamInvitation.create({
      teamId: team._id,
      inviterId: req.user._id,
      inviteeEmail: normalizedEmail,
      inviteeId: existingUser?._id,
      role: role === 'admin' ? 'admin' : 'member',
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    logger.info(`Invitation created: ${normalizedEmail} to team ${team.name}`);
    return res.status(201).json({ 
      success: true, 
      data: invitation,
      message: `Invitation sent to ${normalizedEmail}`
    });
  } catch (err) {
    logger.error(`inviteToTeam error: ${err}`);
    return next(new CustomError('Failed to send invitation', 500));
  }
};

export const getPendingInvites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only team owner can see pending invites
    const team = await Team.findOne({ ownerId: req.user._id });
    if (!team) {
      return res.status(200).json({ success: true, data: [] });
    }

    const invites = await TeamInvitation.find({
      teamId: team._id,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({ success: true, data: invites });
  } catch (err) {
    logger.error(`getPendingInvites error: ${err}`);
    return next(new CustomError('Failed to get pending invites', 500));
  }
};

export const getMyInvitations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userEmail = req.user.email?.toLowerCase();
    const userId = req.user._id;

    const invites = await TeamInvitation.find({
      $or: [
        { inviteeEmail: userEmail, status: 'pending' },
        { inviteeId: userId, status: 'pending' },
      ],
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }).lean();

    // Populate team names
    const teamIds = [...new Set(invites.map(i => i.teamId))];
    const teams = await Team.find({ _id: { $in: teamIds } }).select('_id name').lean();
    const teamMap = new Map(teams.map(t => [String(t._id), t.name]));

    const enrichedInvites = invites.map(invite => ({
      ...invite,
      teamName: teamMap.get(invite.teamId) || 'Unknown Team',
    }));

    return res.status(200).json({ success: true, data: enrichedInvites });
  } catch (err) {
    logger.error(`getMyInvitations error: ${err}`);
    return next(new CustomError('Failed to get invitations', 500));
  }
};

export const acceptInvitation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invitation = await TeamInvitation.findById(id);
    if (!invitation) {
      return next(new CustomError('Invitation not found', 404));
    }

    // Verify invitation is for this user
    const userEmail = req.user.email?.toLowerCase();
    if (invitation.inviteeEmail !== userEmail && invitation.inviteeId !== req.user._id) {
      return next(new CustomError('This invitation is not for you', 403));
    }

    if (invitation.status !== 'pending') {
      return next(new CustomError(`Invitation already ${invitation.status}`, 400));
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      return next(new CustomError('Invitation has expired', 400));
    }

    // Check if user already belongs to a team
    if (req.user.team?.id) {
      return next(new CustomError('You already belong to a team. Leave your current team first.', 400));
    }

    // Update user's team
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(req.user._id, {
      team: {
        id: invitation.teamId,
        role: invitation.role,
      },
    });

    // Update invitation status
    invitation.status = 'accepted';
    invitation.inviteeId = req.user._id;
    await invitation.save();

    const team = await Team.findById(invitation.teamId).select('name').lean() as { name: string } | null;
    logger.info(`User ${req.user._id} accepted invitation to team ${invitation.teamId}`);

    return res.status(200).json({ 
      success: true, 
      message: `You have joined ${team?.name || 'the team'}`,
      data: { teamId: invitation.teamId, role: invitation.role }
    });
  } catch (err) {
    logger.error(`acceptInvitation error: ${err}`);
    return next(new CustomError('Failed to accept invitation', 500));
  }
};

export const rejectInvitation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invitation = await TeamInvitation.findById(id);
    if (!invitation) {
      return next(new CustomError('Invitation not found', 404));
    }

    // Verify invitation is for this user
    const userEmail = req.user.email?.toLowerCase();
    if (invitation.inviteeEmail !== userEmail && invitation.inviteeId !== req.user._id) {
      return next(new CustomError('This invitation is not for you', 403));
    }

    if (invitation.status !== 'pending') {
      return next(new CustomError(`Invitation already ${invitation.status}`, 400));
    }

    invitation.status = 'rejected';
    await invitation.save();

    logger.info(`User ${req.user._id} rejected invitation ${id}`);
    return res.status(200).json({ success: true, message: 'Invitation rejected' });
  } catch (err) {
    logger.error(`rejectInvitation error: ${err}`);
    return next(new CustomError('Failed to reject invitation', 500));
  }
};

export const revokeInvitation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invitation = await TeamInvitation.findById(id);
    if (!invitation) {
      return next(new CustomError('Invitation not found', 404));
    }

    // Only team owner can revoke
    const team = await Team.findById(invitation.teamId);
    if (!team || team.ownerId !== req.user._id) {
      return next(new CustomError('Only team owner can revoke invitations', 403));
    }

    if (invitation.status !== 'pending') {
      return next(new CustomError(`Invitation already ${invitation.status}`, 400));
    }

    await TeamInvitation.findByIdAndDelete(id);

    logger.info(`Invitation ${id} revoked by owner ${req.user._id}`);
    return res.status(200).json({ success: true, message: 'Invitation revoked' });
  } catch (err) {
    logger.error(`revokeInvitation error: ${err}`);
    return next(new CustomError('Failed to revoke invitation', 500));
  }
};

export const getTeamSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.team?.id || req.org?.id;
    if (!teamId) {
      return next(new CustomError('Team context required', 400));
    }
    const team = await Team.findById(teamId).select('settings');
    if (!team) {
      return next(new CustomError('Team not found', 404));
    }
    const settings: any = team.settings || {};
    const result: any = { ...settings };

    // Set default commentSeverity if not present (1 = MED)
    if (result.commentSeverity === undefined) {
      result.commentSeverity = 1;
    }

    // Populate model details if ObjectIds are present
    if (settings.defaultModelRepo) {
      try {
        const modelId = typeof settings.defaultModelRepo === 'string' 
          ? settings.defaultModelRepo 
          : String(settings.defaultModelRepo);
        const model = await AIModel.findById(modelId).select('_id name provider').lean() as IAIModel | null;
        if (model) {
          result.defaultModelRepo = String(model._id);
          result.defaultModelRepoName = model.name;
          result.defaultModelRepoProvider = model.provider;
        }
      } catch (err) {
        // Ignore errors, just don't populate
      }
    }

    if (settings.defaultModelPr) {
      try {
        const modelId = typeof settings.defaultModelPr === 'string' 
          ? settings.defaultModelPr 
          : String(settings.defaultModelPr);
        const model = await AIModel.findById(modelId).select('_id name provider').lean() as IAIModel | null;
        if (model) {
          result.defaultModelPr = String(model._id);
          result.defaultModelPrName = model.name;
          result.defaultModelPrProvider = model.provider;
        }
      } catch (err) {
        // Ignore errors, just don't populate
      }
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    next(new CustomError(error.message || 'Failed to get team settings', 500));
  }
};

export const updateTeamSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.team?.id || req.org?.id;
    if (!teamId) {
      return next(new CustomError('Team context required', 400));
    }
    const team = await Team.findById(teamId);
    if (!team) {
      return next(new CustomError('Team not found', 404));
    }
    const s = typeof team.settings === 'object' && team.settings ? { ...(team.settings as any) } : {};
    const body = req.body || {};
    const nextSettings: any = { ...s };

    const repoId = typeof body.defaultModelRepoId === 'string' ? body.defaultModelRepoId : undefined;
    const prId = typeof body.defaultModelPrId === 'string' ? body.defaultModelPrId : undefined;

    if (repoId) {
      const m = await AIModel.findById(repoId).lean() as IAIModel | null;
      if (m) {
        nextSettings.defaultModelRepo = m._id;
      }
    } else if (typeof body.defaultModelRepo === 'string') {
      const m = await AIModel.findOne({ name: body.defaultModelRepo }).lean() as IAIModel | null;
      if (m) {
        nextSettings.defaultModelRepo = m._id;
      }
    }

    if (prId) {
      const m = await AIModel.findById(prId).lean() as IAIModel | null;
      if (m) {
        nextSettings.defaultModelPr = m._id;
      }
    } else if (typeof body.defaultModelPr === 'string') {
      const m = await AIModel.findOne({ name: body.defaultModelPr }).lean() as IAIModel | null;
      if (m) {
        nextSettings.defaultModelPr = m._id;
      }
    }

    // Handle commentSeverity (0=LOW, 1=MED, 2=HIGH)
    if (typeof body.commentSeverity === 'number' && [0, 1, 2].includes(body.commentSeverity)) {
      nextSettings.commentSeverity = body.commentSeverity;
    }

    // Handle prSummarySettings
    if (body.prSummarySettings && typeof body.prSummarySettings === 'object') {
      const currentPrSettings = nextSettings.prSummarySettings || {};
      nextSettings.prSummarySettings = {
        enabled: typeof body.prSummarySettings.enabled === 'boolean' ? body.prSummarySettings.enabled : currentPrSettings.enabled ?? true,
        sequenceDiagram: typeof body.prSummarySettings.sequenceDiagram === 'boolean' ? body.prSummarySettings.sequenceDiagram : currentPrSettings.sequenceDiagram ?? true,
        issueTables: typeof body.prSummarySettings.issueTables === 'boolean' ? body.prSummarySettings.issueTables : currentPrSettings.issueTables ?? true,
        impactAsessment: typeof body.prSummarySettings.impactAsessment === 'boolean' ? body.prSummarySettings.impactAsessment : currentPrSettings.impactAsessment ?? true,
        vibeCheckRap: typeof body.prSummarySettings.vibeCheckRap === 'boolean' ? body.prSummarySettings.vibeCheckRap : currentPrSettings.vibeCheckRap ?? false,
      };
    }
    
    team.settings = nextSettings;
    await team.save();
    return res.status(200).json({ success: true, message: 'Settings updated', data: nextSettings });
  } catch (error: any) {
    next(new CustomError(error.message || 'Failed to update team settings', 500));
  }
};

export const getTeamRepositories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgSlug, search } = req.query;
  
    // Use team ID from header context (set by middleware) or fallback to params
    const teamId = req.team?.id || req.params.teamId;
        console.log("teamId", teamId)

    if (!teamId) {
      return next(new CustomError('Team context required', 400));
    }

    const team = await Team.findById(teamId);
    if (!team) return next(new CustomError('Team not found', 404));

    if (!isTeamOwner(team, req.user._id)) return next(new CustomError('Forbidden: not the team owner', 403));

    // Build query for repositories where the teamId exists in the teams array
    let query: any = { teams: teamId };
    
    // If orgSlug is provided and not 'all', filter by organization
    if (orgSlug && orgSlug !== 'undefined' && orgSlug !== 'all' && typeof orgSlug === 'string') {
      console.log("orgSlug", orgSlug)
      query['owner.login'] = { $regex: new RegExp(`^${orgSlug}$`, 'i') };
    }

    // Add search filter if search query is provided
    if (search && typeof search === 'string' && search.trim()) {
      const searchConditions = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { fullName: { $regex: search.trim(), $options: 'i' } }
      ];
      
      // If query already has $or conditions, combine them
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions }
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Find repositories based on the query
    const repos = await Github_Repository.find(query)
      .sort({ fullName: 1 })
      .lean();

      console.log("repos", repos)

    return res.status(200).json({ success: true, data: repos });
  } catch (err) {
    logger.error(`getTeamRepositories error: ${err}`);
    return next(new CustomError('Failed to fetch team repositories', 500));
  }
};

export const getMyTeams = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Find teams where user is the owner
    const teams = await Team.find({ ownerId: req.user._id })
      .select('_id name ownerId')
      .lean();

    // Also check if user has a team assigned in their profile
    const userTeam = req.user?.team;
    let memberTeam = null;
    if (userTeam?.id && userTeam.id !== teams[0]?._id) {
      memberTeam = await Team.findById(userTeam.id).select('_id name ownerId').lean();
    }

    const result = teams.map((t: any) => ({
      _id: t._id,
      name: t.name,
      role: 'admin', // Owner is always admin
    }));

    // Add member team if exists
    if (memberTeam) {
      result.push({
        _id: memberTeam._id,
        name: memberTeam.name,
        role: userTeam?.role || 'member',
      });
    }

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    logger.error(`getMyTeams error: ${err}`);
    return next(new CustomError('Failed to fetch user teams', 500));
  }
};

// Add repositories into a team
export const addReposInTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use team ID from header context (set by middleware) or fallback to params
    const teamId = req.team?.id 
    console.log("teamId", teamId)
    
    if (!teamId) {
      return next(new CustomError('Team context required', 400));
    }

    const { repoIds } = req.body as { repoIds: number[] };

    if (!Array.isArray(repoIds) || repoIds.length === 0) {
      return next(new CustomError('repoIds must be a non-empty array of repositoryId numbers', 400));
    }

    const team = await Team.findById(teamId);
    if (!team) return next(new CustomError('Team not found', 404));

    // Admin role check is now handled by checkTeamRole middleware
    if (!isTeamOwner(team, req.user._id)) {
      return next(new CustomError('Forbidden: not the team owner', 403));
    }

    // Ensure these repos belong to installations owned by team owner (same visibility scope as getTeamRepositories)
    const installations = await Github_Installation.find({ userId: team.ownerId }).select('_id');
    const installationIds = installations.map((ins) => ins._id);

    if (installationIds.length === 0) {
      return res.status(200).json({ success: true, data: [], message: 'No installations available for this team owner' });
    }

    // Update repositories: add teamId to teams array if not already present
    const result = await Github_Repository.updateMany(
      { repositoryId: { $in: repoIds }, github_installationId: { $in: installationIds } },
      { $addToSet: { teams: teamId } }
    );

    // Optionally fetch updated repos to return
    const updatedRepos = await Github_Repository.find({ repositoryId: { $in: repoIds } })
      .select('_id repositoryId fullName teams')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        matchedCount: result.matchedCount ?? (result as any).n, // Mongoose version compatible
        modifiedCount: result.modifiedCount ?? (result as any).nModified,
        repos: updatedRepos,
      },
    });
  } catch (err) {
    logger.error(`addReposInTeam error: ${err}`);
    return next(new CustomError('Failed to add repositories to team', 500));
  }
};

export const getTeamDashboardInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const teamId = req.team?.id;

        if (!teamId) {
            return next(new CustomError('Team context required', 400));
        }

        // Verify team exists and user has access
        const team = await Team.findById(teamId);
        if (!team) {
            return next(new CustomError('Team not found', 404));
        }

        // Check if user is the owner of the team
        if (team.ownerId !== req.user._id) {
            return next(new CustomError('Forbidden: not the team owner', 403));
        }

        // Time range filter: supports last 7/15/30/60/90 days, default 7
        const allowedDays = new Set([7, 15, 30, 60, 90]);
        const qDays = parseInt(String(req.query.days ?? '7'), 10);
        const days = allowedDays.has(qDays) ? qDays : 7;
        const now = new Date();
        const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const rangeStart = (() => {
            const d = new Date(now);
            d.setDate(d.getDate() - (days - 1));
            return startOfDay(d);
        })();
        const formatDateKey = (d: Date) => {
            const yr = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const da = String(d.getDate()).padStart(2, '0');
            return `${yr}-${mo}-${da}`;
        };
        const buildDailyCounts = (items: any[]) => {
            const map: Record<string, number> = {};
            for (const item of items) {
                const created = new Date(item.createdAt);
                if (created < rangeStart || created > now) continue;
                if (item.status !== 'completed') continue;
                const key = formatDateKey(created);
                map[key] = (map[key] ?? 0) + 1;
            }
            const out: { date: string; count: number }[] = [];
            for (let i = 0; i < days; i++) {
                const d = new Date(rangeStart);
                d.setDate(rangeStart.getDate() + i);
                const key = formatDateKey(d);
                out.push({ date: key, count: map[key] ?? 0 });
            }
            return out;
        };

        // Build daily average comments per unique PR (unique by pr_url or pr_number+repoUrl)
        const buildDailyAvgCommentsForUniquePRs = (items: any[]) => {
            const dayToPRMap: Record<string, Record<string, { total: number; runs: number }>> = {};
            for (const item of items) {
                const created = new Date(item.createdAt);
                if (created < rangeStart || created > now) continue;
                if (item.status !== 'completed') continue;
                const key = formatDateKey(created);
                const prKey = (item.pr_url && item.pr_url.length > 0)
                  ? String(item.pr_url)
                  : `${item.repoUrl}#${item.pr_number ?? ''}`;
                const comments = typeof item.pr_comments_posted === 'number' ? item.pr_comments_posted : 0;
                if (!dayToPRMap[key]) dayToPRMap[key] = {};
                if (!dayToPRMap[key][prKey]) dayToPRMap[key][prKey] = { total: 0, runs: 0 };
                dayToPRMap[key][prKey].total += comments;
                dayToPRMap[key][prKey].runs += 1;
            }
            const out: { date: string; count: number }[] = [];
            for (let i = 0; i < days; i++) {
                const d = new Date(rangeStart);
                d.setDate(rangeStart.getDate() + i);
                const key = formatDateKey(d);
                const prEntries = Object.values(dayToPRMap[key] || {});
                const uniquePRs = prEntries.length;
                const sumCommentsAcrossPRs = prEntries.reduce((acc, e) => acc + e.total, 0);
                const avg = uniquePRs > 0 ? sumCommentsAcrossPRs / uniquePRs : 0;
                out.push({ date: key, count: Number(avg.toFixed(2)) });
            }
            return out;
        };

        // Build daily total reviewed lines of code
        const buildDailyReviewedLinesOfCode = (items: any[]) => {
            const map: Record<string, number> = {};
            for (const item of items) {
                const created = new Date(item.createdAt);
                if (created < rangeStart || created > now) continue;
                if (item.status !== 'completed') continue;
                const key = formatDateKey(created);
                const lines = typeof item.reviewedLinesOfCode === 'number' ? item.reviewedLinesOfCode : 0;
                map[key] = (map[key] ?? 0) + lines;
            }
            const out: { date: string; count: number }[] = [];
            for (let i = 0; i < days; i++) {
                const d = new Date(rangeStart);
                d.setDate(rangeStart.getDate() + i);
                const key = formatDateKey(d);
                out.push({ date: key, count: map[key] ?? 0 });
            }
            return out;
        };

        // Build daily average merge time for merged PRs
        const buildDailyAvgMergeTime = async (repoFullNames: string[]) => {
            if (repoFullNames.length === 0) {
                const out: { date: string; count: number }[] = [];
                for (let i = 0; i < days; i++) {
                    const d = new Date(rangeStart);
                    d.setDate(rangeStart.getDate() + i);
                    const key = formatDateKey(d);
                    out.push({ date: key, count: 0 });
                }
                return out;
            }

            try {
                const prCollection = mongoose.connection.db?.collection('pull_request_datas');
                if (!prCollection) return [];

                // Find all merged PRs for team's repositories within date range
                // We need to get the earliest document per prKey for accurate createdAt
                const mergedPRs = await prCollection.aggregate([
                    {
                        $match: {
                            'repository.name': { $in: repoFullNames },
                            state: 'merged',
                            mergedAt: { $exists: true },
                            createdAt: {
                                $gte: rangeStart,
                                $lte: now
                            }
                        }
                    },
                    {
                        // Group by prKey to find earliest createdAt
                        $group: {
                            _id: '$prKey',
                            earliestCreatedAt: { $min: '$createdAt' },
                            mergedAt: { $first: '$mergedAt' },
                            repository: { $first: '$repository' },
                            pr: { $first: '$pr' }
                        }
                    }
                ]).toArray();

                // Group by date and calculate average merge time
                const dayToMergeTimes: Record<string, number[]> = {};
                
                for (const prData of mergedPRs) {
                    if (!prData.mergedAt || !prData.earliestCreatedAt) continue;

                    const createdAt = new Date(prData.earliestCreatedAt);
                    const mergedAt = new Date(prData.mergedAt);
                    
                    // Calculate merge time in hours (from earliest commit to merge)
                    const mergeTimeHours = (mergedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
                    
                    // Only consider reasonable merge times (> 0 and < 30 days)
                    if (mergeTimeHours > 0 && mergeTimeHours < 720) {
                        const key = formatDateKey(createdAt);
                        if (!dayToMergeTimes[key]) dayToMergeTimes[key] = [];
                        dayToMergeTimes[key].push(mergeTimeHours);
                    }
                }

                const out: { date: string; count: number }[] = [];
                for (let i = 0; i < days; i++) {
                    const d = new Date(rangeStart);
                    d.setDate(rangeStart.getDate() + i);
                    const key = formatDateKey(d);
                    const mergeTimes = dayToMergeTimes[key] || [];
                    const avg = mergeTimes.length > 0
                        ? mergeTimes.reduce((sum, t) => sum + t, 0) / mergeTimes.length
                        : 0;
                    out.push({ date: key, count: Number(avg.toFixed(2)) });
                }
                return out;
            } catch (error) {
                console.error('Error calculating merge time:', error);
                return [];
            }
        };

        // Get all repositories that belong to this team
        const repositories = await Github_Repository.find({ teams: teamId }).lean();
        const repositoryIds = repositories.map(repo => repo._id);

        // Get total repositories added to team
        const total_repo_added = repositories.length;

        // Get analyses split by type for team repositories (using team owner's userId)
        const fullRepoAnalyses = await Analysis.find({
                      github_repositoryId: { $in: repositoryIds },

            userId: team.ownerId,
            analysis_type: 'full_repo_analysis',
            createdAt: { $gte: rangeStart, $lte: now }
        }).lean();

        const prAnalyses = await Analysis.find({
                      github_repositoryId: { $in: repositoryIds },

            userId: team.ownerId,
            analysis_type: 'pr_analysis',
            createdAt: { $gte: rangeStart, $lte: now }
        }).lean();

        // Get all GitHub issues created for team repositories
        const githubIssues = await GithubIssue.find({
            github_repositoryId: { $in: repositoryIds },
            createdBy: team.ownerId,
            createdAt: { $gte: rangeStart, $lte: now }
        }).lean();

        // Get all pull requests created for team repositories
        const pullRequests = await GithubPullRequest.find({
            github_repositoryId: { $in: repositoryIds },
            createdBy: team.ownerId,
            createdAt: { $gte: rangeStart, $lte: now }
        }).lean();

        // Calculate full repo review metrics (only full repo analyses)
        const total_reviews = fullRepoAnalyses.length;
        const total_github_issues_suggested = githubIssues.length;
        const github_issues_opened = githubIssues.filter(issue => issue.state !== 'draft').length;
        const total_pull_request_suggested = pullRequests.length;
        const pull_request_opened = pullRequests.filter(pr => pr.state !== 'draft').length;

        // Get recent activity (last 5 items) - both full repo analyses and PR analyses
        const recentFullRepoAnalyses = await Analysis.find({
            github_repositoryId: { $in: repositoryIds },
            userId: team.ownerId,
            analysis_type: 'full_repo_analysis',
            createdAt: { $gte: rangeStart, $lte: now }
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('github_repositoryId', 'fullName defaultBranch')
        .lean();

        const recentPrAnalyses = await Analysis.find({
            github_repositoryId: { $in: repositoryIds },
            userId: team.ownerId,
            analysis_type: 'pr_analysis',
            createdAt: { $gte: rangeStart, $lte: now }
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('github_repositoryId', 'fullName defaultBranch')
        .lean();

        // Format recent activity data
        const recent_full_repo = recentFullRepoAnalyses.map(analysis => {
            const repo = analysis.github_repositoryId as any;
            const repoIssues = githubIssues.filter(issue => 
                issue.github_repositoryId.toString() === analysis.github_repositoryId.toString() &&
                issue.analysisId?.toString() === (analysis._id as string).toString()
            );
            const repoPRs = pullRequests.filter(pr => 
                pr.github_repositoryId.toString() === analysis.github_repositoryId.toString() &&
                pr.analysisId?.toString() === (analysis._id as string).toString()
            );

            return {
                repo_name: repo?.fullName || 'Unknown',
                branch: repo?.defaultBranch || 'main',
                state: analysis.status,
                date: analysis.createdAt,
                total_github_issues_suggested: repoIssues.length,
                github_issues_opened: repoIssues.filter(issue => issue.state !== 'draft').length,
                total_pull_request_suggested: repoPRs.length,
                pull_request_opened: repoPRs.filter(pr => pr.state !== 'draft').length,
                repo_id: (repo?._id ? String(repo._id) : String(analysis.github_repositoryId)),
                analysis_id: String(analysis._id)
            };
        });

        const recent_pull_requests = recentPrAnalyses.map(analysis => {
            const repo = analysis.github_repositoryId as any;
            const prUrl = (analysis as any).pr_url && (analysis as any).pr_url.length > 0
              ? String((analysis as any).pr_url)
              : (analysis as any).pr_number && repo?.fullName
                ? `https://github.com/${repo.fullName}/pull/${(analysis as any).pr_number}`
                : undefined;
            return {
                repo_name: repo?.fullName || 'Unknown',
                pr_title: (analysis as any).pr_title ?? undefined,
                pr_number: (analysis as any).pr_number ?? undefined,
                state: analysis.status,
                date: analysis.createdAt,
                total_comments: typeof (analysis as any).pr_comments_posted === 'number' ? (analysis as any).pr_comments_posted : 0,
                pr_url: prUrl,
                repo_id: (repo?._id ? String(repo._id) : String(analysis.github_repositoryId)),
                analysis_id: String(analysis._id),
                errorLogs: analysis.errorLogs
            };
        });

        // Calculate merge time trends
        const repoFullNames = repositories.map(repo => repo.fullName);
        const daily_pr_merge_time_avg = await buildDailyAvgMergeTime(repoFullNames);

        const dashboardData = {
            total_repo_added,
            full_repo_review: {
                total_reviews,
                total_github_issues_suggested,
                github_issues_opened,
                total_pull_request_suggested,
                pull_request_opened
            },
            pr_reviews: {
                total_reviews: prAnalyses.length,
                total_comments: prAnalyses
                  .filter(a => a.status === 'completed')
                  .reduce((acc, a) => acc + (typeof (a as any).pr_comments_posted === 'number' ? (a as any).pr_comments_posted : 0), 0)
            },
            recent_activity: {
                pull_request: recent_pull_requests,
                full_repo: recent_full_repo
            },
            trends: {
                daily_full_repo_reviews: buildDailyCounts(fullRepoAnalyses),
                daily_pr_reviews: buildDailyCounts(prAnalyses),
                daily_pr_comments_avg: buildDailyAvgCommentsForUniquePRs(prAnalyses),
                daily_reviewed_lines_of_code: buildDailyReviewedLinesOfCode(prAnalyses),
                daily_pr_merge_time_avg,
                range_days: days
            }
        };

        res.status(200).json({
            success: true,
            data: dashboardData
        });

    } catch (error: any) {
        console.error('Error getting team dashboard info:', error);
        return next(new CustomError(error.message || "Failed to get team dashboard info", 500));
    }
}