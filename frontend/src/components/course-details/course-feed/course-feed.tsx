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
import { CourseTabHeader } from '../_shared/course-tab-header';
import { CourseTabPage } from '../_shared/course-tab-page';
import { EmptyState } from '../_shared/empty-state';
import { ListSkeleton } from '../_shared/list-skeleton';
import { EditPostDialog } from './edit-post-dialog';
import { FeedPostCard } from './feed-post-card';
import type { CourseFeedProps } from './types';
import { useCourseFeedView } from './use-course-feed-view';

export function CourseFeed({ courseId, isStudent }: CourseFeedProps) {
  const v = useCourseFeedView(courseId);

  const feedDescription = isStudent
    ? 'Course updates from your lecturer.'
    : 'Share updates and announcements with your class.';

  return (
    <>
      <CourseTabPage>
        <CourseTabHeader
          title='Feed'
          description={feedDescription}
          search={{
            value: v.search,
            onChange: v.setSearch,
            placeholder: 'Search posts…',
            'aria-label': 'Search posts'
          }}
          actions={
            !isStudent ? (
              <Button
                size='sm'
                className='gap-1.5 rounded-full'
                onClick={() => v.setCreateOpen(true)}
              >
                <Plus className='size-4' aria-hidden />
                New post
              </Button>
            ) : undefined
          }
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
                : 'Share a short text update with your class.'
            }
            actionLabel={isStudent ? undefined : 'New post'}
            onAction={isStudent ? undefined : () => v.setCreateOpen(true)}
          />
        ) : null}

        {!v.isLoading && !v.isError && v.filtered.length === 0 && v.posts.length > 0 ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>
            No posts match your search.
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
              />
            ))}
          </div>
        ) : null}
      </CourseTabPage>

      <Dialog open={v.createOpen} onOpenChange={v.setCreateOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
          </DialogHeader>
          <CoursePostForm
            onSubmit={v.handleCreate}
            onCancel={() => v.setCreateOpen(false)}
            submitting={v.createMutation.isPending}
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
