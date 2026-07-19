import {
  buildAnnouncementWhere,
  buildClubWhere,
  buildDiscussionWhere,
  buildSmsWhere,
} from './source-where.js';
import {
  countAnnouncementLogs,
  countClubLogs,
  countDiscussionLogs,
  countSmsLogs,
  fetchAnnouncementLogs,
  fetchClubLogs,
  fetchDiscussionLogs,
  fetchSmsLogs,
} from './source-queries.js';

export const SOURCE_FETCHERS = {
  announcement: {
    buildWhere: buildAnnouncementWhere,
    count: countAnnouncementLogs,
    fetch: fetchAnnouncementLogs,
  },
  discussion: {
    buildWhere: buildDiscussionWhere,
    count: countDiscussionLogs,
    fetch: fetchDiscussionLogs,
  },
  club: {
    buildWhere: buildClubWhere,
    count: countClubLogs,
    fetch: fetchClubLogs,
  },
  sms: {
    buildWhere: buildSmsWhere,
    count: countSmsLogs,
    fetch: fetchSmsLogs,
  },
};

export function sourceFromModule(module) {
  const map = {
    Announcements: 'announcement',
    Discussions: 'discussion',
    Clubs: 'club',
    Notifications: 'sms',
  };
  return map[module] ?? null;
}

export function resolveActiveSources(source, module) {
  if (source && source !== 'all') {
    return SOURCE_FETCHERS[source] ? [source] : [];
  }
  if (module && module !== 'all') {
    const mapped = sourceFromModule(module);
    return mapped ? [mapped] : Object.keys(SOURCE_FETCHERS);
  }
  return Object.keys(SOURCE_FETCHERS);
}
