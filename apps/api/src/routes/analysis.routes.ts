import express, { Router } from "express";
import {
  createAnalysis,
  startAnalysis,
  getAnalysisStatus,
  getRepositoryAnalysis,
  getRepositoryAnalysisLogs,
  updateAnalysisStatus,
  getPrAnalysis,
} from "../controllers/analysis.controller.js";
import { baseAuth, checkAuth, teamAuth } from "../middlewares/checkAuth.js";
import { checkFullRepoAnalysisAccess } from "../middlewares/checkFeatureAccess.js";
import { stopAnalysis } from "../controllers/analysis.controller.js";

const router: Router = express.Router();

// Public status endpoint
router.get("/status", getAnalysisStatus);

// Routes that need full auth (user + subscription + team)
router.post("/create", 
  checkAuth,
  checkFullRepoAnalysisAccess,
  createAnalysis
);

router.post("/execute", 
  checkAuth,
  checkFullRepoAnalysisAccess,
  startAnalysis
);

// Stop a running analysis
router.post("/:id/stop",
  baseAuth,
  stopAnalysis
);


// Routes that only need basic auth (user authentication)
router.put("/:id/status", baseAuth, updateAnalysisStatus);
router.get("/:id/logs", baseAuth, getRepositoryAnalysisLogs);
// Get PR analyses for current user (place before dynamic :github_repositoryId route)
router.get("/pull_requests", baseAuth, getPrAnalysis);

// Repository-specific analyses
router.get("/:github_repositoryId", baseAuth, getRepositoryAnalysis);


export default router;
