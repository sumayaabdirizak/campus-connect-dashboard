export type FeedI18n = ReturnType<typeof getFeedI18n>;

export function getFeedI18n(locale: 'en' | 'ar') {
  if (locale === 'ar') {
    return {
      all: 'الكل',
      pinned: 'نشِط',
      saved: 'المحفوظة',
      drafts: 'مسودات',
      search: 'بحث',
      create: 'إنشاء',
      role: 'الدور',
      readState: 'الحالة',
      date: 'التاريخ',
      read: 'مقروء',
      unread: 'غير مقروء',
      last7d: 'آخر 7 أيام',
      last30d: 'آخر 30 يوم',
      feedLabel: 'الإعلانات',
      showMore: 'عرض المزيد',
      unreadHeading: 'غير مقروء',
      pinnedHeading: 'نشِط',
      unreadAnnounce: (n: number) =>
        n === 0 ? 'لا توجد إعلانات غير مقروءة' : `لديك ${n} إعلان غير مقروء`,
      loadingLabel: 'جارٍ تحميل الإعلانات',
      sort: 'ترتيب',
      newest: 'الأحدث',
      oldest: 'الأقدم',
      priority: 'الأولوية',
      clearAll: 'مسح الكل',
      filtersActive: (n: number) => `${n} مرشّح`,
      newPostsPill: (n: number) => `${n} إعلان جديد · اعرض`,
      createWithDraftsAria: (n: number) =>
        n === 0 ? 'إنشاء إعلان' : `إنشاء إعلان، ${n} مسودة محفوظة`
    };
  }
  return {
    all: 'All',
    pinned: 'Active',
    saved: 'Saved',
    drafts: 'Drafts',
    search: 'Search',
    create: 'Create',
    role: 'Role',
    readState: 'Read State',
    date: 'Date',
    read: 'Read',
    unread: 'Unread',
    last7d: 'Last 7 days',
    last30d: 'Last 30 days',
    feedLabel: 'Announcements',
    showMore: 'Show more',
    unreadHeading: 'Unread',
    pinnedHeading: 'Active',
    unreadAnnounce: (n: number) =>
      n === 0 ? 'No unread announcements' : `${n} unread announcement${n === 1 ? '' : 's'}`,
    loadingLabel: 'Loading announcements',
    sort: 'Sort',
    newest: 'Newest',
    oldest: 'Oldest',
    priority: 'Priority',
    clearAll: 'Clear all',
    filtersActive: (n: number) => `${n} filter${n === 1 ? '' : 's'}`,
    newPostsPill: (n: number) => `${n} new post${n === 1 ? '' : 's'} · view`,
    createWithDraftsAria: (n: number) =>
      n === 0
        ? 'Create announcement'
        : `Create announcement, ${n} saved draft${n === 1 ? '' : 's'}`
  };
}
