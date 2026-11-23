import { Router } from "express";
import { prisma } from "../prisma.js";
import { datosValidos } from "../validaciones.js";
import { verificarToken, soloAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Envuelve las rutas async para que los errores lleguen al manejador de errores
const asincrono = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Prisma devuelve el precio como Decimal; lo pasamos a número con Number()
const aProducto = (p) => ({ ...p, precio: Number(p.precio) });

// Busca un producto por id (null si no existe o el id no es un número)
async function buscarPorId(id) {
  if (!Number.isInteger(id)) return null;
  return prisma.productos.findUnique({ where: { id } });
}

// GET /productos -> público
router.get(
  "/",
  asincrono(async (req, res) => {
    const productos = await prisma.productos.findMany();
    res.status(200).json(productos.map(aProducto));
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

    res.status(200).json(aProducto(producto));
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

    const nuevo = await prisma.productos.create({
      data: { nombre: nombre.trim(), precio, stock },
    });

    res.status(201).json(aProducto(nuevo));
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

    const actualizado = await prisma.productos.update({
      where: { id },
      data: { nombre: nombre.trim(), precio, stock },
    });

    res.status(200).json(aProducto(actualizado));
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

    const combinado = { ...aProducto(producto), ...cambios };

    if (!datosValidos(combinado)) {
      return res.status(400).json({ error: "Alguno de los datos enviados no es válido" });
    }

    const actualizado = await prisma.productos.update({
      where: { id },
      data: {
        nombre: combinado.nombre.trim(),
        precio: combinado.precio,
        stock: combinado.stock,
      },
    });

    res.status(200).json(aProducto(actualizado));
  })
);

// DELETE /productos/:id -> token + admin
router.delete(
  "/:id",
  verificarToken,
  soloAdmin,
  asincrono(async (req, res) => {
    try {
      await prisma.productos.delete({ where: { id: Number(req.params.id) } });
      res.status(204).send();
    } catch (err) {
      // P2025 = el registro no existe
      if (err.code === "P2025") {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      throw err;
    }
  })
);

export default router;