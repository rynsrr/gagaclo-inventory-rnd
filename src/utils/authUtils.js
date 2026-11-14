/**
 * Authentication and authorization utilities for Gagaclo R&D Inventory.
 * All 5 PICs (including Royan) are regular users with equal access privileges.
 * 3 Helpers (Asisten Rekap) have cross-box input rights with attribution logging.
 */

export function isSuperuser(user) {
  if (!user) return false;
  const name = String(user.name || user.username || '').trim().toLowerCase();
  // Royan is a regular user (not superuser)
  if (name === 'royan') return false;
  const role = String(user.role || '').toLowerCase();
  return user.isSuperuser === true || role.includes('super');
}

export function isHelper(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  const name = String(user.name || user.username || '').toLowerCase();
  return (
    user.isHelper === true ||
    role.includes('helper') ||
    role.includes('asisten') ||
    role.includes('rekap') ||
    name.startsWith('helper') ||
    name.includes('asisten')
  );
}
