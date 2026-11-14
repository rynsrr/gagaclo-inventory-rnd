/**
 * Authentication and authorization utilities for Gagaclo R&D Inventory.
 * Royan is designated as the Superuser with full administrative privileges.
 */

export function isSuperuser(user) {
  if (!user) return false;
  const name = String(user.name || user.username || '').trim().toLowerCase();
  const role = String(user.role || '').toLowerCase();
  return name === 'royan' || user.isSuperuser === true || role.includes('super');
}
