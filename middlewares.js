// middlewares.js
import jwt from "jsonwebtoken";

// Revisa el token antes de que se ejecute la ruta -> 401 si falta o está vencido
export function verificarToken(req, res, next) {
  const header = req.headers.authorization ?? "";
  const [tipo, token] = header.split(" ");

  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ error: "Falta el token" });
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o vencido" });
  }
}

// Solo admin -> 403 si tiene token pero no tiene permiso
export function soloAdmin(req, res, next) {
  if (req.usuario?.rol !== "admin") {
    return res.status(403).json({ error: "No tienes permiso para esta acción" });
  }
  next();
}