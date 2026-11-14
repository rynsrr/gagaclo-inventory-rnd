/**
 * Authentication and authorization utilities for Gagaclo R&D Inventory.
 * All 5 PICs (including Royan) are regular users with equal access privileges.
 * 3 Support team members (Sheva, Ade, Tri) have cross-box input rights with attribution logging.
 */

export function isManager(user) {
  if (!user) return false;
  const name = String(user.name || user.username || '').trim().toLowerCase();
  const role = String(user.role || '').toLowerCase();
  return (
    user.isManager === true ||
    name === 'jasmine' ||
    role.includes('manager')
  );
}

export function isSuperuser(user) {
  if (!user) return false;
  const name = String(user.name || user.username || '').trim().toLowerCase();
  // Royan is a regular user (not superuser)
  if (name === 'royan') return false;
  if (name === 'jasmine' || user.isManager === true) return true;
  const role = String(user.role || '').toLowerCase();
  return user.isSuperuser === true || role.includes('super') || role.includes('manager');
}

export function isSupport(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  const name = String(user.name || user.username || '').toLowerCase();
  return (
    user.isSupport === true ||
    user.isHelper === true ||
    role.includes('support') ||
    role.includes('helper') ||
    role.includes('asisten') ||
    role.includes('rekap') ||
    name.startsWith('support') ||
    name.startsWith('helper') ||
    name.includes('asisten') ||
    ['sheva', 'ade', 'tri'].includes(name)
  );
}

export const isHelper = isSupport;
