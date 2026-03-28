import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import authRoutes from "./auth.js";
import personnelRoutes from "./personnel.js";
import locationsRoutes from "./locations.js";
import alertsRoutes from "./alerts.js";
import dashboardRoutes from "./dashboard.js";
import attendanceRoutes from "./attendance.js";
import announcementsRoutes from "./announcements.js";
import demoRoutes from "./demo.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.use(authRoutes);
router.use(personnelRoutes);
router.use(locationsRoutes);
router.use(alertsRoutes);
router.use(dashboardRoutes);
router.use(attendanceRoutes);
router.use(announcementsRoutes);
router.use(demoRoutes);

export default router;
