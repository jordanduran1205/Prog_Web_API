import express from "express";
import authRouter from "./routes/auth.routes.js";
import productosRouter from "./routes/productos.routes.js";

const app = express();
app.set("json spaces", 2);
app.use(express.json());

app.use(authRouter);
app.use("/productos", productosRouter);

// Manejador de errores
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON mal formado" });
  }
  console.error(err);
  res.status(500).json({ error: "Error del servidor", detalle: err.code });
});

app.listen(3000, () => console.log("Servidor listo"));