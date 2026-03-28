import { Router } from "express";
import db, { ZONES, getDistanceMeters } from "../lib/db.js";
import { emitSafe } from "../lib/socket.js";

const router = Router();

router.get("/locations", (_req, res) => {
  const locs = db.prepare("SELECT * FROM locations").all() as any[];
  res.json(locs.map(mapLoc));
});

router.put("/locations/:officerId", (req, res) => {
  const { officerId } = req.params;
  const { latitude, longitude } = req.body;

  const officer = db.prepare("SELECT * FROM officers WHERE id = ?").get(officerId) as any;
  if (!officer) return res.status(404).json({ error: "Officer not found" });

  const zone = ZONES[officer.zone];
  let status = "OFFLINE";
  if (zone && latitude && longitude) {
    const dist = getDistanceMeters(latitude, longitude, zone.lat, zone.lng);
    status = dist <= zone.radius ? "IN_ZONE" : "BREACH";
  }

  db.prepare(`
    INSERT INTO locations (officer_id, latitude, longitude, status, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(officer_id) DO UPDATE SET latitude=excluded.latitude, longitude=excluded.longitude, status=excluded.status, updated_at=excluded.updated_at
  `).run(officerId, latitude, longitude, status);

  db.prepare("UPDATE officers SET latitude=?, longitude=?, status=?, last_seen=datetime('now') WHERE id=?")
    .run(latitude, longitude, status, officerId);

  const loc = { officerId, latitude, longitude, status, updatedAt: new Date().toISOString() };
  emitSafe("location-update", loc);

  if (status === "BREACH") {
    const existing = db.prepare("SELECT * FROM alerts WHERE officer_id=? AND type='EXIT' AND acknowledged=0").get(officerId) as any;
    if (!existing) {
      const result = db.prepare(`
        INSERT INTO alerts (type, level, officer_id, officer_name, zone, message)
        VALUES ('EXIT', 'L1', ?, ?, ?, ?)
      `).run(officerId, officer.name, officer.zone, `${officer.name} has left ${officer.zone}`);

      const alert = db.prepare("SELECT * FROM alerts WHERE id=?").get(result.lastInsertRowid) as any;
      emitSafe("alert-triggered", mapAlert(alert));
      db.prepare("UPDATE officers SET breach_count = breach_count + 1 WHERE id=?").run(officerId);
    }
  }

  res.json(loc);
});

function mapLoc(l: any) {
  return {
    officerId: l.officer_id,
    latitude: l.latitude,
    longitude: l.longitude,
    status: l.status,
    updatedAt: l.updated_at,
  };
}

function mapAlert(a: any) {
  return {
    id: a.id,
    type: a.type,
    level: a.level,
    officerId: a.officer_id,
    officerName: a.officer_name,
    zone: a.zone,
    message: a.message,
    acknowledged: !!a.acknowledged,
    createdAt: a.created_at,
  };
}

export default router;
