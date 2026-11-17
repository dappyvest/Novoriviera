
import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }

  if (password.length < 12) {
    throw new Error('Admin password must be at least 12 characters');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.user.updateMany({
    where: {
      email,
      role: UserRole.SUPER_ADMIN,
    },
    data: {
      passwordHash,
    },
  });

  if (result.count !== 1) {
    throw new Error(
      `Expected one SUPER_ADMIN account, updated ${result.count}`,
    );
  }

  console.log('SUPER_ADMIN password successfully reset.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

