'use server';

/**
 * Validate admin password against environment variable.
 */
export async function validateAdminPassword(password: string) {
  const expectedPassword = process.env.NEXT_PRIVATE_ADMIN_PASSWORD;
  if (!expectedPassword) {
    console.error('NEXT_PRIVATE_ADMIN_PASSWORD environment variable is not set.');
    return false;
  }

  return password === expectedPassword;
}
