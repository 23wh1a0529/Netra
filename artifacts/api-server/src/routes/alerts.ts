import { Router } from "express";
import db from "../lib/db.js";
import { emitSafe } from "../lib/socket.js";

const router = Router();

router.get("/alerts", (req, res) => {
  const { level, limit } = req.query;
  let query = "SELECT * FROM alerts";
  const params: any[] = [];
  if (level) {
    query += " WHERE level = ?";
    params.push(level);
  }
  query += " ORDER BY created_at DESC";
  if (limit) {
    query += " LIMIT ?";
    params.push(Number(limit));
  } else {
    query += " LIMIT 50";
  }
  const alerts = db.prepare(query).all(...params) as any[];
  res.json(alerts.map(mapAlert));
});

router.post("/alerts", (req, res) => {
  const { type, level, officerId, zone, message, severity } = req.body;
  if (!type || !level || !officerId || !zone || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const officer = db.prepare("SELECT name FROM officers WHERE id = ?").get(officerId) as any;
  const officerName = officer?.name || officerId;

  const result = db.prepare(`
    INSERT INTO alerts (type, level, officer_id, officer_name, zone, message, severity)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(type, level, officerId, officerName, zone, message, severity || null);

  const alert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(result.lastInsertRowid) as any;
  const mapped = mapAlert(alert);

  emitSafe("alert-triggered", mapped);

  if (type === "PANIC") {
    emitSafe("panic-triggered", mapped);
  }

  res.status(201).json(mapped);
});

router.post("/alerts/:id/acknowledge", (req, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE alerts SET acknowledged = 1 WHERE id = ?").run(id);
  const alert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(id) as any;
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  res.json(mapAlert(alert));
});

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
