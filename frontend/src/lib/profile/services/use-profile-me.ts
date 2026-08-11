'use client';

import { useQuery } from '@/lib/async-query';
import { fetchProfileMe } from './profile-service';

export function useProfileMe(enabled = true) {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: fetchProfileMe,
    enabled,
  });
}
