import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../../../netra.db");

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS officers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rank TEXT NOT NULL CHECK(rank IN ('Constable', 'SI', 'CI', 'DSP')),
    mobile TEXT NOT NULL,
    zone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OFFLINE' CHECK(status IN ('IN_ZONE', 'BREACH', 'LATE', 'OFFLINE')),
    compliance REAL NOT NULL DEFAULT 100.0,
    breach_count INTEGER NOT NULL DEFAULT 0,
    time_in_zone_today REAL NOT NULL DEFAULT 0,
    check_in_time TEXT,
    last_seen TEXT,
    latitude REAL,
    longitude REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    level TEXT NOT NULL CHECK(level IN ('L1', 'L2', 'L3')),
    officer_id TEXT NOT NULL,
    officer_name TEXT NOT NULL,
    zone TEXT NOT NULL,
    message TEXT NOT NULL,
    acknowledged INTEGER NOT NULL DEFAULT 0,
    severity TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    officer_id TEXT NOT NULL,
    officer_name TEXT NOT NULL,
    check_in TEXT,
    check_out TEXT,
    date TEXT NOT NULL DEFAULT (date('now')),
    method TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    created_by TEXT NOT NULL DEFAULT 'Admin',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS locations (
    officer_id TEXT PRIMARY KEY,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'OFFLINE',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export const ZONES: Record<string, { name: string; lat: number; lng: number; radius: number }> = {
  "Collectorate": { name: "Collectorate", lat: 14.6819, lng: 77.6006, radius: 40 },
  "Gandhi Gunj": { name: "Gandhi Gunj", lat: 14.6853, lng: 77.5983, radius: 35 },
  "RTC Bus Stand": { name: "RTC Bus Stand", lat: 14.6791, lng: 77.5969, radius: 30 },
  "Subash Road": { name: "Subash Road", lat: 14.6831, lng: 77.5992, radius: 25 },
  "Helipad": { name: "Helipad", lat: 14.6900, lng: 77.6050, radius: 50 },
};

export function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLam = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function seedOfficers() {
  const count = (db.prepare("SELECT COUNT(*) as c FROM officers").get() as any).c;
  if (count > 0) return;

  const officers = [
    { id: "P001", name: "Ravi Kumar", rank: "CI", mobile: "9876543210", zone: "Collectorate", lat: 14.6818, lng: 77.6005 },
    { id: "P002", name: "Suresh Babu", rank: "SI", mobile: "9876543211", zone: "Gandhi Gunj", lat: 14.6852, lng: 77.5982 },
    { id: "P003", name: "Krishna Reddy", rank: "Constable", mobile: "9876543212", zone: "RTC Bus Stand", lat: 14.6790, lng: 77.5968 },
    { id: "P004", name: "Anand Sharma", rank: "SI", mobile: "9876543213", zone: "Subash Road", lat: 14.6830, lng: 77.5991 },
    { id: "P005", name: "Venkata Rao", rank: "Constable", mobile: "9876543214", zone: "Helipad", lat: 14.6899, lng: 77.6049 },
    { id: "P006", name: "Lakshmi Devi", rank: "DSP", mobile: "9876543215", zone: "Collectorate", lat: 14.6820, lng: 77.6007 },
    { id: "P007", name: "Ramana Murthy", rank: "Constable", mobile: "9876543216", zone: "Gandhi Gunj", lat: 14.6854, lng: 77.5984 },
    { id: "P008", name: "Sunita Reddy", rank: "SI", mobile: "9876543217", zone: "RTC Bus Stand", lat: 14.6792, lng: 77.5970 },
  ];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO officers (id, name, rank, mobile, zone, status, compliance, latitude, longitude, check_in_time, last_seen)
    VALUES (@id, @name, @rank, @mobile, @zone, @status, @compliance, @lat, @lng, @checkIn, @lastSeen)
  `);

  const statuses = ["IN_ZONE", "IN_ZONE", "IN_ZONE", "LATE", "IN_ZONE", "IN_ZONE", "OFFLINE", "IN_ZONE"];
  const compliances = [95, 88, 76, 62, 91, 98, 45, 83];

  const insertMany = db.transaction(() => {
    officers.forEach((o, i) => {
      insert.run({
        ...o,
        status: statuses[i],
        compliance: compliances[i],
        lat: o.lat,
        lng: o.lng,
        checkIn: i !== 6 ? new Date(Date.now() - Math.random() * 7200000).toISOString() : null,
        lastSeen: new Date(Date.now() - Math.random() * 300000).toISOString(),
      });
    });
  });

  insertMany();

  const insertLoc = db.prepare(`
    INSERT OR IGNORE INTO locations (officer_id, latitude, longitude, status)
    VALUES (?, ?, ?, ?)
  `);

  const insertLocs = db.transaction(() => {
    officers.forEach((o, i) => {
      insertLoc.run(o.id, o.lat, o.lng, statuses[i]);
    });
  });
  insertLocs();

  db.prepare(`
    INSERT OR IGNORE INTO attendance (officer_id, officer_name, check_in, date, method)
    SELECT id, name, check_in_time, date('now'), 'auto'
    FROM officers WHERE check_in_time IS NOT NULL
  `).run();
}

seedOfficers();

export default db;
