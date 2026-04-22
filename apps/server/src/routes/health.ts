import { Router } from "express";
import { success } from "../lib/api-response.js";

const router = Router();

router.get("/", (_req, res) => success(res, { status: "ok", timestamp: new Date().toISOString() }));

export default router;
