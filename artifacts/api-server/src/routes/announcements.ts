import { Router } from "express";
import db from "../lib/db.js";
import { emitSafe } from "../lib/socket.js";

const router = Router();

router.get("/announcements", (_req, res) => {
  const announcements = db.prepare("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 10").all() as any[];
  res.json(announcements.map(mapAnnouncement));
});

router.post("/announcements", (req, res) => {
  const { message, createdBy } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  const result = db.prepare(`
    INSERT INTO announcements (message, created_by) VALUES (?, ?)
  `).run(message, createdBy || "Admin");

  const ann = db.prepare("SELECT * FROM announcements WHERE id = ?").get(result.lastInsertRowid) as any;
  const mapped = mapAnnouncement(ann);
  emitSafe("announcement", mapped);
  res.status(201).json(mapped);
});

function mapAnnouncement(a: any) {
  return {
    id: a.id,
    message: a.message,
    createdAt: a.created_at,
    createdBy: a.created_by,
  };
}

export default router;
