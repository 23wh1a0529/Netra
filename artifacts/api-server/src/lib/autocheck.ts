import db, { ZONES, getDistanceMeters } from "./db.js";
import { emitSafe } from "./socket.js";

const BREACH_OUTSIDE_THRESHOLD_MS = 15 * 60 * 1000;
const officerBreachStart = new Map<string, number>();

export function startAutoChecks() {
  setInterval(() => {
    runAutoChecks();
  }, 10000);
}

function runAutoChecks() {
  const officers = db.prepare("SELECT * FROM officers WHERE status != 'OFFLINE'").all() as any[];

  for (const officer of officers) {
    if (!officer.latitude || !officer.longitude) continue;

    const zone = ZONES[officer.zone];
    if (!zone) continue;

    const dist = getDistanceMeters(officer.latitude, officer.longitude, zone.lat, zone.lng);
    const inZone = dist <= zone.radius;

    if (inZone) {
      officerBreachStart.delete(officer.id);

      const existing = db.prepare(
        "SELECT * FROM attendance WHERE officer_id = ? AND date = date('now')"
      ).get(officer.id) as any;

      if (!existing) {
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO attendance (officer_id, officer_name, check_in, date, method)
          VALUES (?, ?, ?, date('now'), 'auto')
        `).run(officer.id, officer.name, now);
        db.prepare("UPDATE officers SET check_in_time = ? WHERE id = ?").run(now, officer.id);
        emitSafe("auto-check-in", { officerId: officer.id, officerName: officer.name });
      }
    } else {
      if (!officerBreachStart.has(officer.id)) {
        officerBreachStart.set(officer.id, Date.now());
      }

      const breachDuration = Date.now() - officerBreachStart.get(officer.id)!;
      if (breachDuration > BREACH_OUTSIDE_THRESHOLD_MS) {
        const existing = db.prepare(
          "SELECT * FROM attendance WHERE officer_id = ? AND date = date('now') AND check_out IS NULL"
        ).get(officer.id) as any;

        if (existing) {
          const now = new Date().toISOString();
          db.prepare("UPDATE attendance SET check_out = ? WHERE id = ?").run(now, existing.id);
          emitSafe("auto-check-out", { officerId: officer.id, officerName: officer.name });
          officerBreachStart.delete(officer.id);
        }
      }
    }

    db.prepare("UPDATE officers SET time_in_zone_today = time_in_zone_today + ? WHERE id = ?")
      .run(inZone ? 10 / 3600 : 0, officer.id);

    const totalOnDuty = officer.time_in_zone_today + (inZone ? 10 / 3600 : 0);
    const compliance = totalOnDuty > 0 ? Math.min(100, (totalOnDuty / 8) * 100) : officer.compliance;
    db.prepare("UPDATE officers SET compliance = ? WHERE id = ?").run(Math.round(compliance), officer.id);
  }

  const stats = {
    totalAssigned: (db.prepare("SELECT COUNT(*) as c FROM officers").get() as any).c,
    inZone: (db.prepare("SELECT COUNT(*) as c FROM officers WHERE status = 'IN_ZONE'").get() as any).c,
    violations: (db.prepare("SELECT COUNT(*) as c FROM alerts WHERE acknowledged = 0 AND date(created_at) = date('now')").get() as any).c,
    notPresent: (db.prepare("SELECT COUNT(*) as c FROM officers WHERE status IN ('OFFLINE', 'LATE')").get() as any).c,
  };
  emitSafe("stats-update", stats);

  const liveMovements = db.prepare("SELECT * FROM officers WHERE status = 'IN_ZONE' AND latitude IS NOT NULL").all() as any[];
  for (const o of liveMovements) {
    const zone = ZONES[o.zone];
    if (!zone) continue;
    const microLat = o.latitude + (Math.random() - 0.5) * 0.00002;
    const microLng = o.longitude + (Math.random() - 0.5) * 0.00002;
    db.prepare("UPDATE officers SET latitude=?, longitude=? WHERE id=?").run(microLat, microLng, o.id);
    db.prepare("UPDATE locations SET latitude=?, longitude=?, updated_at=datetime('now') WHERE officer_id=?").run(microLat, microLng, o.id);
    emitSafe("location-update", { officerId: o.id, latitude: microLat, longitude: microLng, status: o.status });
  }

  const breachOfficers = db.prepare("SELECT * FROM officers WHERE status = 'BREACH' AND latitude IS NOT NULL").all() as any[];
  for (const o of breachOfficers) {
    const zone = ZONES[o.zone];
    if (!zone) continue;
    const driftLat = o.latitude + (Math.random() - 0.3) * 0.00005;
    const driftLng = o.longitude + (Math.random() - 0.3) * 0.00005;
    db.prepare("UPDATE officers SET latitude=?, longitude=? WHERE id=?").run(driftLat, driftLng, o.id);
    db.prepare("UPDATE locations SET latitude=?, longitude=?, updated_at=datetime('now') WHERE officer_id=?").run(driftLat, driftLng, o.id);
    emitSafe("location-update", { officerId: o.id, latitude: driftLat, longitude: driftLng, status: "BREACH" });
  }
}
