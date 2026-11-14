import { supabaseAdmin } from "../index";

export interface CreateAuthUserInput {
  email: string;
  password?: string;
  emailConfirm?: boolean;
}

export interface UpdateAuthUserInput {
  email?: string;
  password?: string;
  emailConfirm?: boolean;
  userMetadata?: Record<string, unknown>;
}

/**
 * Creates a single user in Supabase Auth (Affects: email, password, email_confirm).
 */
export async function createAuthUser(input: CreateAuthUserInput) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: input.emailConfirm ?? true,
  });

  if (error || !data.user) {
    throw new Error(
      `Failed to create auth user ${input.email}: ${error?.message}`,
    );
  }

  return data.user;
}

/**
 * Updates an existing user in Supabase Auth (Affects up to 4 fields).
 */
export async function updateAuthUser(
  userId: string,
  input: UpdateAuthUserInput,
) {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    {
      ...(input.email !== undefined && { email: input.email }),
      ...(input.password !== undefined && { password: input.password }),
      ...(input.emailConfirm !== undefined && {
        email_confirm: input.emailConfirm,
      }),
      ...(input.userMetadata !== undefined && {
        user_metadata: input.userMetadata,
      }),
    },
  );

  if (error || !data.user) {
    throw new Error(`Failed to update auth user ${userId}: ${error?.message}`);
  }

  return data.user;
}

/**
 * Hard-deletes a single user via Supabase Admin API (Cascades across auth schema).
 */
export async function deleteAuthUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId, false);

  if (error) {
    throw new Error(
      `Failed to hard-delete auth user ${userId}: ${error.message}`,
    );
  }

  return { deletedId: userId };
}

/**
 * Wipes all users from Supabase Auth using the Admin API.
 */
export async function clearAllAuthUsers(): Promise<number> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw new Error(`Failed to list auth users: ${error.message}`);
  }

  for (const user of data.users) {
    await deleteAuthUser(user.id);
  }

  return data.users.length;
}
