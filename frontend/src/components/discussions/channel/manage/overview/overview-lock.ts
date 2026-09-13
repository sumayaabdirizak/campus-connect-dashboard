import { toast } from 'sonner';
import { LOCK_DENY_BITS, toBigIntMask } from './constants';

type OverwriteLike = { allow?: string | null; deny?: string | null } | undefined;

type PutMutate = {
  mutate: (
    vars: {
      targetType: 'ROLE';
      targetId: number;
      allow: string;
      deny: string;
    },
    opts?: { onSuccess?: () => void }
  ) => void;
};

type DeleteMutate = {
  mutate: (
    vars: { targetType: 'ROLE'; targetId: number; quiet: boolean },
    opts?: { onSuccess?: () => void }
  ) => void;
};

export function applyChannelLock(opts: {
  nextLocked: boolean;
  everyoneRoleId: number;
  everyoneOverwrite: OverwriteLike;
  putOverwriteMut: PutMutate;
  deleteOverwriteMut: DeleteMutate;
}) {
  const allow = toBigIntMask(opts.everyoneOverwrite?.allow ?? '0');
  let deny = toBigIntMask(opts.everyoneOverwrite?.deny ?? '0');

  if (opts.nextLocked) {
    deny |= LOCK_DENY_BITS;
    opts.putOverwriteMut.mutate(
      {
        targetType: 'ROLE',
        targetId: opts.everyoneRoleId,
        allow: allow.toString(),
        deny: deny.toString()
      },
      { onSuccess: () => toast.success('Channel locked') }
    );
    return;
  }

  deny &= ~LOCK_DENY_BITS;
  if (deny === BigInt(0) && allow === BigInt(0)) {
    if (opts.everyoneOverwrite) {
      opts.deleteOverwriteMut.mutate(
        {
          targetType: 'ROLE',
          targetId: opts.everyoneRoleId,
          quiet: true
        },
        { onSuccess: () => toast.success('Channel unlocked') }
      );
    }
  } else {
    opts.putOverwriteMut.mutate(
      {
        targetType: 'ROLE',
        targetId: opts.everyoneRoleId,
        allow: allow.toString(),
        deny: deny.toString()
      },
      { onSuccess: () => toast.success('Channel unlocked') }
    );
  }
}
