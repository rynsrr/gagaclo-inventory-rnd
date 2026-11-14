/**
 * Authentication and authorization utilities for Gagaclo R&D Inventory.
 * All 5 PICs (including Royan) are regular users with equal access privileges.
 */

export function isSuperuser(user) {
  if (!user) return false;
  const name = String(user.name || user.username || '').trim().toLowerCase();
  // Royan is a regular user (not superuser)
  if (name === 'royan') return false;
  const role = String(user.role || '').toLowerCase();
  return user.isSuperuser === true || role.includes('super');
}
