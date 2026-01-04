// apps/api/src/routes/team.routes.ts
import express, { Router } from 'express';
import { baseAuth } from '../middlewares/checkAuth.js';
import {
  getTeamRepositories,
  getMyTeams,
  getTeamInstallations,
  addReposInTeam,
  getTeamDashboardInfo,
  getTeamSettings,
  updateTeamSettings,
  createTeam,
  getTeamInfo,
  getTeamMembers,
  inviteToTeam,
  getPendingInvites,
  getMyInvitations,
  getInvitationById,
  acceptInvitation,
  rejectInvitation,
  revokeInvitation,
  updateTeam,
  updateMemberRole,
  removeMember,
  leaveTeam,
} from '../controllers/team.controller.js';
import { checkTeamMemberRole } from '../middlewares/checkRole.js';


const router: Router = express.Router();

router.use(baseAuth);

// Team info routes
router.get('/info', getTeamInfo);
router.put('/update', updateTeam);
router.get('/members', getTeamMembers);
router.put('/members/:memberId/role', checkTeamMemberRole('admin'), updateMemberRole);
router.delete('/members/:memberId', checkTeamMemberRole('admin'), removeMember);
router.post('/leave', leaveTeam);
router.post('/create', createTeam);
router.get('/mine', getMyTeams);

// Invitation routes
router.post('/invite', inviteToTeam);
router.get('/invites/pending', getPendingInvites);
router.get('/invites/mine', getMyInvitations);
router.get('/invites/:id', getInvitationById);
router.post('/invites/:id/accept', acceptInvitation);
router.post('/invites/:id/reject', rejectInvitation);
router.delete('/invites/:id', revokeInvitation);

// Team repository and installation routes
router.get('/repositories', getTeamRepositories);
router.get('/installations', getTeamInstallations);
router.post('/repositories/add', checkTeamMemberRole('admin'), addReposInTeam);

// Team settings routes
router.get('/settings', getTeamSettings);
router.put('/settings', checkTeamMemberRole('admin'), updateTeamSettings);

// Dashboard route
router.get('/dashboard', getTeamDashboardInfo);


export default router;