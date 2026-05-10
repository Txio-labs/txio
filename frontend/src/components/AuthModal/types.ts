import { UserProfile, TeamMember } from '../../types';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onLogin: (email: string, pass: string) => void;
  onSignup: (name: string, email: string, pass: string) => void;
  onLogout: () => void;
  teamMembers?: TeamMember[];
}

export type ProfileTab = 'general' | 'security' | 'api-keys' | 'notifications' | 'team';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created: number;
  lastUsed: string;
  status: 'active' | 'revoked';
}