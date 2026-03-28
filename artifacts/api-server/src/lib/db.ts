import Database from "better-sqlite3";
import path from "path";
const DB_PATH = path.join(process.cwd(), "netra.db");

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

function seedAll() {
  const officerCount = (db.prepare("SELECT COUNT(*) as c FROM officers").get() as any).c;
  if (officerCount > 0) return;

  const now = Date.now();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  const officers = [
    { id: "P001", name: "Ravi Kumar",      rank: "CI",        mobile: "9876543210", zone: "Collectorate", lat: 14.6818, lng: 77.6005, status: "IN_ZONE",  compliance: 96, breachCount: 0, timeInZone: 4.5 },
    { id: "P002", name: "Suresh Babu",     rank: "SI",        mobile: "9876543211", zone: "Gandhi Gunj",  lat: 14.6852, lng: 77.5982, status: "IN_ZONE",  compliance: 88, breachCount: 1, timeInZone: 3.2 },
    { id: "P003", name: "Krishna Reddy",   rank: "Constable", mobile: "9876543212", zone: "RTC Bus Stand",lat: 14.6800, lng: 77.6030, status: "BREACH",   compliance: 62, breachCount: 4, timeInZone: 1.1 },
    { id: "P004", name: "Anand Sharma",    rank: "SI",        mobile: "9876543213", zone: "Subash Road",  lat: 14.6830, lng: 77.5991, status: "IN_ZONE",  compliance: 91, breachCount: 0, timeInZone: 5.0 },
    { id: "P005", name: "Venkata Rao",     rank: "Constable", mobile: "9876543214", zone: "Helipad",      lat: 14.6899, lng: 77.6049, status: "IN_ZONE",  compliance: 85, breachCount: 2, timeInZone: 2.8 },
    { id: "P006", name: "Lakshmi Devi",    rank: "DSP",       mobile: "9876543215", zone: "Collectorate", lat: 14.6820, lng: 77.6007, status: "IN_ZONE",  compliance: 99, breachCount: 0, timeInZone: 6.0 },
    { id: "P007", name: "Ramana Murthy",   rank: "Constable", mobile: "9876543216", zone: "Gandhi Gunj",  lat: 14.6854, lng: 77.5984, status: "OFFLINE",  compliance: 45, breachCount: 6, timeInZone: 0.0 },
    { id: "P008", name: "Sunita Reddy",    rank: "SI",        mobile: "9876543217", zone: "RTC Bus Stand",lat: 14.6792, lng: 77.5970, status: "IN_ZONE",  compliance: 83, breachCount: 1, timeInZone: 3.7 },
    { id: "P009", name: "Balaji Naidu",    rank: "Constable", mobile: "9876543218", zone: "Helipad",      lat: 14.6901, lng: 77.6052, status: "LATE",     compliance: 71, breachCount: 3, timeInZone: 0.5 },
    { id: "P010", name: "Meera Kumari",    rank: "SI",        mobile: "9876543219", zone: "Subash Road",  lat: 14.6832, lng: 77.5993, status: "IN_ZONE",  compliance: 93, breachCount: 0, timeInZone: 4.2 },
    { id: "P011", name: "Chakravarthy",    rank: "CI",        mobile: "9876543220", zone: "Gandhi Gunj",  lat: 14.6851, lng: 77.5981, status: "IN_ZONE",  compliance: 90, breachCount: 1, timeInZone: 3.9 },
    { id: "P012", name: "Padma Priya",     rank: "Constable", mobile: "9876543221", zone: "RTC Bus Stand",lat: 14.6793, lng: 77.5971, status: "IN_ZONE",  compliance: 78, breachCount: 2, timeInZone: 2.4 },
    { id: "P013", name: "Narayana Swamy",  rank: "DSP",       mobile: "9876543222", zone: "Collectorate", lat: 14.6817, lng: 77.6004, status: "IN_ZONE",  compliance: 97, breachCount: 0, timeInZone: 5.5 },
    { id: "P014", name: "Sai Kiran",       rank: "Constable", mobile: "9876543223", zone: "Subash Road",  lat: 14.6845, lng: 77.6010, status: "BREACH",   compliance: 55, breachCount: 5, timeInZone: 0.8 },
    { id: "P015", name: "Durga Bhavani",   rank: "SI",        mobile: "9876543224", zone: "Helipad",      lat: 14.6902, lng: 77.6051, status: "IN_ZONE",  compliance: 87, breachCount: 1, timeInZone: 3.1 },
  ];

  const insertOfficer = db.prepare(`
    INSERT OR IGNORE INTO officers 
      (id, name, rank, mobile, zone, status, compliance, breach_count, time_in_zone_today, latitude, longitude, check_in_time, last_seen)
    VALUES 
      (@id, @name, @rank, @mobile, @zone, @status, @compliance, @breachCount, @timeInZone, @lat, @lng, @checkIn, @lastSeen)
  `);

  const insertLoc = db.prepare(`
    INSERT OR IGNORE INTO locations (officer_id, latitude, longitude, status)
    VALUES (?, ?, ?, ?)
  `);

  const insertAttendance = db.prepare(`
    INSERT OR IGNORE INTO attendance (officer_id, officer_name, check_in, date, method)
    VALUES (?, ?, ?, date('now'), 'face_verify')
  `);

  db.transaction(() => {
    officers.forEach((o, i) => {
      const hasCheckedIn = o.status !== "OFFLINE";
      insertOfficer.run({
        ...o,
        checkIn: hasCheckedIn ? ago(3600000 + i * 420000) : null,
        lastSeen: o.status !== "OFFLINE" ? ago(Math.floor(Math.random() * 180000)) : ago(7200000 + i * 900000),
      });
      insertLoc.run(o.id, o.lat, o.lng, o.status);
      if (hasCheckedIn) {
        insertAttendance.run(o.id, o.name, ago(3600000 + i * 420000));
      }
    });
  })();

  const insertAlert = db.prepare(`
    INSERT INTO alerts (type, level, officer_id, officer_name, zone, message, acknowledged, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const alertSeed = [
    ["BREACH",        "L3", "P003", "Krishna Reddy",  "RTC Bus Stand", "Officer left duty zone boundary — GPS confirms 180m displacement",          0, ago(420000)],
    ["BREACH",        "L2", "P014", "Sai Kiran",       "Subash Road",   "Repeated zone boundary violation — 3rd incident today",                       0, ago(900000)],
    ["LATE",          "L1", "P009", "Balaji Naidu",    "Helipad",       "Officer reporting late to zone — 47 min past duty start time",               1, ago(2100000)],
    ["OFFLINE",       "L1", "P007", "Ramana Murthy",   "Gandhi Gunj",   "Officer device offline — no GPS ping for 92 minutes",                         1, ago(3600000)],
    ["PANIC",         "L3", "P005", "Venkata Rao",     "Helipad",       "SOS triggered by officer — crowd situation at Helipad gate",                  1, ago(5400000)],
    ["BREACH",        "L2", "P003", "Krishna Reddy",   "RTC Bus Stand", "Second breach detected — officer returned to zone after 12 min",              1, ago(9000000)],
    ["COMPLIANCE",    "L1", "P012", "Padma Priya",     "RTC Bus Stand", "Compliance score dropped below 80% threshold — admin review recommended",     1, ago(10800000)],
    ["LATE",          "L1", "P014", "Sai Kiran",       "Subash Road",   "Officer late for second shift check-in",                                      1, ago(14400000)],
  ];

  const insertAlerts = db.transaction(() => {
    alertSeed.forEach(a => insertAlert.run(...a));
  });
  insertAlerts();

  const insertAnnouncement = db.prepare(`
    INSERT INTO announcements (message, created_by, created_at) VALUES (?, ?, ?)
  `);

  const annSeed = [
    ["All officers must be at duty posts by 06:00 hrs. Chief Minister convoy route passes via Collectorate at 09:30 hrs. Zero tolerance for breach.", "SP Anantapur", ago(600000)],
    ["VVIP movement alert: Additional 4 constables deployed at Gandhi Gunj junction. Officers to maintain 10m crowd perimeter at all times.", "DSP Operations", ago(3600000)],
    ["Biometric attendance compulsory from tomorrow. All face-verify check-ins must complete before 05:45 hrs shift start.", "Admin NETRA", ago(7200000)],
    ["Traffic diversion active on Subash Road from 14:00–18:00 hrs due to local procession. Zone officers to coordinate with Traffic CI.", "Control Room", ago(10800000)],
    ["Bandobusth review meeting at SP office at 20:00 hrs today. All CIs and SIs must attend in person. Officers on duty to brief their substitutes.", "SP Office", ago(18000000)],
    ["REMINDER: SOS button test drill at 11:00 hrs tomorrow. All officers must participate. Drill alerts will be marked as TEST in logs.", "NETRA Admin", ago(25200000)],
  ];

  const insertAnns = db.transaction(() => {
    annSeed.forEach(a => insertAnnouncement.run(...a));
  });
  insertAnns();
}

seedAll();

export default db;
