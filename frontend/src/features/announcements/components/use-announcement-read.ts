'use client';

import { useEffect, useState } from 'react';
import type { AnnouncementCardProps } from './announcement-card-types';

export function useAnnouncementReadState({
  announcement,
  readTrigger = 'viewport',
  onMarkAsRead,
  onSnapshotUnreadBeforeRead,
  onReadDiagnostic,
}: Pick<
  AnnouncementCardProps,
  'announcement' | 'readTrigger' | 'onMarkAsRead' | 'onSnapshotUnreadBeforeRead' | 'onReadDiagnostic'
>) {
  const [isRead, setIsRead] = useState(Boolean(announcement.isRead));
  const isDraftStatus = String(announcement.status ?? '').toUpperCase() === 'DRAFT';
  const clickMarkReadActive = readTrigger === 'click' && !isRead && !isDraftStatus;

  useEffect(() => {
    setIsRead(Boolean(announcement.isRead));
  }, [announcement.id, announcement.isRead]);

  const markRead = async () => {
    if (isDraftStatus) return;
    if (readTrigger !== 'click' || isRead || !onMarkAsRead) return;
    try {
      onSnapshotUnreadBeforeRead?.();
      await onMarkAsRead(Number(announcement.id));
      setIsRead(true);
      onReadDiagnostic?.(Number(announcement.id));
    } catch {
      // Non-blocking read marker.
    }
  };

  return { isRead, setIsRead, isDraftStatus, clickMarkReadActive, markRead };
}

export function useAnnouncementViewportRead({
  cardRef,
  announcement,
  readTrigger,
  isRead,
  isDraftStatus,
  onMarkAsRead,
  onSnapshotUnreadBeforeRead,
  onReadDiagnostic,
  setIsRead,
}: {
  cardRef: React.RefObject<HTMLElement | null>;
  announcement: AnnouncementCardProps['announcement'];
  readTrigger: AnnouncementCardProps['readTrigger'];
  isRead: boolean;
  isDraftStatus: boolean;
  onMarkAsRead?: AnnouncementCardProps['onMarkAsRead'];
  onSnapshotUnreadBeforeRead?: AnnouncementCardProps['onSnapshotUnreadBeforeRead'];
  onReadDiagnostic?: AnnouncementCardProps['onReadDiagnostic'];
  setIsRead: (value: boolean) => void;
}) {
  useEffect(() => {
    if (readTrigger !== 'viewport' || !cardRef.current) return;
    if (isDraftStatus) return;
    if (isRead || !onMarkAsRead) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        void (async () => {
          try {
            onSnapshotUnreadBeforeRead?.();
            await onMarkAsRead(Number(announcement.id));
            setIsRead(true);
            onReadDiagnostic?.(Number(announcement.id));
          } catch {
            // Non-blocking read marker.
          }
        })();
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [
    announcement.id,
    announcement.publishedAt,
    announcement.status,
    cardRef,
    isDraftStatus,
    isRead,
    onMarkAsRead,
    onReadDiagnostic,
    onSnapshotUnreadBeforeRead,
    readTrigger,
    setIsRead,
  ]);
}
