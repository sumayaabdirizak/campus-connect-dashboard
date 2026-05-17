import { useMutation, useQueryClient } from '@/lib/async-query';
import { createUser, deleteUser } from './service';

export const useRegisterUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] })
  });
};

export const deleteUserMutation = {
  mutationFn: deleteUser
};
