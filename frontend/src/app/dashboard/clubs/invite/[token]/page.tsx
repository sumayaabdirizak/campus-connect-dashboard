'use client';

import { use, useState } from 'react';
import { useInvitePreview, useAcceptInvite } from '@/lib/clubs/queries';
import type { AcceptInviteResponse } from '@/lib/clubs/types';
import { InviteAcceptLoading, InviteAcceptError } from '@/components/clubs/invite-accept/invite-accept-states';
import { InviteAcceptSuccess } from '@/components/clubs/invite-accept/invite-accept-success';
import { InviteAcceptCard } from '@/components/clubs/invite-accept/invite-accept-card';

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { data, isLoading, error } = useInvitePreview(token);
  const acceptMutation = useAcceptInvite();
  const [acceptResult, setAcceptResult] = useState<AcceptInviteResponse | null>(null);

  const handleAccept = () => {
    acceptMutation.mutate(token, {
      onSuccess: (res: AcceptInviteResponse) => setAcceptResult(res),
    });
  };

  if (isLoading) return <InviteAcceptLoading />;
  if (error || !data?.club) return <InviteAcceptError error={error} />;

  if (acceptResult?.joined) {
    return <InviteAcceptSuccess club={data.club} acceptResult={acceptResult} />;
  }

  return (
    <InviteAcceptCard data={data} isPending={acceptMutation.isPending} onAccept={handleAccept} />
  );
}
