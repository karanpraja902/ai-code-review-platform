import { Router } from 'express';
import { createExtensionReview, getExtensionComments, getAllExtensionComments, getAnalysisStatus, stopExtensionAnalysis } from '../controllers/extension.controller.js';
import { baseAuth } from '../middlewares/checkAuth.js';

const router: Router = Router();

router.post('/review', baseAuth, createExtensionReview);
router.get('/comments/:dataId', baseAuth, getExtensionComments);
router.get('/comments/all/:dataId', baseAuth, getAllExtensionComments);
router.get('/status/:dataId', baseAuth, getAnalysisStatus);
router.post('/stop/:dataId', baseAuth, stopExtensionAnalysis);

export default router;

