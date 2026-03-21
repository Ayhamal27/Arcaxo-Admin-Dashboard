// Re-export from centralized types
export { ProfileRole, ProfileStatus } from './database';
export type { Profile } from './entities';

/**
 * UserAccessGateResult — output of rpc_user_access_gate
 */
export interface UserAccessGateResult {
  user_id: string;
  email: string;
  country_code?: string;
  role: string | null;
  status: string | null;
  agent_scope: string;
  has_profile: boolean;
  can_access: boolean;
  access_code: string;
  access_message: string;
}
