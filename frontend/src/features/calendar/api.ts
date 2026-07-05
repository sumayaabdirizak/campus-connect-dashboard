'use client';

import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, invalidateQueries } from '@/lib/async-query';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PersonalEvent {
  id: number;
  title: string;
  notes: string | null;
  color: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  reminderAt: string | null;
}

export interface PersonalEventInput {
  title: string;
  notes?: string | null;
  color?: string | null;
  startsAt: string;
  endsAt?: string | null;
  allDay?: boolean;
  reminderAt?: string | null;
}

// ── Service ───────────────────────────────────────────────────────────────────
const base = '/calendar/events';

export function listPersonalEvents(from: string, to: string) {
  return apiClient<{ results: PersonalEvent[] }>(
    `${base}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

export function createPersonalEvent(body: PersonalEventInput) {
  return apiClient<{ event: PersonalEvent }>(base, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function updatePersonalEvent(id: number, body: Partial<PersonalEventInput>) {
  return apiClient<{ event: PersonalEvent }>(`${base}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

export function deletePersonalEvent(id: number) {
  return apiClient<{ success: boolean }>(`${base}/${id}`, { method: 'DELETE' });
}

// ── Query keys + hooks ────────────────────────────────────────────────────────
export const calendarKeys = {
  all: ['calendar'] as const,
  events: (from: string, to: string) =>
    ['calendar', 'events', from, to] as const
};

export function usePersonalEvents(from: string, to: string) {
  return useQuery<{ results: PersonalEvent[] }>({
    queryKey: calendarKeys.events(from, to),
    queryFn: () => listPersonalEvents(from, to),
    staleTime: 15_000
  });
}

/** Invalidate every cached events range so the calendar refetches after a write. */
function invalidateAllEvents() {
  invalidateQueries({ queryKey: ['calendar', 'events'] });
}

export function useCreatePersonalEvent() {
  return useMutation<{ event: PersonalEvent }, PersonalEventInput>({
    mutationFn: (body) => createPersonalEvent(body),
    onSuccess: invalidateAllEvents
  });
}

export function useUpdatePersonalEvent() {
  return useMutation<
    { event: PersonalEvent },
    { id: number; body: Partial<PersonalEventInput> }
  >({
    mutationFn: ({ id, body }) => updatePersonalEvent(id, body),
    onSuccess: invalidateAllEvents
  });
}

export function useDeletePersonalEvent() {
  return useMutation<{ success: boolean }, number>({
    mutationFn: (id) => deletePersonalEvent(id),
    onSuccess: invalidateAllEvents
  });
}
