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
    role.includes('manager') ||
    role.includes('leader')
  );
}

export function isSuperuser(user) {
  if (!user) return false;
  const name = String(user.name || user.username || '').trim().toLowerCase();
  // Royan is a regular user (not superuser)
  if (name === 'royan') return false;
  if (name === 'jasmine' || user.isManager === true) return true;
  const role = String(user.role || '').toLowerCase();
  return user.isSuperuser === true || role.includes('super') || role.includes('manager') || role.includes('leader');
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

/**
 * Resolves the real inputter / contributor of an item with badge styling and role.
 * Dual-tracking aware: identifies PPIC owners, cross-PPIC helpers, and Support team members.
 */
export function resolveItemInputter(item, box) {
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  const inputtedByTag = tags.find((t) => typeof t === 'string' && t.startsWith('inputted_by:'));
  const supportTag = tags.find((t) => typeof t === 'string' && (t.startsWith('support:') || t.startsWith('helper:')));

  const raw =
    item?.inputtedBy ||
    item?.createdBy ||
    (inputtedByTag ? decodeURIComponent(inputtedByTag.slice(12)) : null) ||
    item?.supportName ||
    item?.helperName ||
    (supportTag ? decodeURIComponent(supportTag.slice(supportTag.indexOf(':') + 1)) : null);

  let name = '';
  if (raw) {
    const s = String(raw).trim();
    if (/helper\s*1/i.test(s)) name = 'Sheva';
    else if (/helper\s*2/i.test(s)) name = 'Ade';
    else if (/helper\s*3/i.test(s)) name = 'Tri';
    else name = s;
  } else {
    name = box?.picName || item?.picName || 'Royan';
  }

  const sLow = name.toLowerCase();
  if (sLow === 'royan') {
    return { name: 'Royan', role: 'PPIC #1', type: 'ppic', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  if (sLow === 'cynara') {
    return { name: 'Cynara', role: 'PPIC #2', type: 'ppic', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' };
  }
  if (sLow === 'ami') {
    return { name: 'Ami', role: 'PPIC #3', type: 'ppic', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (sLow === 'ryan') {
    return { name: 'Ryan', role: 'PPIC #4', type: 'ppic', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  if (sLow === 'hanami') {
    return { name: 'Hanami', role: 'PPIC #5', type: 'ppic', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
  if (sLow === 'sheva') {
    return { name: 'Sheva', role: 'Support #1', type: 'support', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200' };
  }
  if (sLow === 'ade') {
    return { name: 'Ade', role: 'Support #2', type: 'support', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
  }
  if (sLow === 'tri') {
    return { name: 'Tri', role: 'Support #3', type: 'support', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' };
  }
  if (sLow === 'jasmine') {
    return { name: 'Jasmine', role: 'Leader', type: 'leader', badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' };
  }
  return { name, role: 'Staff', type: 'other', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
}
