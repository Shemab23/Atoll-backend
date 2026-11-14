/// <reference types="node" />
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing.");
}

export default defineConfig({
  schema: "./src/db/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ["public"],
  verbose: true, /// false if i don't need stress
  strict: true,
});
