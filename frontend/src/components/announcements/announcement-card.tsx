'use client';

import { memo } from 'react';
import { AnnouncementCardBase } from './announcement-card-base';

export type { AnnouncementCardProps } from './announcement-card-types';

export const AnnouncementCard = memo(AnnouncementCardBase);
