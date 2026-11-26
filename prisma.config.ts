import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 reads the connection string here, not in schema.prisma.
// Migrations run as the migration user; the app connects as a less-privileged user (src/lib/db.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_MIGRATE_URL") },
});
