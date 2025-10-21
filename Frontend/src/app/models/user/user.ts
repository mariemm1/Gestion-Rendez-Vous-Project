// Backend user roles and minimal fields you actually get on register
export type UserRole = 'ADMIN' | 'PROFESSIONNEL' | 'CLIENT';

export interface User {
  _id: string;
  nom: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;

  createdAt?: string;
  updatedAt?: string;
}

// If you want to type-check what’s in your JWT:
export interface JwtClaims {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
