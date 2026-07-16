import express, { Router } from "express";
import { getExtensionData, getPrData } from "../controllers/sandbox.contorller.js";
import { checkSandboxAuth } from "../middlewares/checkAuth.js";

const router: Router = express.Router();

router.use(checkSandboxAuth);
router.get("/pr/:id", getPrData);
router.get("/extension/:id", getExtensionData);

export default router;
