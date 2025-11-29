import { Router } from 'express';
import { createExtensionReview } from '../controllers/extension.controller.js';
import { baseAuth } from '../middlewares/checkAuth.js';

const router: Router = Router();

router.post('/review', baseAuth, createExtensionReview);

export default router;
