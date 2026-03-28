import { Router } from "express";
import db from "../lib/db.js";
import { emitSafe } from "../lib/socket.js";

const router = Router();

router.get("/personnel", (_req, res) => {
  const officers = db.prepare("SELECT * FROM officers ORDER BY name").all() as any[];
  res.json(officers.map(mapOfficer));
});

router.get("/personnel/:id", (req, res) => {
  const officer = db.prepare("SELECT * FROM officers WHERE id = ?").get(req.params.id) as any;
  if (!officer) return res.status(404).json({ error: "Officer not found" });
  res.json(mapOfficer(officer));
});

router.post("/personnel", (req, res) => {
  const { id, name, rank, mobile, zone } = req.body;
  if (!name || !mobile) {
    return res.status(400).json({ error: "Name and mobile are required" });
  }

  const count = (db.prepare("SELECT COUNT(*) as c FROM officers").get() as any).c;
  const officerId = id || `P${String(count + 1).padStart(3, "0")}`;

  try {
    db.prepare(`
      INSERT INTO officers (id, name, rank, mobile, zone, status, compliance, breach_count, time_in_zone_today)
      VALUES (?, ?, ?, ?, ?, 'OFFLINE', 100, 0, 0)
    `).run(officerId, name, rank || "Constable", mobile, zone || "Collectorate");

    const officer = db.prepare("SELECT * FROM officers WHERE id = ?").get(officerId) as any;
    const mapped = mapOfficer(officer);
    emitSafe("personnel-added", mapped);
    res.status(201).json(mapped);
  } catch (err: any) {
    if (err.message?.includes("UNIQUE")) {
      return res.status(400).json({ error: "Officer ID already exists" });
    }
    throw err;
  }
});

function mapOfficer(o: any) {
  return {
    id: o.id,
    name: o.name,
    rank: o.rank,
    mobile: o.mobile,
    zone: o.zone,
    status: o.status,
    compliance: o.compliance,
    breachCount: o.breach_count,
    timeInZoneToday: o.time_in_zone_today,
    checkInTime: o.check_in_time,
    lastSeen: o.last_seen,
    latitude: o.latitude,
    longitude: o.longitude,
  };
}

export default router;
