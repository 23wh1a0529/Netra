import { Router } from "express";
import db, { ZONES } from "../lib/db.js";
import { emitSafe } from "../lib/socket.js";

const router = Router();

router.post("/demo/trigger-breach", (_req, res) => {
  const zone = ZONES["RTC Bus Stand"];
  const newLat = zone.lat + 0.0008;
  const newLng = zone.lng + 0.0008;

  db.prepare("UPDATE officers SET latitude=?, longitude=?, status='BREACH', last_seen=datetime('now') WHERE id='P003'")
    .run(newLat, newLng);

  db.prepare(`
    INSERT INTO locations (officer_id, latitude, longitude, status, updated_at)
    VALUES ('P003', ?, ?, 'BREACH', datetime('now'))
    ON CONFLICT(officer_id) DO UPDATE SET latitude=excluded.latitude, longitude=excluded.longitude, status='BREACH', updated_at=excluded.updated_at
  `).run(newLat, newLng);

  const result = db.prepare(`
    INSERT INTO alerts (type, level, officer_id, officer_name, zone, message)
    VALUES ('EXIT', 'L1', 'P003', 'Krishna Reddy', 'RTC Bus Stand', 'Krishna Reddy has left RTC Bus Stand (80m outside zone)')
  `).run();

  const alert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(result.lastInsertRowid) as any;

  emitSafe("location-update", { officerId: "P003", latitude: newLat, longitude: newLng, status: "BREACH" });
  emitSafe("alert-triggered", {
    id: alert.id,
    type: "EXIT",
    level: "L1",
    officerId: "P003",
    officerName: "Krishna Reddy",
    zone: "RTC Bus Stand",
    message: "Krishna Reddy has left RTC Bus Stand (80m outside zone)",
    acknowledged: false,
    createdAt: alert.created_at,
  });
  emitSafe("breach-zone", { zoneId: "RTC Bus Stand" });
  emitSafe("stats-update", getStats());

  db.prepare("UPDATE officers SET breach_count = breach_count + 1 WHERE id = 'P003'").run();

  res.json({ message: "Breach triggered for P003" });
});

router.post("/demo/escalate-l3", (_req, res) => {
  setTimeout(() => {
    const alert = db.prepare("SELECT * FROM alerts WHERE officer_id = 'P003' ORDER BY created_at DESC LIMIT 1").get() as any;
    if (alert) {
      db.prepare("UPDATE alerts SET level = 'L3' WHERE id = ?").run(alert.id);
      emitSafe("alert-escalated", {
        id: alert.id,
        type: alert.type,
        level: "L3",
        officerId: "P003",
        officerName: "Krishna Reddy",
        zone: "RTC Bus Stand",
        message: "ESCALATED: Krishna Reddy absent from zone for 15+ minutes (L3)",
        acknowledged: false,
        createdAt: alert.created_at,
      });
    }
  }, 2000);

  res.json({ message: "Escalation to L3 initiated (2s delay)" });
});

router.post("/demo/reset", (_req, res) => {
  const zone = ZONES["RTC Bus Stand"];
  db.prepare("UPDATE officers SET latitude=?, longitude=?, status='IN_ZONE' WHERE id='P003'")
    .run(zone.lat, zone.lng);
  db.prepare(`
    UPDATE locations SET latitude=?, longitude=?, status='IN_ZONE', updated_at=datetime('now') WHERE officer_id='P003'
  `).run(zone.lat, zone.lng);
  db.prepare("DELETE FROM alerts WHERE officer_id='P003' AND acknowledged=0").run();

  emitSafe("location-update", { officerId: "P003", latitude: zone.lat, longitude: zone.lng, status: "IN_ZONE" });
  emitSafe("stats-update", getStats());

  res.json({ message: "Demo state reset" });
});

router.post("/sms", (req, res) => {
  const { to, message } = req.body;
  console.log(`[SIMULATED SMS] To: ${to} | Message: ${message}`);
  res.json({ message: `SMS simulated to ${to}` });
});

function getStats() {
  const totalAssigned = (db.prepare("SELECT COUNT(*) as c FROM officers").get() as any).c;
  const inZone = (db.prepare("SELECT COUNT(*) as c FROM officers WHERE status = 'IN_ZONE'").get() as any).c;
  const violations = (db.prepare("SELECT COUNT(*) as c FROM alerts WHERE acknowledged = 0 AND date(created_at) = date('now')").get() as any).c;
  const notPresent = (db.prepare("SELECT COUNT(*) as c FROM officers WHERE status IN ('OFFLINE', 'LATE')").get() as any).c;
  return { totalAssigned, inZone, violations, notPresent };
}

export default router;
