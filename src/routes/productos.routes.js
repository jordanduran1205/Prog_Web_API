import { Router } from "express";
import { db } from "../db.js";
import { datosValidos } from "../validaciones.js";
import { verificarToken, soloAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Envuelve las rutas async para que los errores lleguen al manejador de errores
const asincrono = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

async function buscarPorId(id) {
  const [filas] = await db.query("SELECT * FROM productos WHERE id = ?", [id]);
  return filas[0];
}

// GET /productos -> público
router.get(
  "/",
  asincrono(async (req, res) => {
    const [filas] = await db.query("SELECT * FROM productos");
    res.status(200).json(filas);
  })
);

// GET /productos/:id -> público
router.get(
  "/:id",
  asincrono(async (req, res) => {
    const producto = await buscarPorId(Number(req.params.id));

    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.status(200).json(producto);
  })
);

// POST /productos -> requiere token
router.post(
  "/",
  verificarToken,
  asincrono(async (req, res) => {
    const { nombre, precio, stock } = req.body;

    if (!datosValidos({ nombre, precio, stock })) {
      return res.status(400).json({
        error: "Datos inválidos: nombre (texto), precio (número >= 0) y stock (entero >= 0)",
      });
    }

    const [resultado] = await db.query(
      "INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)",
      [nombre.trim(), precio, stock]
    );

    res.status(201).json({ id: resultado.insertId, nombre: nombre.trim(), precio, stock });
  })
);

// PUT /productos/:id -> requiere token
router.put(
  "/:id",
  verificarToken,
  asincrono(async (req, res) => {
    const id = Number(req.params.id);

    if (!(await buscarPorId(id))) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const { nombre, precio, stock } = req.body;

    if (!datosValidos({ nombre, precio, stock })) {
      return res.status(400).json({
        error: "PUT requiere todos los campos válidos: nombre, precio y stock",
      });
    }

    await db.query(
      "UPDATE productos SET nombre = ?, precio = ?, stock = ? WHERE id = ?",
      [nombre.trim(), precio, stock, id]
    );

    res.status(200).json({ id, nombre: nombre.trim(), precio, stock });
  })
);

// PATCH /productos/:id -> requiere token
router.patch(
  "/:id",
  verificarToken,
  asincrono(async (req, res) => {
    const id = Number(req.params.id);
    const producto = await buscarPorId(id);

    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const cambios = {};
    if ("nombre" in req.body) cambios.nombre = req.body.nombre;
    if ("precio" in req.body) cambios.precio = req.body.precio;
    if ("stock" in req.body) cambios.stock = req.body.stock;

    if (Object.keys(cambios).length === 0) {
      return res.status(400).json({ error: "Envía al menos un campo: nombre, precio o stock" });
    }

    const actualizado = { ...producto, ...cambios };

    if (!datosValidos(actualizado)) {
      return res.status(400).json({ error: "Alguno de los datos enviados no es válido" });
    }

    actualizado.nombre = actualizado.nombre.trim();

    await db.query(
      "UPDATE productos SET nombre = ?, precio = ?, stock = ? WHERE id = ?",
      [actualizado.nombre, actualizado.precio, actualizado.stock, id]
    );

    res.status(200).json(actualizado);
  })
);

// DELETE /productos/:id -> token + admin
router.delete(
  "/:id",
  verificarToken,
  soloAdmin,
  asincrono(async (req, res) => {
    const [resultado] = await db.query("DELETE FROM productos WHERE id = ?", [
      Number(req.params.id),
    ]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.status(204).send();
  })
);

export default router;