import { useMutation, useQueryClient } from '@/lib/async-query';
import { createUser, deleteUser, updateUser } from '../services';

export const useRegisterUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] })
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] })
  });
};

export const deleteUserMutation = {
  mutationFn: deleteUser
};
