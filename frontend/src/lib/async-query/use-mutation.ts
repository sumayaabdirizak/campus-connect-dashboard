'use client';

import { useCallback, useRef, useState } from 'react';
import type { MutateCallbacks } from './types';

type MutationOptions<TData, TVars> = {
  mutationFn: (vars: TVars) => Promise<TData>;
  onSuccess?: (data: TData, vars: TVars, context: unknown) => void;
  onError?: (error: Error, vars: TVars, context: unknown) => void;
  onMutate?: (vars: TVars) => unknown | Promise<unknown>;
  onSettled?: (data: TData | undefined, error: Error | null, vars: TVars, context: unknown) => void;
};

export function useMutation<TData = unknown, TVars = void>(opts: MutationOptions<TData, TVars>) {
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const [isPending, setIsPending] = useState(false);

  const run = useCallback(async (vars: TVars, call?: MutateCallbacks<TData, TVars>) => {
    const o = optsRef.current;
    let context: unknown;
    let result: TData | undefined;
    let err: Error | null = null;
    setIsPending(true);
    try {
      if (o.onMutate) context = await o.onMutate(vars);
      result = await o.mutationFn(vars);
      o.onSuccess?.(result, vars, context);
      call?.onSuccess?.(result, vars);
      return result;
    } catch (e) {
      err = e instanceof Error ? e : new Error(String(e));
      o.onError?.(err, vars, context);
      call?.onError?.(err, vars);
      throw err;
    } finally {
      optsRef.current.onSettled?.(result, err, vars, context);
      call?.onSettled?.();
      setIsPending(false);
    }
  }, []);

  const mutate = useCallback(
    (vars: TVars, call?: MutateCallbacks<TData, TVars>) => {
      run(vars, call).catch(() => {});
    },
    [run]
  );

  const mutateAsync = useCallback(
    (vars: TVars, call?: MutateCallbacks<TData, TVars>) => run(vars, call),
    [run]
  );

  return { mutate, mutateAsync, isPending };
}
