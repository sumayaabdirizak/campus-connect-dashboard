import {
  CRITICAL_ACTIONS,
  DISCUSSION_ACTION_LABELS,
  MODULE_MAP,
  WARNING_ACTIONS,
} from './constants.js';

export function inferActionType(action, source) {
  const a = String(action).toUpperCase();
  if (a.includes('CREATE') || a === 'CREATE') return 'create';
  if (a.includes('DELETE') || a.includes('HARD_DELETE') || a === 'REMOVE_MEMBER') return 'delete';
  if (a.includes('APPROVE')) return 'approve';
  if (a.includes('REJECT')) return 'reject';
  if (a.includes('LOGIN')) return 'login';
  if (a.includes('LOGOUT')) return 'logout';
  if (a.includes('EXPORT')) return 'export';
  if (a.includes('IMPORT')) return 'import';
  if (source === 'sms') return 'update';
  if (a.includes('UPDATE') || a.includes('EDIT') || a.includes('UPSERT') || a.includes('PIN')) return 'update';
  return 'update';
}

export function inferSeverity(action, source, status) {
  const a = String(action).toUpperCase();
  if (status === 'failed' || a === 'FAILED') return 'critical';
  if (CRITICAL_ACTIONS.has(a)) return 'critical';
  if (WARNING_ACTIONS.has(a) || a.includes('ARCHIVE') || a.includes('SUSPEND')) return 'warning';
  if (a === 'SKIPPED') return 'warning';
  if (source === 'sms' && a === 'FAILED') return 'error';
  return 'info';
}

export function inferStatus(action, source) {
  const a = String(action).toUpperCase();
  if (source === 'sms' && (a === 'FAILED' || a === 'SKIPPED')) return 'failed';
  return 'success';
}

export function normalizeActionLabel(source, action) {
  if (source === 'discussion') return DISCUSSION_ACTION_LABELS[action] ?? action;
  if (source === 'club') {
    return String(action)
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (source === 'sms') return `SMS ${String(action).toLowerCase()}`;
  return String(action)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildDescription(entry) {
  if (entry.summary) return String(entry.summary);
  const target = entry.targetLabel ? ` on ${entry.targetLabel}` : '';
  return `${entry.actionLabel}${target}.`;
}

export function actorFromRelation(actorId, actor) {
  if (actor?.full_name) {
    return {
      actorId: actor.id ?? actorId,
      actorName: actor.full_name,
      actorEmail: actor.email ?? null,
      actorRole: actor.role?.name ?? null,
    };
  }
  if (actorId != null) {
    return {
      actorId,
      actorName: `User #${actorId}`,
      actorEmail: null,
      actorRole: null,
    };
  }
  return { actorId: null, actorName: 'System', actorEmail: null, actorRole: null };
}

export function enrichEntry(base) {
  const status = inferStatus(base.action, base.source);
  const severity = inferSeverity(base.action, base.source, status);
  const actionType = inferActionType(base.action, base.source);
  return {
    ...base,
    module: MODULE_MAP[base.source] ?? 'System',
    actionType,
    severity,
    status,
    description: buildDescription(base),
    resourceId: base.targetId,
    ipAddress: null,
    sessionId: null,
    browser: null,
    device: null,
    operatingSystem: null,
    errorMessage: status === 'failed' ? base.summary ?? 'Operation did not complete successfully.' : null,
  };
}
