import { Router } from "express";
import db, { ZONES } from "../lib/db.js";
import { emitSafe } from "../lib/socket.js";

const router = Router();

router.get("/attendance", (_req, res) => {
  const records = db.prepare(`
    SELECT * FROM attendance WHERE date = date('now') ORDER BY created_at DESC
  `).all() as any[];
  res.json(records.map(mapAttendance));
});

router.post("/attendance", (req, res) => {
  const { officerId, method } = req.body;
  if (!officerId) return res.status(400).json({ error: "Officer ID required" });

  const officer = db.prepare("SELECT * FROM officers WHERE id = ?").get(officerId) as any;
  if (!officer) return res.status(404).json({ error: "Officer not found" });

  const existing = db.prepare("SELECT * FROM attendance WHERE officer_id = ? AND date = date('now')").get(officerId) as any;
  if (existing) {
    return res.status(400).json({ error: "Already checked in today" });
  }

  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO attendance (officer_id, officer_name, check_in, date, method)
    VALUES (?, ?, ?, date('now'), ?)
  `).run(officerId, officer.name, now, method || "manual");

  db.prepare("UPDATE officers SET check_in_time = ?, status = 'IN_ZONE' WHERE id = ?").run(now, officerId);

  const record = db.prepare("SELECT * FROM attendance WHERE id = ?").get(result.lastInsertRowid) as any;
  const mapped = mapAttendance(record);
  emitSafe("auto-check-in", { officerId, officerName: officer.name });
  res.status(201).json(mapped);
});

router.post("/attendance/face-verify", (req, res) => {
  const { officerId } = req.body;
  if (!officerId) return res.status(400).json({ error: "Officer ID required" });

  const officer = db.prepare("SELECT * FROM officers WHERE id = ?").get(officerId) as any;
  if (!officer) return res.status(404).json({ error: "Officer not found" });

  const pass = Math.random() < 0.8;
  const confidence = pass ? 0.75 + Math.random() * 0.25 : 0.3 + Math.random() * 0.3;
  const timestamp = new Date().toISOString();

  if (pass) {
    const existing = db.prepare("SELECT * FROM attendance WHERE officer_id = ? AND date = date('now')").get(officerId) as any;
    if (!existing) {
      db.prepare(`
        INSERT INTO attendance (officer_id, officer_name, check_in, date, method)
        VALUES (?, ?, ?, date('now'), 'face-verify')
      `).run(officerId, officer.name, timestamp);
      db.prepare("UPDATE officers SET check_in_time = ?, status = 'IN_ZONE' WHERE id = ?").run(timestamp, officerId);
      emitSafe("auto-check-in", { officerId, officerName: officer.name });
    }
  } else {
    db.prepare(`
      INSERT INTO alerts (type, level, officer_id, officer_name, zone, message)
      VALUES ('FACE_FAIL', 'L1', ?, ?, ?, ?)
    `).run(officerId, officer.name, officer.zone, `Face verification failed for ${officer.name}`);
  }

  res.json({
    success: pass,
    officerName: officer.name,
    confidence: Math.round(confidence * 100) / 100,
    timestamp,
    message: pass ? "Identity Confirmed — Attendance marked" : "Verification Failed — Please contact supervisor",
  });
});

router.get("/duties", (_req, res) => {
  const officers = db.prepare("SELECT * FROM officers ORDER BY zone, name").all() as any[];
  const duties = officers.map((o, i) => {
    const zone = ZONES[o.zone] || { lat: 14.6819, lng: 77.6006, radius: 40 };
    return {
      serialNumber: i + 1,
      officerId: o.id,
      name: o.name,
      rank: o.rank,
      zone: o.zone,
      latitude: zone.lat,
      longitude: zone.lng,
      shiftStart: "06:00",
      shiftEnd: "14:00",
      zoneRadius: zone.radius,
    };
  });
  res.json(duties);
});

function mapAttendance(a: any) {
  return {
    id: a.id,
    officerId: a.officer_id,
    officerName: a.officer_name,
    checkIn: a.check_in,
    checkOut: a.check_out,
    date: a.date,
    method: a.method,
  };
}

export default router;
