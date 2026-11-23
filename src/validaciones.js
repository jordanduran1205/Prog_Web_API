// Valida nombre, precio y stock. Devuelve true si son válidos.
export function datosValidos({ nombre, precio, stock }) {
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
