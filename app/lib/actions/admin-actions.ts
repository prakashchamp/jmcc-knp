'use server';

/**
 * Validate admin password.
 * Reads from environment or falls back to default 0000.
 */
export async function validateAdminPassword(password: string) {
  const expectedPassword = process.env.ADMIN_PASSWORD || '0000';
  return password === expectedPassword;
}
