import type { KeycloakProfile } from "keycloak-js";

export interface UserProfile extends KeycloakProfile {
  nickname?: string;
}

export interface UserAuth {
  isAuthenticated: boolean;
  profile: UserProfile | null;
}
