import "dotenv/config";
import { db, client } from "./index";
import * as AuthUsers from "./schema/Auth_user";
import * as ProfileSchema from "./schema/profiles";

export const SEED_CONSTANTS = {
  DEFAULT_PASSWORD: "Password123!",
  TEST_USERS: [
    { email: "superadmin@atoll.dev" },
    { email: "admin@atoll.dev" },
    { email: "user@atoll.dev" },
  ],
} as const;

/**
 * Wipes public tables in reverse dependency order, then hard-deletes auth.users via Admin API.
 */
async function clearDatabase() {
  console.log("Clearing database tables...");

  // 1. Delete public child tables first (append future tables above profile)
  // await db.delete(PostsSchema.posts);
  const deletedProfiles = await ProfileSchema.clearAllProfiles(db);

  // 2. Hard-delete all users from Supabase Auth via Admin API
  const deletedAuthCount = await AuthUsers.clearAllAuthUsers();

  console.log(
    `Cleared ${deletedProfiles.length} profiles and ${deletedAuthCount} auth users.`,
  );
}

/**
 * Creates test users in Supabase Auth and returns their generated UUIDs.
 */
async function seedAuthUsers(): Promise<string[]> {
  console.log("Creating Supabase Auth test users...");
  const createdIds: string[] = [];

  for (const user of SEED_CONSTANTS.TEST_USERS) {
    const createdUser = await AuthUsers.createAuthUser({
      email: user.email,
      password: SEED_CONSTANTS.DEFAULT_PASSWORD,
      emailConfirm: true,
    });

    createdIds.push(createdUser.id);
  }

  return createdIds;
}

/**
 * Main seed orchestrator
 */
async function main() {
  try {
    console.log("Starting database seed...");

    // 1. Wipe public tables and auth.users
    await clearDatabase();

    // 2. Create auth users first and capture their generated UUIDs
    const authUserIds = await seedAuthUsers();

    // 3. Seed profiles using those exact auth UUIDs
    const seededProfiles = await ProfileSchema.seedProfiles(db, {
      userIds: authUserIds,
    });

    console.log(
      `Seeded ${authUserIds.length} auth users and ${seededProfiles.length} profiles successfully.`,
    );
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
