'use client';

import {
  AudioRenderer,
  isAudio,
  isUploadedAudio,
  isUploadedVideo,
  LinkRenderer,
  ResourceCard,
  VideoRenderer
} from '../resource-renderers';
import { TrackedMediaPlayer } from '../tracked-media-player';
import { resourceDownloadUrl } from '@/lib/course-details/services/resources-service';
import type { Resource } from '@/lib/course-details/types';
import { DragHandle } from './drag-handle';
import { ResourceMediaActions } from './resource-media-actions';

export function ResourceListItem({
  resource: r,
  isStudent,
  showDragHandle,
  onEditResource,
  onDeleteResource,
  onAnalytics
}: {
  resource: Resource;
  isStudent?: boolean;
  showDragHandle: boolean;
  onEditResource?: (resource: Resource) => void;
  onDeleteResource?: (resourceId: number) => void;
  onAnalytics?: (resource: Resource) => void;
}) {
  const dragHandle = showDragHandle ? <DragHandle /> : null;
  const mediaActions = (
    <ResourceMediaActions
      resource={r}
      isStudent={isStudent}
      onEditResource={onEditResource}
      onDeleteResource={onDeleteResource}
      onAnalytics={onAnalytics}
    />
  );

  if (r.type === 'VIDEO') {
    return (
      <div className='space-y-2 border rounded-lg p-3'>
        <div className='flex items-center gap-2'>
          {dragHandle}
          <p className='font-medium text-sm flex-1 truncate'>{r.title}</p>
          {mediaActions}
        </div>
        {isUploadedVideo(r) ? (
          <TrackedMediaPlayer
            resourceId={r.id}
            url={resourceDownloadUrl(r.id)}
            title={r.title}
            kind='video'
            track={!!isStudent}
          />
        ) : (
          <VideoRenderer url={r.url} title={r.title} />
        )}
      </div>
    );
  }

  if (r.type === 'EXTERNAL_LINK') {
    return (
      <div className='flex items-center gap-2'>
        {dragHandle}
        <div className='flex-1'>
          <LinkRenderer url={r.url} title={r.title} />
        </div>
      </div>
    );
  }

  if (isAudio(r)) {
    return (
      <div className='space-y-1 border rounded-lg p-3'>
        <div className='flex items-center gap-2'>
          {dragHandle}
          <p className='font-medium text-sm flex-1 truncate'>{r.title}</p>
          {mediaActions}
        </div>
        {isUploadedAudio(r) ? (
          <TrackedMediaPlayer
            resourceId={r.id}
            url={resourceDownloadUrl(r.id)}
            title={r.title}
            kind='audio'
            track={!!isStudent}
            showTitle={false}
          />
        ) : (
          <AudioRenderer url={r.url} title={r.title} />
        )}
      </div>
    );
  }

  return (
    <ResourceCard
      resource={r}
      isStudent={isStudent}
      onEdit={onEditResource}
      onDelete={onDeleteResource}
      dragHandle={dragHandle}
    />
  );
}
