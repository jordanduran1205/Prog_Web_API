// server.js
import express from "express";
import { db } from "./db.js";

const app = express();
app.set("json spaces", 2);
app.use(express.json());

// Valida nombre, precio y stock. Devuelve true si son válidos.
function datosValidos({ nombre, precio, stock }) {
  return (
    typeof nombre === "string" &&
    nombre.trim() !== "" &&
    typeof precio === "number" &&
    precio >= 0 &&
    typeof stock === "number" &&
    Number.isInteger(stock) &&
    stock >= 0
  );
}

// Envuelve las rutas async para que los errores lleguen al manejador de errores
const asincrono = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Busca un producto por id (devuelve undefined si no existe)
async function buscarPorId(id) {
  const [filas] = await db.query("SELECT * FROM productos WHERE id = ?", [id]);
  return filas[0];
}

// GET /productos -> lista todos
app.get(
  "/productos",
  asincrono(async (req, res) => {
    const [filas] = await db.query("SELECT * FROM productos");
    res.status(200).json(filas);
  })
);

// GET /productos/:id -> devuelve uno
app.get(
  "/productos/:id",
  asincrono(async (req, res) => {
    const producto = await buscarPorId(Number(req.params.id));

    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.status(200).json(producto);
  })
);

// POST /productos -> crea uno nuevo
app.post(
  "/productos",
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

// PUT /productos/:id -> reemplaza TODOS los campos
app.put(
  "/productos/:id",
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

// PATCH /productos/:id -> cambia solo algunos campos
app.patch(
  "/productos/:id",
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

// DELETE /productos/:id -> borra
app.delete(
  "/productos/:id",
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

// Manejador de errores (por ejemplo, si MySQL está apagado)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error del servidor", detalle: err.code });
});

app.listen(3000, () => console.log("Servidor listo"));