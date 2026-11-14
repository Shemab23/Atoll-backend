import { eq } from "drizzle-orm";
import {
  pgEnum,
  pgSchema,
  pgTable,
  text,
  varchar,
  uuid,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

// Reference to Supabase's internal auth.users table for the Foreign Key constraint
export const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

// Enums
export const profileVisibility = pgEnum("visibility", ["public", "private"]);
export const userRole = pgEnum("role", ["user", "admin", "superAdmin"]);
export const accountStatus = pgEnum("status", [
  "active",
  "suspended",
  "deleted",
]);

// Table Definition (14 columns total)
export const profile = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    userName: varchar("user_name", { length: 30 }).notNull().unique(),
    displayName: varchar("display_name", { length: 50 }).notNull(),
    role: userRole("role").default("user").notNull(),
    bio: text("bio"),
    avatar: text("avatar"),
    country: varchar("country", { length: 100 }),
    city: varchar("city", { length: 100 }),
    interests: jsonb("interests").$type<string[]>().default([]).notNull(),
    visibility: profileVisibility("profile_visibility")
      .default("public")
      .notNull(),
    status: accountStatus("account_status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("profiles_username_idx").on(table.userName)],
);

// Types
export type InsertProfile = typeof profile.$inferInsert;
export type SelectProfile = typeof profile.$inferSelect;
export type UpdateProfileInput = Partial<
  Omit<InsertProfile, "id" | "createdAt" | "updatedAt" | "deletedAt">
>;

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Inserts a new profile (Affects 11 input fields + 3 default timestamp fields).
 */
export async function insertProfile(
  db: PostgresJsDatabase<any>,
  data: InsertProfile,
): Promise<SelectProfile> {
  const [created] = await db.insert(profile).values(data).returning();
  return created;
}

/**
 * Updates an existing profile (Affects up to 10 mutable fields + updatedAt).
 */
export async function updateProfile(
  db: PostgresJsDatabase<any>,
  userId: string,
  data: UpdateProfileInput,
): Promise<SelectProfile | undefined> {
  const [updated] = await db
    .update(profile)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(profile.id, userId))
    .returning();

  return updated;
}

/**
 * Soft-deletes a profile (Affects 3 fields: status, deletedAt, updatedAt).
 */
export async function softDeleteProfile(
  db: PostgresJsDatabase<any>,
  userId: string,
): Promise<SelectProfile | undefined> {
  const now = new Date();
  const [softDeleted] = await db
    .update(profile)
    .set({
      status: "deleted",
      deletedAt: now,
      updatedAt: now,
    })
    .where(eq(profile.id, userId))
    .returning();

  return softDeleted;
}

/**
 * Hard-deletes a single profile row (Removes all 14 fields).
 */
export async function hardDeleteProfile(
  db: PostgresJsDatabase<any>,
  userId: string,
): Promise<SelectProfile | undefined> {
  const [deleted] = await db
    .delete(profile)
    .where(eq(profile.id, userId))
    .returning();

  return deleted;
}

/**
 * Hard-deletes all rows in the profiles table.
 */
export async function clearAllProfiles(db: PostgresJsDatabase<any>) {
  return await db.delete(profile).returning();
}

// ============================================================================
// SEED DATA & ORCHESTRATION
// ============================================================================

export const PROFILE_SEED_DATA: Omit<InsertProfile, "id">[] = [
  {
    userName: "super_atoll",
    displayName: "Super Admin",
    role: "superAdmin",
    bio: "Platform founder and primary administrator.",
    country: "Rwanda",
    city: "Kigali",
    interests: ["architecture", "cloud", "systems"],
    visibility: "public",
    status: "active",
  },
  {
    userName: "admin_one",
    displayName: "Operations Admin",
    role: "admin",
    bio: "Community and operations moderator.",
    country: "Rwanda",
    city: "Kigali",
    interests: ["moderation", "community"],
    visibility: "public",
    status: "active",
  },
  {
    userName: "jane_doe",
    displayName: "Jane Doe",
    role: "user",
    bio: "Exploring Atoll.",
    country: "Rwanda",
    city: "Kigali",
    interests: ["design", "travel"],
    visibility: "public",
    status: "active",
  },
];

export interface SeedProfileParams {
  userIds: string[];
}

export async function seedProfiles(
  db: PostgresJsDatabase<any>,
  params: SeedProfileParams,
): Promise<SelectProfile[]> {
  if (params.userIds.length < PROFILE_SEED_DATA.length) {
    throw new Error(
      `Expected at least ${PROFILE_SEED_DATA.length} auth user IDs, received ${params.userIds.length}.`,
    );
  }

  const recordsToInsert: InsertProfile[] = PROFILE_SEED_DATA.map(
    (item, index) => ({
      ...item,
      id: params.userIds[index],
    }),
  );

  const superAdminCount = recordsToInsert.filter(
    (u) => u.role === "superAdmin",
  ).length;
  const adminCount = recordsToInsert.filter((u) => u.role === "admin").length;

  if (superAdminCount !== 1) {
    throw new Error(
      `Seed validation failed: Allowed only 1 superAdmin, found ${superAdminCount}.`,
    );
  }

  if (adminCount >= 3) {
    throw new Error(
      `Seed validation failed: Allowed fewer than 3 admins, found ${adminCount}.`,
    );
  }

  return await db.insert(profile).values(recordsToInsert).returning();
}
