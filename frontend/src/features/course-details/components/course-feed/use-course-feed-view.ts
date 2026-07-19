'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@/lib/async-query';
import { useAuthStore } from '@/lib/auth-store';
import type { CoursePostFormValues } from '../../schemas/course-post';
import { deleteCoursePost } from '../../api/feed-service';
import {
  feedKeys,
  useCourseFeed,
  useCreateCoursePost,
  useDeleteCoursePostAttachment,
  useToggleReaction,
  useUpdateCoursePost,
  useUploadCoursePostAttachments
} from '../../api/feed-queries';
import type { CoursePost } from '../../api/feed-types';
import { useDeleteWithUndo } from '../_shared/use-delete-with-undo';
import type { FeedFilter } from './types';

export function useCourseFeedView(courseId: string) {
  const { user } = useAuthStore();
  const userId = typeof user?.id === 'number' ? user.id : Number(user?.id ?? 0) || null;
  const userName = (user?.full_name ?? user?.name ?? null) as string | null;

  const { data: posts = [], isLoading, isError, refetch } = useCourseFeed(courseId);
  const createMutation = useCreateCoursePost(courseId);
  const updateMutation = useUpdateCoursePost(courseId);
  const uploadAttachmentsMutation = useUploadCoursePostAttachments(courseId);
  const deleteAttachmentMutation = useDeleteCoursePostAttachment(courseId);
  const toggleReactionMutation = useToggleReaction(courseId, userId);

  const [filter, setFilter] = useState<FeedFilter>('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CoursePost | null>(null);

  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();

  const filterCounts = useMemo(
    () => ({
      all: posts.length,
      important: posts.filter((p) => p.isImportant).length,
      attachments: posts.filter((p) => p.attachments.length > 0).length,
      auto: posts.filter((p) => p.source !== 'MANUAL').length
    }),
    [posts]
  );

  const filtered = posts.filter((p) => {
    if (filter === 'important' && !p.isImportant) return false;
    if (filter === 'attachments' && p.attachments.length === 0) return false;
    if (filter === 'auto' && p.source === 'MANUAL') return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = (values: CoursePostFormValues, pendingFiles: File[]) => {
    createMutation.mutate(
      { title: values.title, content: values.content, isImportant: values.isImportant },
      {
        onSuccess: (post) => {
          if (pendingFiles.length === 0) {
            setCreateOpen(false);
            return;
          }
          uploadAttachmentsMutation.mutate(
            { postId: post.id, files: pendingFiles },
            { onSettled: () => setCreateOpen(false) }
          );
        }
      }
    );
  };

  const handleUpdate = () => {
    if (!editing) return;
    updateMutation.mutate(
      {
        postId: editing.id,
        input: {
          title: editing.title,
          content: editing.content,
          isImportant: editing.isImportant,
          isPinned: editing.isPinned
        }
      },
      { onSuccess: () => setEditing(null) }
    );
  };

  const handleDelete = (postId: number) => {
    const key = feedKeys.list(courseId);
    const snapshot = queryClient.getQueryData<CoursePost[]>(key);
    if (!snapshot) return;
    const removed = snapshot.find((p) => p.id === postId);
    if (!removed) return;
    runDelete({
      label: `Post deleted · "${removed.title}"`,
      optimisticallyRemove: () => {
        queryClient.setQueryData<CoursePost[]>(key, (prev) =>
          (prev ?? []).filter((p) => p.id !== postId)
        );
      },
      restore: () => {
        queryClient.setQueryData<CoursePost[]>(key, () => snapshot);
      },
      commit: () => deleteCoursePost(postId)
    });
  };

  return {
    userId,
    userName,
    posts,
    filtered,
    filterCounts,
    isLoading,
    isError,
    refetch,
    filter,
    setFilter,
    search,
    setSearch,
    createOpen,
    setCreateOpen,
    editing,
    setEditing,
    createMutation,
    updateMutation,
    uploadAttachmentsMutation,
    deleteAttachmentMutation,
    handleCreate,
    handleUpdate,
    handleDelete,
    onReact: (postId: number, emoji: string) => {
      toggleReactionMutation.mutate({ postId, emoji });
    }
  };
}
