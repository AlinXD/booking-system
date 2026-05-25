// =====================================================
//  Minitopia — Backend Express
//  npm install express @prisma/client argon2 jsonwebtoken cors dotenv
//  npx prisma migrate dev --name init
// =====================================================

console.log('[LOG] 0: Starting server initialization');

import "dotenv/config";
console.log('[LOG] 1: dotenv loaded');


import express from "express";
console.log('[LOG] 2: express imported');

import cors from "cors";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { PrismaClient, AppointmentType, AgeGroup, Status } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

console.log('[LOG] 3: all imports done');

const app = express();
console.log('[LOG] 4: express app created');

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL),
});
console.log('[LOG] 5: PrismaClient created');

const PORT = process.env.PORT || 3000;
// make sure to change .env
const JWT_SECRET = process.env.JWT_SECRET || "ceva_random";

app.use(cors());
app.use(express.json());
app.use(express.static('.'));
// OPTIUNI DE SECURITATE
app.disable('x-powered-by'); // Scoate din request


// ─── Middleware JWT ────────────────────────────────
function authAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Neautorizat" });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token invalid" });
  }
}

// ─── PUBLIC: Rezervări ─────────────────────────────
// POST /api/rezervari
app.post("/api/rezervari", async (req, res) => {
  const { name, email, phone, date, kids, age, pack, notes } = req.body;

  if (!name || !email || !phone || !date || !kids || !age || !pack) {
    return res.status(400).json({ error: "Câmpuri obligatorii lipsă" });
  }

  const parsed = new Date(date);
  if (isNaN(parsed)) return res.status(400).json({ error: "Dată invalidă" });

  const now = new Date();
  if (parsed < now) {
    return res.status(400).json({ error: "Data rezervării trebuie să fie în viitor" });
  }

  try {
    const appt = await prisma.appointment.create({
      data: { name, email, phone, date: parsed, kids: Number(kids), age, type: pack, notes },
    });
    res.status(201).json(appt);
  } catch (err) {
    // unique constraint pe date — slot ocupat
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Slotul este deja rezervat" });
    }
    console.error(err);
    res.status(500).json({ error: "Eroare server" });
  }
});

// ─── ADMIN: Login ──────────────────────────────────
// POST /api/admin/login
app.post("/api/admin/login", async (req, res) => {
  const { name, password } = req.body;
  const admin = await prisma.adminAccount.findUnique({ where: { name } });
  console.log(admin)
  if (!admin || !(await argon2.verify(admin.password, password))) {
    return res.status(401).json({ error: "Nume sau parola incorecta" });
  }

  const token = jwt.sign({ id: admin.id, name: admin.name }, JWT_SECRET, {
    expiresIn: "8h",
  });
  res.json({ token });
});

// ─── ADMIN: Rezervari ──────────────────────────────
// GET /api/admin/rezervari?status=Pending
app.get("/api/admin/rezervari", authAdmin, async (req, res) => {
  const { status } = req.query;
  const where = status ? { status } : {};
  const list = await prisma.appointment.findMany({
    where,
    orderBy: { date: "asc" },
  });
  res.json(list);
});

// PATCH /api/admin/rezervari/:id  { status: "Accepted" | "Rejected" }
app.patch("/api/admin/rezervari/:id", authAdmin, async (req, res) => {
  const { status } = req.body;
  if (!["Accepted", "Rejected", "Pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }
  try {
    const updated = await prisma.appointment.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating reservation status:", error);
    res.status(404).json({ error: "Rezervarea nu a fost găsită" });
  }
});

// DELETE /api/admin/rezervari/:id
app.delete("/api/admin/rezervari/:id", authAdmin, async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Rezervarea a fost ștearsă cu succes" });
  } catch (error) {
    console.error("Error deleting reservation:", error);
    res.status(404).json({ error: "Rezervarea nu a fost găsită" });
  }
});

// ─── ADMIN: Creare cont (rulat o singură dată) ──────
// POST /api/admin/register  { name, password }
app.post("/api/admin/register", async (req, res) => {
  const { name, password, secret } = req.body;
  // Protecție minimă: trimite un secret din .env pentru a activa ruta
  if (secret !== REGISTER_SECRET) {
    return res.status(403).json({ error: "Forbidden: Secret incorect" });
  }
  const hashed = await argon2.hash(password, { type: argon2.argon2id });
  try {
    const admin = await prisma.adminAccount.create({ data: { name, password: hashed } });
    res.status(201).json({ id: admin.id, name: admin.name });
  } catch (err) {
    console.error("Error creating admin account:", err);
    res.status(409).json({ error: "Contul există deja sau eroare la creare" });
  }
});

// ─── PUBLIC: Recenzii ──────────────────────────────
// GET /api/recenzii
app.get("/api/recenzii", async (_req, res) => {
  const reviews = await prisma.review.findMany({
    orderBy: { created: "desc" },
  });
  res.json(reviews);
});

// POST /api/recenzii
app.post("/api/recenzii", async (req, res) => {
  const { name, rating, text } = req.body;

  if (!name || !rating) {
    return res.status(400).json({ error: "Nume și rating obligatorii" });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating între 1 și 5" });
  }

  try {
    const review = await prisma.review.create({
      data: { name, rating: Number(rating), text },
    });
    res.status(201).json(review);
  } catch (err) {
    console.error("Eroare creare recenzie:", err);
    res.status(500).json({ error: "Nu s-a putut salva recenzia" });
  }
});

// ─── ADMIN: Login ──────────────────────────────────
// POST /api/admin/login
app.post("/api/admin/login", async (req, res) => {
  const { name, password } = req.body;
  const admin = await prisma.adminAccount.findUnique({ where: { name } });

  if (!admin || !(await argon2.verify(admin.password, password))) {
    return res.status(401).json({ error: "Nume sau parola incorecta" });
  }

  const token = jwt.sign({ id: admin.id, name: admin.name }, JWT_SECRET, {
    expiresIn: "8h",
  });
  res.json({ token });
});

// ─── ADMIN: Rezervari ──────────────────────────────
// GET /api/admin/rezervari?status=Pending
app.get("/api/admin/rezervari", authAdmin, async (req, res) => {
  const { status } = req.query;
  const where = status ? { status } : {};
  const list = await prisma.appointment.findMany({
    where,
    orderBy: { date: "asc" },
  });
  res.json(list);
});

// PATCH /api/admin/rezervari/:id  { status: "Accepted" | "Rejected" }
app.patch("/api/admin/rezervari/:id", authAdmin, async (req, res) => {
  const { status } = req.body;
  if (!["Accepted", "Rejected", "Pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid" });
  }
  try {
    const updated = await prisma.appointment.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });
    res.json(updated);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

// DELETE /api/admin/rezervari/:id
app.delete("/api/admin/rezervari/:id", authAdmin, async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

// ─── ADMIN: Creare cont (rulat o singură dată) ──────
// POST /api/admin/register  { name, password }
app.post("/api/admin/register", async (req, res) => {
  const { name, password, secret } = req.body;
  // Protecție minimă: trimite un secret din .env pentru a activa ruta
  if (secret !== process.env.REGISTER_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const hashed = await argon2.hash(password, { type: argon2.argon2id });
  try {
    const admin = await prisma.adminAccount.create({ data: { name, password: hashed } });
    res.status(201).json({ id: admin.id, name: admin.name });
  } catch {
    res.status(409).json({ error: "Contul există deja" });
  }
});

// ─── Start ─────────────────────────────────────────
console.log('[LOG] 6: Setting up server listener');
const server = app.listen(PORT, () => {
  console.log(`[LOG] 7: Minitopia server pornit pe portul ${PORT}`);
});

console.log('[LOG] 8: Server listener created');

// Keep server alive even with no connections
setInterval(() => {}, 1000);

// Catch unhandled errors
process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]:', err);
  if (err instanceof Error) {
    console.error('Stack:', err.stack);
  }
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]:', err);
  if (err instanceof Error) {
    console.error('Stack:', err.stack);
  }
  process.exit(1);
});

console.log('[LOG] 9: Error handlers set up');

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});
