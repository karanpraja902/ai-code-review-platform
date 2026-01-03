// apps/api/src/routes/team.routes.ts
import express, { Router } from 'express';
import { authWithTeam } from '../middlewares/checkAuth.js';
import {
  getTeamRepositories,
  getMyTeams,
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
} from '../controllers/team.controller.js';
import { checkTeamMemberRole } from '../middlewares/checkRole.js';


const router: Router = express.Router();

router.use(authWithTeam);

// Team info routes
router.get('/info', getTeamInfo);
router.get('/members', getTeamMembers);
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

// Team repository routes
router.get('/repositories', getTeamRepositories);
router.post('/repositories/add', checkTeamMemberRole('admin'), addReposInTeam);

// Team settings routes
router.get('/settings', getTeamSettings);
router.put('/settings', checkTeamMemberRole('admin'), updateTeamSettings);

// Dashboard route
router.get('/dashboard', getTeamDashboardInfo);


export default router;