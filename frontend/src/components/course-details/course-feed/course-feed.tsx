'use client';

import { Megaphone, Plus } from 'lucide-react';
import { Button } from '@/features/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/features/ui/components/dialog';
import { QueryErrorState } from '@/components/query-error-state';
import { CoursePostForm } from '../course-post-form';
import { CoursePageShell } from '../_shared/course-page-shell';
import { EmptyState } from '../_shared/empty-state';
import { ListSkeleton } from '../_shared/list-skeleton';
import { EditPostDialog } from './edit-post-dialog';
import { FeedPostCard } from './feed-post-card';
import { FeedToolbar } from './feed-toolbar';
import type { CourseFeedProps } from './types';
import { useCourseFeedView } from './use-course-feed-view';

export function CourseFeed({ courseId, isStudent }: CourseFeedProps) {
  const v = useCourseFeedView(courseId);

  const feedDescription =
    v.posts.length === 0
      ? isStudent
        ? 'Course updates from your lecturer'
        : 'Course updates for your class'
      : `${v.filtered.length === v.posts.length ? v.posts.length : `${v.filtered.length} of ${v.posts.length}`} post${v.posts.length === 1 ? '' : 's'}`;

  const newPostAction = !isStudent ? (
    <Button size='sm' className='gap-1.5' onClick={() => v.setCreateOpen(true)}>
      <Plus className='size-4' aria-hidden />
      New post
    </Button>
  ) : undefined;

  return (
    <>
      <CoursePageShell title='Feed' description={feedDescription} actions={newPostAction}>
        <div className='space-y-4'>
          <FeedToolbar
            search={v.search}
            onSearch={v.setSearch}
            filter={v.filter}
            onFilter={v.setFilter}
            counts={v.filterCounts}
          />

          {v.isLoading ? <ListSkeleton variant='card' count={3} /> : null}
          {v.isError ? (
            <QueryErrorState
              title='Could not load the feed'
              onRetry={() => void v.refetch()}
            />
          ) : null}

          {!v.isLoading && !v.isError && v.filtered.length === 0 && v.posts.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title='No posts yet'
              description={
                isStudent
                  ? 'Course updates from your lecturer will appear here.'
                  : 'Share an update, ask a question, or attach a file to start the conversation.'
              }
              actionLabel={isStudent ? undefined : 'New post'}
              onAction={isStudent ? undefined : () => v.setCreateOpen(true)}
            />
          ) : null}

          {!v.isLoading && !v.isError && v.filtered.length === 0 && v.posts.length > 0 ? (
            <p className='py-8 text-center text-sm text-muted-foreground'>
              No posts match your search or filter.
            </p>
          ) : null}

          {!v.isLoading && !v.isError && v.filtered.length > 0 ? (
            <div className='space-y-3'>
              {v.filtered.map((item) => (
                <FeedPostCard
                  key={item.id}
                  post={item}
                  courseId={courseId}
                  userId={v.userId}
                  userName={v.userName}
                  onEdit={() => v.setEditing(item)}
                  onDelete={() => v.handleDelete(item.id)}
                  onReact={(emoji) => v.onReact(item.id, emoji)}
                  onDeleteAttachment={(fileId) =>
                    v.deleteAttachmentMutation.mutate(fileId)
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
      </CoursePageShell>

      <Dialog open={v.createOpen} onOpenChange={v.setCreateOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
          </DialogHeader>
          <CoursePostForm
            onSubmit={v.handleCreate}
            onCancel={() => v.setCreateOpen(false)}
            submitting={v.createMutation.isPending}
            uploading={v.uploadAttachmentsMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <EditPostDialog
        editing={v.editing}
        setEditing={v.setEditing}
        onSave={v.handleUpdate}
        isSaving={v.updateMutation.isPending}
      />
    </>
  );
}
