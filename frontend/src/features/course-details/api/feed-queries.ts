import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import {
  addReply,
  createCoursePost,
  deleteCoursePost,
  deleteCoursePostAttachment,
  deleteReply,
  getCourseFeed,
  toggleReaction,
  updateCoursePost,
  updateReply,
  uploadCoursePostAttachments
} from './feed-service';
import type { CoursePost, CreateCoursePostInput, UpdateCoursePostInput } from './feed-types';

export const feedKeys = {
  all: ['course-feed'] as const,
  list: (courseOfferingId: string) => [...feedKeys.all, courseOfferingId] as const
};

export function useCourseFeed(courseOfferingId: string) {
  return useQuery({
    queryKey: feedKeys.list(courseOfferingId),
    queryFn: () => getCourseFeed(courseOfferingId)
  });
}

export function useCreateCoursePost(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCoursePostInput) => createCoursePost(courseOfferingId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.list(courseOfferingId) });
    }
  });
}

export function useUpdateCoursePost(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, input }: { postId: number; input: UpdateCoursePostInput }) =>
      updateCoursePost(postId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.list(courseOfferingId) });
    }
  });
}

export function useDeleteCoursePost(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) => deleteCoursePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.list(courseOfferingId) });
    }
  });
}

const invalidateFeed = (
  queryClient: ReturnType<typeof useQueryClient>,
  courseOfferingId: string
) => queryClient.invalidateQueries({ queryKey: feedKeys.list(courseOfferingId) });

export function useUploadCoursePostAttachments(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, files }: { postId: number; files: File[] }) =>
      uploadCoursePostAttachments(postId, files),
    onSuccess: () => invalidateFeed(queryClient, courseOfferingId)
  });
}

export function useDeleteCoursePostAttachment(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) => deleteCoursePostAttachment(attachmentId),
    onSuccess: () => invalidateFeed(queryClient, courseOfferingId)
  });
}

/**
 * Optimistic reaction toggle.
 *
 * Tapping an emoji should feel instant — a button that waits 200 ms for a
 * round-trip before showing +1 reads as broken. We mutate the cached feed
 * in-place, then reconcile on success or roll back on error.
 *
 * The optimistic row uses a negative random id so it doesn't collide with
 * any real DB id; the post-success `invalidateQueries` swaps in the truth.
 */
export function useToggleReaction(courseOfferingId: string, currentUserId: number | null) {
  const queryClient = useQueryClient();
  return useMutation<
    { toggled: 'on' | 'off' },
    { postId: number; emoji: string }
  >({
    mutationFn: ({ postId, emoji }) => toggleReaction(postId, emoji),
    onMutate: ({ postId, emoji }) => {
      if (currentUserId == null) return;
      const key = feedKeys.list(courseOfferingId);
      const previous = queryClient.getQueryData<CoursePost[]>(key);
      if (!previous) return { previous };
      const next = previous.map((p) => {
        if (p.id !== postId) return p;
        const mine = p.reactions.find(
          (r) => r.userId === currentUserId && r.emoji === emoji
        );
        if (mine) {
          // Toggle off: drop my reaction with this emoji.
          return { ...p, reactions: p.reactions.filter((r) => r !== mine) };
        }
        // Toggle on: append a synthetic reaction row with a sentinel id.
        return {
          ...p,
          reactions: [
            ...p.reactions,
            { id: -Math.floor(Math.random() * 1e9), userId: currentUserId, emoji }
          ]
        };
      });
      queryClient.setQueryData(key, next);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      const ctx = context as { previous?: CoursePost[] } | undefined;
      if (ctx?.previous) queryClient.setQueryData(feedKeys.list(courseOfferingId), ctx.previous);
    },
    onSettled: () => invalidateFeed(queryClient, courseOfferingId)
  });
}

/**
 * Optimistic reply add.
 *
 * Replies appear inline immediately with a sentinel id; the parent
 * invalidates the feed once the server has saved so the temp row is
 * replaced by the real one.
 */
export function useAddReply(
  courseOfferingId: string,
  currentUserId: number | null,
  currentUserName: string | null
) {
  const queryClient = useQueryClient();
  return useMutation<
    Awaited<ReturnType<typeof addReply>>,
    { postId: number; content: string }
  >({
    mutationFn: ({ postId, content }) => addReply(postId, content),
    onMutate: ({ postId, content }) => {
      if (currentUserId == null) return;
      const key = feedKeys.list(courseOfferingId);
      const previous = queryClient.getQueryData<CoursePost[]>(key);
      if (!previous) return { previous };
      const now = new Date().toISOString();
      const tempReply = {
        id: -Math.floor(Math.random() * 1e9),
        postId,
        authorId: currentUserId,
        content,
        created_at: now,
        updated_at: now,
        author: {
          id: currentUserId,
          full_name: currentUserName ?? 'You',
          role: null
        }
      };
      queryClient.setQueryData(
        key,
        previous.map((p) =>
          p.id === postId ? { ...p, replies: [...p.replies, tempReply] } : p
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      const ctx = context as { previous?: CoursePost[] } | undefined;
      if (ctx?.previous) queryClient.setQueryData(feedKeys.list(courseOfferingId), ctx.previous);
    },
    onSettled: () => invalidateFeed(queryClient, courseOfferingId)
  });
}

export function useUpdateReply(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ replyId, content }: { replyId: number; content: string }) =>
      updateReply(replyId, content),
    onSuccess: () => invalidateFeed(queryClient, courseOfferingId)
  });
}

export function useDeleteReply(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (replyId: number) => deleteReply(replyId),
    onSuccess: () => invalidateFeed(queryClient, courseOfferingId)
  });
}
