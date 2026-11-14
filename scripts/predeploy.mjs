process.env.NODE_ENV = "production";

import "dotenv/config";
import { sql } from "drizzle-orm";
import * as dbModule from "../dist/db/index.js";
import * as profileModule from "../dist/db/schema/profiles.js";
import * as serverModule from "../dist/server.js";

const db = dbModule.db || dbModule.default?.db;
const profile = profileModule.profile || profileModule.default?.profile;
const app = serverModule.app || serverModule.default?.app;

const REQUIRED_ENVS = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY"];

async function runPreflightChecks() {
  console.log(`🚀 Starting pre-deployment checks (NODE_ENV=${process.env.NODE_ENV})...\n`);

  // 1. Check Environment Variables
  const missingEnvs = REQUIRED_ENVS.filter((key) => !process.env[key]);
  if (missingEnvs.length > 0) {
    console.error(`❌ Missing required env variables: ${missingEnvs.join(", ")}`);
    process.exit(1);
  }
  console.log("✅ Environment variables loaded.");

  // 2. Test Drizzle + Supabase Connection & Real Schema Query
  try {
    await db.execute(sql`SELECT 1`);
    await db.select({ name: profile.displayName }).from(profile).limit(1);
    console.log("✅ Drizzle connected to Supabase and verified profile schema.");
  } catch (error) {
    console.error("❌ Database/schema check failed:", error.message);
    process.exit(1);
  }

  // 3. Test Express Server Startup & Health Route
  const PORT = Number(process.env.PORT) || 4000;
  const server = app.listen(PORT, "0.0.0.0", async () => {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log(`✅ Express server responded ${res.status} OK on /health.`);

      server.close(() => {
        console.log("\n🎉 All checks passed! Safe to push to main.");
        process.exit(0);
      });
    } catch (error) {
      console.error("❌ Express health check failed:", error.message);
      server.close(() => process.exit(1));
    }
  });
}

runPreflightChecks();
