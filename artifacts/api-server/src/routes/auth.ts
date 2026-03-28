import { Router } from "express";
import db from "../lib/db.js";

const router = Router();

const otpStore = new Map<string, string>();

router.post("/auth/send-otp", (req, res) => {
  const { mobile } = req.body;
  if (!mobile) {
    return res.status(400).json({ error: "Mobile number required" });
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(mobile, otp);
  res.json({ message: `OTP sent to +91${mobile}`, otp });
});

router.post("/auth/verify-otp", (req, res) => {
  const { mobile, otp, officerId } = req.body;
  if (!mobile || !otp) {
    return res.status(400).json({ error: "Mobile and OTP required" });
  }
  const officerByMobile = db.prepare("SELECT * FROM officers WHERE mobile = ?").get(mobile) as any;
  const officer = officerByMobile || (officerId ? db.prepare("SELECT * FROM officers WHERE id = ?").get(officerId) as any : null);
  if (!officer) {
    return res.status(404).json({ error: "Officer not found with this mobile number" });
  }
  const token = `officer-${officer.id}-${Date.now()}`;
  res.json({ token, role: "officer", officerId: officer.id, name: officer.name });
});

router.post("/auth/admin-login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "netra@2025") {
    const token = `admin-${Date.now()}`;
    res.json({ token, role: "admin", name: "Admin User" });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

export default router;
