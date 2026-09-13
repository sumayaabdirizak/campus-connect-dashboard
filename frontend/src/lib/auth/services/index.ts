// Auth services are handled via apiClient directly
// This file is kept for consistency with the lib/ structure
export type User = {
  id: number;
  email: string;
  full_name: string;
  role: string;
};
