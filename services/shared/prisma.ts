import { PrismaClient } from "@prisma/client";

// Shared Prisma client for PM2 worker processes
// Workers run in separate Node.js processes, so they need their own client instance

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

export default prisma;
