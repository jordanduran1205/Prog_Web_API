import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db.js";

const router = Router();

// POST /registro -> guarda con bcrypt.hash
router.post("/registro", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      email.trim() === "" ||
      typeof password !== "string" ||
      password.length < 4
    ) {
      return res.status(400).json({
        error: "Envía email (texto) y password (mínimo 4 caracteres)",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const [resultado] = await db.query(
      "INSERT INTO usuarios (email, password) VALUES (?, ?)",
      [email.trim(), hash]
    );

    res.status(201).json({ id: resultado.insertId, email: email.trim(), rol: "usuario" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ese email ya está registrado" });
    }
    next(err);
  }
});

// POST /login -> compara y devuelve { token }
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Envía email y password" });
    }

    const [filas] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    const usuario = filas[0];

    if (!usuario) {
      return res.status(401).json({ error: "Email o clave incorrectos" });
    }

    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) return res.status(401).json({ error: "Email o clave incorrectos" });

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ token });
  } catch (err) {
    next(err);
  }
});

export default router;