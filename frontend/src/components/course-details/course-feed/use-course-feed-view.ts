'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@/lib/async-query';
import { useAuthStore } from '@/lib/auth-store';
import type { CoursePostFormValues } from '@/lib/course-details/schemas/course-post';
import { deleteCoursePost } from '@/lib/course-details/services/feed-service';
import {
  feedKeys,
  useCourseFeed,
  useCreateCoursePost,
  useToggleReaction,
  useUpdateCoursePost
} from '@/lib/course-details/queries/feed-queries';
import type { CoursePost } from '@/lib/course-details/types';
import { useDeleteWithUndo } from '../_shared/use-delete-with-undo';

export function useCourseFeedView(courseId: string) {
  const { user } = useAuthStore();
  const userId = typeof user?.id === 'number' ? user.id : Number(user?.id ?? 0) || null;
  const userName = (user?.full_name ?? user?.name ?? null) as string | null;

  const { data: posts = [], isLoading, isError, refetch } = useCourseFeed(courseId, {
    live: true
  });
  const createMutation = useCreateCoursePost(courseId);
  const updateMutation = useUpdateCoursePost(courseId);
  const toggleReactionMutation = useToggleReaction(courseId, userId);

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CoursePost | null>(null);

  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();

  const filtered = useMemo(() => {
    if (!search.trim()) return posts;
    const needle = search.toLowerCase();
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.content.toLowerCase().includes(needle)
    );
  }, [posts, search]);

  const handleCreate = (values: CoursePostFormValues) => {
    createMutation.mutate(
      { title: values.title, content: values.content, isImportant: false },
      { onSuccess: () => setCreateOpen(false) }
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
          isImportant: false,
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
    isLoading,
    isError,
    refetch,
    search,
    setSearch,
    createOpen,
    setCreateOpen,
    editing,
    setEditing,
    createMutation,
    updateMutation,
    handleCreate,
    handleUpdate,
    handleDelete,
    onReact: (postId: number, emoji: string) => {
      toggleReactionMutation.mutate({ postId, emoji });
    }
  };
}
