export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  roleId?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export type UserFilters = {
  page?: number;
  limit?: number;
  roles?: string;
  search?: string;
  sort?: string;
};

export type UsersResponse = {
  message: string;
  total_users: number;
  users: User[];
};

export type UserMutationPayload = {
  full_name: string;
  email: string;
  password?: string;
  role: string;
  departmentCode?: string;
};
