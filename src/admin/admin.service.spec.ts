import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminService', () => {
  let service: AdminService;
  const contestantFindMany = jest.fn();
  const userFindUnique = jest.fn();
  const userUpdate = jest.fn();
  const auditLogCreate = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn((callback) =>
              callback({
                user: { update: userUpdate },
                adminAuditLog: { create: auditLogCreate },
              }),
            ),
            user: {
              findMany: jest.fn(),
              findUnique: userFindUnique,
              update: jest.fn(),
            },
            contestant: {
              findMany: contestantFindMany,
            },
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('exports contestant and user contact and performance details as CSV', async () => {
    const createdAt = new Date('2026-06-20T10:30:00.000Z');
    contestantFindMany.mockResolvedValue([
      {
        id: 'contestant-1',
        displayName: 'Ada, "The Star"',
        guardianPhone: '+2348000000001',
        status: 'APPROVED',
        isPremium: true,
        totalVotes: 42,
        totalOnlineEngagement: 105,
        createdAt,
        user: {
          phone: '+2348000000002',
          email: 'ada@example.com',
        },
        competition: { title: 'Novo Rivera 2026' },
      },
    ]);

    await expect(service.exportContestantsCsv()).resolves.toBe(
      [
        'id,displayName,guardianPhone,userPhone,userEmail,competitionTitle,status,isPremium,totalVotes,totalOnlineEngagement,createdAt',
        '"contestant-1","Ada, ""The Star""","+2348000000001","+2348000000002","ada@example.com","Novo Rivera 2026","APPROVED","true","42","105","2026-06-20T10:30:00.000Z"',
      ].join('\n'),
    );

    expect(contestantFindMany).toHaveBeenCalledWith({
      include: {
        user: { select: { email: true, phone: true } },
        competition: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('hashes an admin-reset password and records an audit log', async () => {
    userFindUnique.mockResolvedValue({ id: 'user-1' });
    userUpdate.mockResolvedValue({ id: 'user-1' });
    auditLogCreate.mockResolvedValue({ id: 'audit-1' });

    await expect(
      service.resetUserPassword(
        'user-1',
        'TemporaryPassword123!',
        'admin-1',
      ),
    ).resolves.toEqual({ message: 'Password reset successfully.' });

    expect(userFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: expect.any(String) },
    });
    const passwordHash = userUpdate.mock.calls[0][0].data.passwordHash;
    await expect(
      bcrypt.compare('TemporaryPassword123!', passwordHash),
    ).resolves.toBe(true);
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: {
        actorId: 'admin-1',
        action: 'USER_PASSWORD_RESET',
        entity: 'User',
        entityId: 'user-1',
      },
    });
  });
});
