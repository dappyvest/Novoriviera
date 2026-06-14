import { UserRole } from '@prisma/client';

export type CurrentUserPayload = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
