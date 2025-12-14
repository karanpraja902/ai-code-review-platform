import express, { Router } from 'express';
import { checkAuth } from '../middlewares/checkAuth.js';
import {
  getCustomContexts,
  getCustomContextById,
  createCustomContext,
  updateCustomContext,
  patchCustomContext,
  deleteCustomContext,
  getDefaultPrompts,
  optimizePrompt,
} from '../controllers/custom_context.controller.js';

const router: Router = express.Router();

router.use(checkAuth);

router.get('/', getCustomContexts);
router.get('/default-prompts', getDefaultPrompts);
router.get('/:id', getCustomContextById);
router.post('/', createCustomContext);
router.post('/optimize', optimizePrompt);
router.put('/:id', updateCustomContext);
router.patch('/:id', patchCustomContext);
router.delete('/:id', deleteCustomContext);

export default router;
