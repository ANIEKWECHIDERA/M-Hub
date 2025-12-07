import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { logger } from "../utils/logger";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({
  adapter,
  log: ["query", "info", "warn", "error"],
});

export { prisma };

export const testDbConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("[INFO] Prisma database connection successful");
    return true;
  } catch (err) {
    logger.error("[ERROR] Prisma database connection failed:", err);
    return false;
  }
};
