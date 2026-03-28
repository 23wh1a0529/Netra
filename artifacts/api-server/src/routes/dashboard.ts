import { Router } from "express";
import db from "../lib/db.js";

const router = Router();

router.get("/dashboard/stats", (_req, res) => {
  const totalAssigned = (db.prepare("SELECT COUNT(*) as c FROM officers").get() as any).c;
  const inZone = (db.prepare("SELECT COUNT(*) as c FROM officers WHERE status = 'IN_ZONE'").get() as any).c;
  const violations = (db.prepare("SELECT COUNT(*) as c FROM alerts WHERE acknowledged = 0 AND date(created_at) = date('now')").get() as any).c;
  const notPresent = (db.prepare("SELECT COUNT(*) as c FROM officers WHERE status IN ('OFFLINE', 'LATE')").get() as any).c;

  res.json({ totalAssigned, inZone, violations, notPresent });
});

router.get("/dashboard/breach-chart", (_req, res) => {
  const rows = db.prepare(`
    SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
    FROM alerts
    WHERE type IN ('EXIT', 'BREACH') AND date(created_at) = date('now')
    GROUP BY hour
    ORDER BY hour
  `).all() as any[];

  const chartData = Array.from({ length: 24 }, (_, i) => {
    const found = rows.find((r) => r.hour === i);
    return { hour: i, count: found ? found.count : 0 };
  });

  res.json(chartData);
});

export default router;
