import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb({
  host: "localhost",
  user: "root",
  password: process.env.DB_PASSWORD,
  database: "tienda",
  connectionLimit: 5,
});

export const prisma = new PrismaClient({ adapter });