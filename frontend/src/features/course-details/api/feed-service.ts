import { apiClient } from '@/lib/api-client';
import { uploadJson } from '@/lib/upload-client';
import type {
  CoursePost,
  CoursePostAttachment,
  CoursePostReply,
  CreateCoursePostInput,
  UpdateCoursePostInput
} from './feed-types';

export async function getCourseFeed(courseOfferingId: string): Promise<CoursePost[]> {
  return apiClient<CoursePost[]>(`/course-feed/${courseOfferingId}`);
}

export async function createCoursePost(
  courseOfferingId: string,
  input: CreateCoursePostInput
): Promise<CoursePost> {
  return apiClient<CoursePost>(`/course-feed/${courseOfferingId}`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function updateCoursePost(
  postId: number,
  input: UpdateCoursePostInput
): Promise<CoursePost> {
  return apiClient<CoursePost>(`/course-feed/post/${postId}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function deleteCoursePost(postId: number): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/course-feed/post/${postId}`, {
    method: 'DELETE'
  });
}

export async function uploadCoursePostAttachments(
  postId: number,
  files: File[]
): Promise<{ count: number; attachments: CoursePostAttachment[] }> {
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  return uploadJson<{ count: number; attachments: CoursePostAttachment[] }>(
    `/course-feed/post/${postId}/attachments`,
    fd
  );
}

export async function deleteCoursePostAttachment(
  attachmentId: number
): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/course-feed/attachments/${attachmentId}`, {
    method: 'DELETE'
  });
}

export async function toggleReaction(
  postId: number,
  emoji: string
): Promise<{ toggled: 'on' | 'off' }> {
  return apiClient(`/course-feed/post/${postId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji })
  });
}

export async function addReply(postId: number, content: string): Promise<CoursePostReply> {
  return apiClient<CoursePostReply>(`/course-feed/post/${postId}/replies`, {
    method: 'POST',
    body: JSON.stringify({ content })
  });
}

export async function updateReply(replyId: number, content: string): Promise<CoursePostReply> {
  return apiClient<CoursePostReply>(`/course-feed/replies/${replyId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content })
  });
}

export async function deleteReply(replyId: number): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/course-feed/replies/${replyId}`, {
    method: 'DELETE'
  });
}
