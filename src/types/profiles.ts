import { ProfileRole, ProfileStatus } from './database';

export { ProfileRole, ProfileStatus };

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
}

export interface UserAccessGateResult {
  can_access: boolean;
  access_code: string;
  role: string | null;
  status: string | null;
  message: string | null;
}
