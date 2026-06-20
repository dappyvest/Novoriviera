import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CompetitionStatus,
  CoinTransactionType,
  ContactMessageStatus,
  ContestantStatus,
  PaymentProvider,
  PaymentStatus,
  StageStatus,
  SubmissionStatus,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { createHmac } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';

process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/novorivera_test?schema=public';
process.env.JWT_SECRET ??= 'test-jwt-secret-with-at-least-32-characters';
process.env.JWT_EXPIRES_IN ??= '1d';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_mock_secret';
process.env.APP_FRONTEND_URL = 'http://localhost:3000';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-api-key';
process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
process.env.CLOUDINARY_UPLOAD_FOLDER = 'novorivera-test';
process.env.MAX_UPLOAD_SIZE_MB = '100';
process.env.PORT = '3000';

type MockUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MockCompetition = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  bannerUrl: string | null;
  status: CompetitionStatus;
  prizeFirst: string | null;
  prizeSecond: string | null;
  prizeThird: string | null;
  ownerId?: string;
  createdAt: Date;
  updatedAt: Date;
};

type MockStage = {
  id: string;
  title: string;
  stageNumber: number;
  competitionId: string;
  status: StageStatus;
  submissionStartDate: Date | null;
  submissionEndDate: Date | null;
  eliminationPercentage: number;
  votingStartDate: Date | null;
  votingEndDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockContestant = {
  id: string;
  userId: string;
  competitionId: string;
  displayName: string;
  bio: string | null;
  status: ContestantStatus;
  isPremium: boolean;
  premiumExpiresAt: Date | null;
  totalVotes: number;
  totalOnlineEngagement: number;
  createdAt: Date;
  updatedAt: Date;
};

type MockSubmission = {
  id: string;
  contestantId: string;
  stageId: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  uploadUrl: string | null;
  status: SubmissionStatus;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  externalVideoUrl: string | null;
  thumbnailUrl: string | null;
  cloudinaryPublicId: string | null;
  cloudinarySecureUrl: string | null;
  uploadedFileMeta: unknown | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockWallet = {
  id: string;
  userId: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
};

type MockCoinTransaction = {
  id: string;
  walletId: string;
  userId: string | null;
  amount: number;
  type: CoinTransactionType;
  description: string | null;
  createdAt: Date;
};

type MockVote = {
  id: string;
  userId: string;
  contestantId: string;
  stageId: string;
  competitionId: string;
  source: 'COIN';
  quantity: number;
  createdAt: Date;
};

type MockCoinPackage = {
  id: string;
  name: string;
  priceNaira: number;
  coins: number;
  bonusCoins: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type MockPayment = {
  id: string;
  userId: string;
  coinPackageId: string;
  provider: PaymentProvider;
  reference: string;
  amountNaira: number;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  status: PaymentStatus;
  providerResponse: unknown;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockSiteSettings = {
  id: string;
  singletonKey: string;
  siteName: string;
  siteTagline: string;
  aboutTitle: string;
  aboutContent: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  termsUrl: string | null;
  privacyUrl: string | null;
};

type MockHomepageContent = {
  id: string;
  singletonKey: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string | null;
  primaryCtaText: string;
  primaryCtaUrl: string;
  secondaryCtaText: string | null;
  secondaryCtaUrl: string | null;
  featuredCompetitionId: string | null;
  announcementText: string | null;
  announcementIsActive: boolean;
};

type MockFaq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MockSponsor = {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MockCompetitionRules = {
  id: string;
  singletonKey: string;
  title: string;
  content: string;
  isActive: boolean;
};

type MockContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: Date;
  updatedAt: Date;
};

type MockEngagementBreakdown = {
  id: string;
  contestantId: string;
  stageId: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchScore: number;
  total: number;
  platform: string | null;
  note: string | null;
  createdAt: Date;
};

type MockCompetitionWinner = {
  id: string;
  competitionId: string;
  contestantId: string;
  placement: string;
  prizeAmount: string | null;
  totalVotes: number;
  totalOnlineEngagement: number;
  engagementScore: number;
  tokenScore: number;
  combinedScore: number;
  declaredAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type MockAdminAuditLog = {
  id: string;
  actorId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date;
};

describe('NovoRivera competition, wallet, and voting engine (e2e)', () => {
  let app: INestApplication<App>;
  const users: MockUser[] = [];
  const competitions: MockCompetition[] = [];
  const stages: MockStage[] = [];
  const contestants: MockContestant[] = [];
  const submissions: MockSubmission[] = [];
  const wallets: MockWallet[] = [];
  const coinTransactions: MockCoinTransaction[] = [];
  const votes: MockVote[] = [];
  const coinPackages: MockCoinPackage[] = [];
  const payments: MockPayment[] = [];
  const siteSettings: MockSiteSettings[] = [];
  const homepageContent: MockHomepageContent[] = [];
  const faqs: MockFaq[] = [];
  const sponsors: MockSponsor[] = [];
  const competitionRules: MockCompetitionRules[] = [];
  const contactMessages: MockContactMessage[] = [];
  const engagementBreakdowns: MockEngagementBreakdown[] = [];
  const competitionWinners: MockCompetitionWinner[] = [];
  const adminAuditLogs: MockAdminAuditLog[] = [];

  const prismaMock = {
    $transaction: jest.fn((callback: (tx: any) => unknown) =>
      callback(prismaMock),
    ),
    user: {
      findUnique: jest.fn(({ where }: { where: { id?: string; email?: string } }) =>
        Promise.resolve(
          users.find(
            (user) => user.id === where.id || user.email === where.email,
          ) ?? null,
        ),
      ),
      findMany: jest.fn(() => Promise.resolve([...users])),
      create: jest.fn(({ data }) => {
        const user: MockUser = {
          id: `user-${users.length + 1}`,
          name: data.name,
          email: data.email,
          phone: data.phone ?? null,
          passwordHash: data.passwordHash,
          role: data.role ?? UserRole.USER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        users.push(user);
        wallets.push({
          id: `wallet-${wallets.length + 1}`,
          userId: user.id,
          balance: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return Promise.resolve(user);
      }),
      update: jest.fn(({ where, data }) => {
        const user = users.find((item) => item.id === where.id);
        if (!user) throw new Error('not found');
        Object.assign(user, data, { updatedAt: new Date() });
        return Promise.resolve(user);
      }),
      updateMany: jest.fn(({ where, data }) => {
        users
          .filter((user) => user.id === where.id && user.role === where.role)
          .forEach((user) => Object.assign(user, data));
        return Promise.resolve({ count: 1 });
      }),
    },
    competition: {
      create: jest.fn(({ data }) => {
        const competition: MockCompetition = {
          id: `competition-${competitions.length + 1}`,
          title: data.title,
          slug: data.slug,
          description: data.description ?? null,
          bannerUrl: data.bannerUrl ?? null,
          status: data.status ?? CompetitionStatus.DRAFT,
          prizeFirst: data.prizeFirst ?? null,
          prizeSecond: data.prizeSecond ?? null,
          prizeThird: data.prizeThird ?? null,
          ownerId: data.ownerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        competitions.push(competition);
        return Promise.resolve(competition);
      }),
      findMany: jest.fn(({ where } = {}) => {
        const result = where?.status?.in
          ? competitions.filter((item) => where.status.in.includes(item.status))
          : competitions;
        return Promise.resolve([...result]);
      }),
      findFirst: jest.fn(({ where }) =>
        Promise.resolve(
          competitions.find((item) => {
            if (where.id && item.id !== where.id) return false;
            if (where.status?.in && !where.status.in.includes(item.status)) return false;
            return true;
          }) ?? null,
        ),
      ),
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(competitions.find((item) => item.id === where.id) ?? null),
      ),
      update: jest.fn(({ where, data }) => {
        const competition = competitions.find((item) => item.id === where.id);
        if (!competition) throw new Error('not found');
        Object.assign(competition, data, { updatedAt: new Date() });
        return Promise.resolve(competition);
      }),
      delete: jest.fn(({ where }) => {
        const index = competitions.findIndex((item) => item.id === where.id);
        const [competition] = competitions.splice(index, 1);
        return Promise.resolve(competition);
      }),
    },
    stage: {
      create: jest.fn(({ data }) => {
        const stage: MockStage = {
          id: `stage-${stages.length + 1}`,
          title: data.title,
          stageNumber: data.stageNumber,
          competitionId: data.competitionId,
          status: data.status ?? StageStatus.UPCOMING,
          submissionStartDate: data.submissionStartDate ?? null,
          submissionEndDate: data.submissionEndDate ?? null,
          votingStartDate: data.votingStartDate ?? null,
          votingEndDate: data.votingEndDate ?? null,
          eliminationPercentage: data.eliminationPercentage ?? 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        stages.push(stage);
        return Promise.resolve(stage);
      }),
      findMany: jest.fn(({ where }) =>
        Promise.resolve(stages.filter((stage) => stage.competitionId === where.competitionId)),
      ),
      findFirst: jest.fn(({ where }) =>
        Promise.resolve(
          stages.find(
            (stage) =>
              stage.competitionId === where.competitionId &&
              stage.status === where.status &&
              (!where.id?.not || stage.id !== where.id.not),
          ) ?? null,
        ),
      ),
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(stages.find((stage) => stage.id === where.id) ?? null),
      ),
      update: jest.fn(({ where, data }) => {
        const stage = stages.find((item) => item.id === where.id);
        if (!stage) throw new Error('not found');
        Object.assign(stage, data, { updatedAt: new Date() });
        return Promise.resolve(stage);
      }),
      delete: jest.fn(({ where }) => {
        const index = stages.findIndex((item) => item.id === where.id);
        const [stage] = stages.splice(index, 1);
        return Promise.resolve(stage);
      }),
    },
    contestant: {
      findUnique: jest.fn(({ where }) => {
        if (where.id) {
          return Promise.resolve(contestants.find((item) => item.id === where.id) ?? null);
        }
        return Promise.resolve(
          contestants.find(
            (item) =>
              item.competitionId === where.competitionId_userId.competitionId &&
              item.userId === where.competitionId_userId.userId,
          ) ?? null,
        );
      }),
      findMany: jest.fn(({ where } = {}) => {
        let result = [...contestants];
        if (where?.userId) result = result.filter((item) => item.userId === where.userId);
        if (where?.competitionId) {
          result = result.filter((item) => item.competitionId === where.competitionId);
        }
        if (where?.status) result = result.filter((item) => item.status === where.status);
        return Promise.resolve(
          result.map((contestant) => ({
            ...contestant,
            user: users.find((item) => item.id === contestant.userId),
            competition: competitions.find(
              (item) => item.id === contestant.competitionId,
            ),
            submissions: submissions
              .filter(
                (submission) =>
                  submission.contestantId === contestant.id &&
                  submission.status === SubmissionStatus.APPROVED,
              )
              .slice(0, 1),
          })),
        );
      }),
      findFirst: jest.fn(({ where }) => {
        const contestant = contestants.find((item) => {
          if (where.id && item.id !== where.id) return false;
          if (where.status && item.status !== where.status) return false;
          return true;
        });
        if (!contestant) return Promise.resolve(null);
        return Promise.resolve({
          ...contestant,
          competition: competitions.find((item) => item.id === contestant.competitionId),
          submissions: submissions
            .filter(
              (submission) =>
                submission.contestantId === contestant.id &&
                submission.status === SubmissionStatus.APPROVED,
            )
            .slice(0, 1),
        });
      }),
      create: jest.fn(({ data }) => {
        const contestant: MockContestant = {
          id: `contestant-${contestants.length + 1}`,
          userId: data.userId,
          competitionId: data.competitionId,
          displayName: data.displayName,
          bio: data.bio ?? null,
          status: data.status ?? ContestantStatus.PENDING,
          isPremium: false,
          premiumExpiresAt: null,
          totalVotes: 0,
          totalOnlineEngagement: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        contestants.push(contestant);
        return Promise.resolve(contestant);
      }),
      update: jest.fn(({ where, data }) => {
        const contestant = contestants.find((item) => item.id === where.id);
        if (!contestant) throw new Error('not found');
        if (data.totalVotes?.increment) {
          contestant.totalVotes += data.totalVotes.increment;
          delete data.totalVotes;
        }
        if (data.totalOnlineEngagement?.increment) {
          contestant.totalOnlineEngagement += data.totalOnlineEngagement.increment;
          delete data.totalOnlineEngagement;
        }
        Object.assign(contestant, data, { updatedAt: new Date() });
        return Promise.resolve(contestant);
      }),
      updateMany: jest.fn(({ where, data }) => {
        contestants
          .filter((item) => where.id.in.includes(item.id))
          .forEach((item) => Object.assign(item, data));
        return Promise.resolve({ count: where.id.in.length });
      }),
    },
    submission: {
      create: jest.fn(({ data }) => {
        const submission: MockSubmission = {
          id: `submission-${submissions.length + 1}`,
          contestantId: data.contestantId,
          stageId: data.stageId,
          title: data.title,
          description: data.description ?? null,
          videoUrl: data.videoUrl ?? null,
          uploadUrl: data.uploadUrl ?? null,
          status: SubmissionStatus.PENDING,
          youtubeUrl: data.youtubeUrl ?? null,
          tiktokUrl: data.tiktokUrl ?? null,
          facebookUrl: data.facebookUrl ?? null,
          instagramUrl: data.instagramUrl ?? null,
          externalVideoUrl: data.externalVideoUrl ?? null,
          thumbnailUrl: data.thumbnailUrl ?? null,
          cloudinaryPublicId: data.cloudinaryPublicId ?? null,
          cloudinarySecureUrl: data.cloudinarySecureUrl ?? null,
          uploadedFileMeta: data.uploadedFileMeta ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        submissions.push(submission);
        return Promise.resolve(submission);
      }),
      findMany: jest.fn(({ where } = {}) => {
        let result = [...submissions];
        if (where?.stageId) result = result.filter((item) => item.stageId === where.stageId);
        if (where?.status) result = result.filter((item) => item.status === where.status);
        if (where?.contestant?.userId) {
          const contestantIds = contestants
            .filter((item) => item.userId === where.contestant.userId)
            .map((item) => item.id);
          result = result.filter((item) => contestantIds.includes(item.contestantId));
        }
        return Promise.resolve(
          result.map((submission) => ({
            ...submission,
            contestant: contestants.find((item) => item.id === submission.contestantId),
            stage: stages.find((item) => item.id === submission.stageId),
          })),
        );
      }),
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(submissions.find((item) => item.id === where.id) ?? null),
      ),
      update: jest.fn(({ where, data }) => {
        const submission = submissions.find((item) => item.id === where.id);
        if (!submission) throw new Error('not found');
        Object.assign(submission, data, { updatedAt: new Date() });
        return Promise.resolve(submission);
      }),
    },
    coinWallet: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(
          wallets.find(
            (wallet) => wallet.id === where.id || wallet.userId === where.userId,
          ) ?? null,
        ),
      ),
      findMany: jest.fn(() => Promise.resolve([...wallets])),
      create: jest.fn(({ data }) => {
        const wallet: MockWallet = {
          id: `wallet-${wallets.length + 1}`,
          userId: data.userId,
          balance: data.balance ?? 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        wallets.push(wallet);
        return Promise.resolve(wallet);
      }),
      update: jest.fn(({ where, data }) => {
        const wallet = wallets.find((item) => item.id === where.id);
        if (!wallet) throw new Error('not found');
        if (data.balance?.increment) {
          wallet.balance += data.balance.increment;
          delete data.balance;
        }
        Object.assign(wallet, data, { updatedAt: new Date() });
        return Promise.resolve(wallet);
      }),
    },
    coinTransaction: {
      create: jest.fn(({ data }) => {
        const transaction: MockCoinTransaction = {
          id: `coin-transaction-${coinTransactions.length + 1}`,
          walletId: data.walletId,
          userId: data.userId ?? null,
          amount: data.amount,
          type: data.type,
          description: data.description ?? null,
          createdAt: new Date(),
        };
        coinTransactions.push(transaction);
        return Promise.resolve(transaction);
      }),
      findMany: jest.fn(({ where } = {}) => {
        let result = [...coinTransactions];
        if (where?.walletId) result = result.filter((item) => item.walletId === where.walletId);
        return Promise.resolve(result);
      }),
    },
    vote: {
      create: jest.fn(({ data }) => {
        const vote: MockVote = {
          id: `vote-${votes.length + 1}`,
          userId: data.userId,
          contestantId: data.contestantId,
          stageId: data.stageId,
          competitionId: data.competitionId,
          source: data.source,
          quantity: data.quantity,
          createdAt: new Date(),
        };
        votes.push(vote);
        return Promise.resolve(vote);
      }),
      findMany: jest.fn(({ where } = {}) => {
        let result = [...votes];
        if (where?.contestantId) result = result.filter((item) => item.contestantId === where.contestantId);
        if (where?.stageId) result = result.filter((item) => item.stageId === where.stageId);
        return Promise.resolve(
          result.map((vote) => ({
            ...vote,
            user: users.find((item) => item.id === vote.userId),
            contestant: contestants.find((item) => item.id === vote.contestantId),
            stage: stages.find((item) => item.id === vote.stageId),
            competition: competitions.find((item) => item.id === vote.competitionId),
          })),
        );
      }),
    },
    coinPackage: {
      create: jest.fn(({ data }) => {
        const coinPackage: MockCoinPackage = {
          id: `coin-package-${coinPackages.length + 1}`,
          name: data.name,
          priceNaira: data.priceNaira,
          coins: data.coins,
          bonusCoins: data.bonusCoins ?? 0,
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder ?? 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        coinPackages.push(coinPackage);
        return Promise.resolve(coinPackage);
      }),
      findMany: jest.fn(({ where } = {}) => {
        const result = where?.isActive
          ? coinPackages.filter((item) => item.isActive === where.isActive)
          : coinPackages;
        return Promise.resolve([...result]);
      }),
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(coinPackages.find((item) => item.id === where.id) ?? null),
      ),
      update: jest.fn(({ where, data }) => {
        const coinPackage = coinPackages.find((item) => item.id === where.id);
        if (!coinPackage) throw new Error('not found');
        Object.assign(coinPackage, data, { updatedAt: new Date() });
        return Promise.resolve(coinPackage);
      }),
      delete: jest.fn(({ where }) => {
        const index = coinPackages.findIndex((item) => item.id === where.id);
        const [coinPackage] = coinPackages.splice(index, 1);
        return Promise.resolve(coinPackage);
      }),
    },
    payment: {
      create: jest.fn(({ data }) => {
        const payment: MockPayment = {
          id: `payment-${payments.length + 1}`,
          userId: data.userId,
          coinPackageId: data.coinPackageId,
          provider: data.provider ?? PaymentProvider.PAYSTACK,
          reference: data.reference,
          amountNaira: data.amountNaira,
          coins: data.coins,
          bonusCoins: data.bonusCoins ?? 0,
          totalCoins: data.totalCoins,
          status: data.status ?? PaymentStatus.PENDING,
          providerResponse: data.providerResponse ?? null,
          paidAt: data.paidAt ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        payments.push(payment);
        return Promise.resolve(payment);
      }),
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(
          payments.find(
            (payment) => payment.id === where.id || payment.reference === where.reference,
          ) ?? null,
        ),
      ),
      findUniqueOrThrow: jest.fn(({ where }) => {
        const payment = payments.find(
          (item) => item.id === where.id || item.reference === where.reference,
        );
        if (!payment) throw new Error('not found');
        return Promise.resolve(payment);
      }),
      findMany: jest.fn(({ where } = {}) => {
        const result = where?.userId
          ? payments.filter((payment) => payment.userId === where.userId)
          : payments;
        return Promise.resolve(
          result.map((payment) => ({
            ...payment,
            user: users.find((item) => item.id === payment.userId),
            coinPackage: coinPackages.find(
              (item) => item.id === payment.coinPackageId,
            ),
          })),
        );
      }),
      update: jest.fn(({ where, data }) => {
        const payment = payments.find(
          (item) => item.id === where.id || item.reference === where.reference,
        );
        if (!payment) throw new Error('not found');
        Object.assign(payment, data, { updatedAt: new Date() });
        return Promise.resolve(payment);
      }),
      updateMany: jest.fn(({ where, data }) => {
        const payment = payments.find((item) => item.id === where.id);
        if (!payment) return Promise.resolve({ count: 0 });
        if (where.status?.not && payment.status === where.status.not) {
          return Promise.resolve({ count: 0 });
        }
        Object.assign(payment, data, { updatedAt: new Date() });
        return Promise.resolve({ count: 1 });
      }),
    },
    engagementBreakdown: {
      create: jest.fn(({ data }) => {
        const record: MockEngagementBreakdown = {
          id: `engagement-${engagementBreakdowns.length + 1}`,
          contestantId: data.contestantId,
          stageId: data.stageId ?? null,
          views: data.views ?? 0,
          likes: data.likes ?? 0,
          comments: data.comments ?? 0,
          shares: data.shares ?? 0,
          watchScore: data.watchScore ?? 0,
          total: data.total,
          platform: data.platform ?? null,
          note: data.note ?? null,
          createdAt: new Date(),
        };
        engagementBreakdowns.push(record);
        return Promise.resolve(record);
      }),
    },
    competitionWinner: {
      findMany: jest.fn(({ where } = {}) => {
        const result = where?.competitionId
          ? competitionWinners.filter(
              (winner) => winner.competitionId === where.competitionId,
            )
          : competitionWinners;
        return Promise.resolve(
          result.map((winner) => ({
            ...winner,
            contestant: contestants.find(
              (item) => item.id === winner.contestantId,
            ),
            competition: competitions.find(
              (item) => item.id === winner.competitionId,
            ),
          })),
        );
      }),
      deleteMany: jest.fn(({ where }) => {
        for (let index = competitionWinners.length - 1; index >= 0; index -= 1) {
          if (competitionWinners[index].competitionId === where.competitionId) {
            competitionWinners.splice(index, 1);
          }
        }
        return Promise.resolve({ count: 0 });
      }),
      create: jest.fn(({ data }) => {
        const winner: MockCompetitionWinner = {
          id: `winner-${competitionWinners.length + 1}`,
          competitionId: data.competitionId,
          contestantId: data.contestantId,
          placement: data.placement,
          prizeAmount: data.prizeAmount ?? null,
          totalVotes: data.totalVotes,
          totalOnlineEngagement: data.totalOnlineEngagement,
          engagementScore: data.engagementScore,
          tokenScore: data.tokenScore,
          combinedScore: data.combinedScore,
          declaredAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        competitionWinners.push(winner);
        return Promise.resolve({
          ...winner,
          contestant: contestants.find((item) => item.id === winner.contestantId),
          competition: competitions.find((item) => item.id === winner.competitionId),
        });
      }),
    },
    adminAuditLog: {
      create: jest.fn(({ data }) => {
        const record: MockAdminAuditLog = {
          id: `audit-${adminAuditLogs.length + 1}`,
          actorId: data.actorId ?? null,
          action: data.action,
          entity: data.entity ?? null,
          entityId: data.entityId ?? null,
          metadata: data.metadata ?? null,
          createdAt: new Date(),
        };
        adminAuditLogs.push(record);
        return Promise.resolve(record);
      }),
      findMany: jest.fn(({ where, skip = 0, take = 20 } = {}) => {
        const result = where?.action
          ? adminAuditLogs.filter((log) => log.action === where.action)
          : adminAuditLogs;
        return Promise.resolve(
          result.slice(skip, skip + take).map((log) => ({
            ...log,
            actor: users.find((user) => user.id === log.actorId),
          })),
        );
      }),
      count: jest.fn(({ where } = {}) =>
        Promise.resolve(
          where?.action
            ? adminAuditLogs.filter((log) => log.action === where.action).length
            : adminAuditLogs.length,
        ),
      ),
    },
    siteSettings: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(
          siteSettings.find((item) => item.singletonKey === where.singletonKey) ?? null,
        ),
      ),
      create: jest.fn(({ data }) => {
        const record: MockSiteSettings = {
          id: `site-settings-${siteSettings.length + 1}`,
          singletonKey: data.singletonKey ?? 'default',
          siteName: data.siteName,
          siteTagline: data.siteTagline,
          aboutTitle: data.aboutTitle,
          aboutContent: data.aboutContent,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          whatsappNumber: data.whatsappNumber,
          facebookUrl: data.facebookUrl,
          instagramUrl: data.instagramUrl,
          tiktokUrl: data.tiktokUrl,
          youtubeUrl: data.youtubeUrl,
          termsUrl: data.termsUrl ?? null,
          privacyUrl: data.privacyUrl ?? null,
        };
        siteSettings.push(record);
        return Promise.resolve(record);
      }),
      update: jest.fn(({ where, data }) => {
        const record = siteSettings.find((item) => item.singletonKey === where.singletonKey);
        if (!record) throw new Error('not found');
        Object.assign(record, data);
        return Promise.resolve(record);
      }),
    },
    homepageContent: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(
          homepageContent.find((item) => item.singletonKey === where.singletonKey) ?? null,
        ),
      ),
      create: jest.fn(({ data }) => {
        const record: MockHomepageContent = {
          id: `homepage-${homepageContent.length + 1}`,
          singletonKey: data.singletonKey ?? 'default',
          heroTitle: data.heroTitle,
          heroSubtitle: data.heroSubtitle,
          heroImageUrl: data.heroImageUrl ?? null,
          primaryCtaText: data.primaryCtaText,
          primaryCtaUrl: data.primaryCtaUrl,
          secondaryCtaText: data.secondaryCtaText ?? null,
          secondaryCtaUrl: data.secondaryCtaUrl ?? null,
          featuredCompetitionId: data.featuredCompetitionId ?? null,
          announcementText: data.announcementText ?? null,
          announcementIsActive: data.announcementIsActive ?? false,
        };
        homepageContent.push(record);
        return Promise.resolve(record);
      }),
      update: jest.fn(({ where, data }) => {
        const record = homepageContent.find((item) => item.singletonKey === where.singletonKey);
        if (!record) throw new Error('not found');
        Object.assign(record, data);
        return Promise.resolve(record);
      }),
    },
    competitionRules: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(
          competitionRules.find((item) => item.singletonKey === where.singletonKey) ?? null,
        ),
      ),
      create: jest.fn(({ data }) => {
        const record: MockCompetitionRules = {
          id: `rules-${competitionRules.length + 1}`,
          singletonKey: data.singletonKey ?? 'default',
          title: data.title,
          content: data.content,
          isActive: data.isActive ?? true,
        };
        competitionRules.push(record);
        return Promise.resolve(record);
      }),
      update: jest.fn(({ where, data }) => {
        const record = competitionRules.find((item) => item.singletonKey === where.singletonKey);
        if (!record) throw new Error('not found');
        Object.assign(record, data);
        return Promise.resolve(record);
      }),
    },
    faq: {
      create: jest.fn(({ data }) => {
        const faq: MockFaq = {
          id: `faq-${faqs.length + 1}`,
          question: data.question,
          answer: data.answer,
          sortOrder: data.sortOrder ?? 0,
          isActive: data.isActive ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        faqs.push(faq);
        return Promise.resolve(faq);
      }),
      findMany: jest.fn(({ where } = {}) => {
        const result = where?.isActive
          ? faqs.filter((faq) => faq.isActive === where.isActive)
          : faqs;
        return Promise.resolve([...result].sort((a, b) => a.sortOrder - b.sortOrder));
      }),
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(faqs.find((faq) => faq.id === where.id) ?? null),
      ),
      update: jest.fn(({ where, data }) => {
        const faq = faqs.find((item) => item.id === where.id);
        if (!faq) throw new Error('not found');
        Object.assign(faq, data, { updatedAt: new Date() });
        return Promise.resolve(faq);
      }),
      delete: jest.fn(({ where }) => {
        const index = faqs.findIndex((item) => item.id === where.id);
        const [faq] = faqs.splice(index, 1);
        return Promise.resolve(faq);
      }),
    },
    sponsor: {
      create: jest.fn(({ data }) => {
        const sponsor: MockSponsor = {
          id: `sponsor-${sponsors.length + 1}`,
          name: data.name,
          logoUrl: data.logoUrl ?? null,
          websiteUrl: data.websiteUrl ?? null,
          sortOrder: data.sortOrder ?? 0,
          isActive: data.isActive ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        sponsors.push(sponsor);
        return Promise.resolve(sponsor);
      }),
      findMany: jest.fn(({ where } = {}) => {
        const result = where?.isActive
          ? sponsors.filter((sponsor) => sponsor.isActive === where.isActive)
          : sponsors;
        return Promise.resolve([...result].sort((a, b) => a.sortOrder - b.sortOrder));
      }),
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(sponsors.find((sponsor) => sponsor.id === where.id) ?? null),
      ),
      update: jest.fn(({ where, data }) => {
        const sponsor = sponsors.find((item) => item.id === where.id);
        if (!sponsor) throw new Error('not found');
        Object.assign(sponsor, data, { updatedAt: new Date() });
        return Promise.resolve(sponsor);
      }),
      delete: jest.fn(({ where }) => {
        const index = sponsors.findIndex((item) => item.id === where.id);
        const [sponsor] = sponsors.splice(index, 1);
        return Promise.resolve(sponsor);
      }),
    },
    contactMessage: {
      create: jest.fn(({ data }) => {
        const message: MockContactMessage = {
          id: `contact-${contactMessages.length + 1}`,
          name: data.name,
          email: data.email,
          phone: data.phone ?? null,
          subject: data.subject,
          message: data.message,
          status: ContactMessageStatus.NEW,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        contactMessages.push(message);
        return Promise.resolve(message);
      }),
      findMany: jest.fn(() => Promise.resolve([...contactMessages])),
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(contactMessages.find((message) => message.id === where.id) ?? null),
      ),
      update: jest.fn(({ where, data }) => {
        const message = contactMessages.find((item) => item.id === where.id);
        if (!message) throw new Error('not found');
        Object.assign(message, data, { updatedAt: new Date() });
        return Promise.resolve(message);
      }),
    },
  };

  beforeEach(async () => {
    users.length = 0;
    competitions.length = 0;
    stages.length = 0;
    contestants.length = 0;
    submissions.length = 0;
    wallets.length = 0;
    coinTransactions.length = 0;
    votes.length = 0;
    coinPackages.length = 0;
    payments.length = 0;
    siteSettings.length = 0;
    homepageContent.length = 0;
    faqs.length = 0;
    sponsors.length = 0;
    competitionRules.length = 0;
    contactMessages.length = 0;
    engagementBreakdowns.length = 0;
    competitionWinners.length = 0;
    adminAuditLogs.length = 0;
    jest.clearAllMocks();
    jest.spyOn(global, 'fetch').mockReset();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppModule } = require('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await app?.close();
  });

  async function registerUser(email: string) {
    return request(app.getHttpServer()).post('/api/auth/register').send({
      name: email.includes('admin') ? 'Admin User' : 'Jane Rivera',
      email,
      password: 'password123',
    });
  }

  it('runs the competition, contestant, submission, and leaderboard flow', async () => {
    const adminAuth = await registerUser('admin@example.com');
    users[0].role = UserRole.SUPER_ADMIN;

    await request(app.getHttpServer())
      .post('/api/admin/coin-packages')
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({
        name: 'Starter Pack',
        priceNaira: 1000,
        coins: 100,
        bonusCoins: 10,
        sortOrder: 1,
      })
      .expect(201);

    const competitionResponse = await request(app.getHttpServer())
      .post('/api/competitions')
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({
        title: 'Novo Talent 2026',
        slug: 'novo-talent-2026',
        status: CompetitionStatus.PUBLISHED,
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-08-01T00:00:00.000Z',
      })
      .expect(201);

    const stageResponse = await request(app.getHttpServer())
      .post(`/api/competitions/${competitionResponse.body.id}/stages`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({
        title: 'Auditions',
        stageNumber: 1,
        status: StageStatus.ACTIVE,
        submissionStartDate: '2020-01-01T00:00:00.000Z',
        submissionEndDate: '2030-01-01T00:00:00.000Z',
        votingStartDate: '2020-01-01T00:00:00.000Z',
        votingEndDate: '2030-01-01T00:00:00.000Z',
      })
      .expect(201);

    const userAuth = await registerUser('jane@example.com');

    const zeroWalletResponse = await request(app.getHttpServer())
      .get('/api/wallet/me')
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .expect(200);

    expect(zeroWalletResponse.body.balance).toBe(0);

    const contestantResponse = await request(app.getHttpServer())
      .post(`/api/competitions/${competitionResponse.body.id}/contestants`)
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .send({
        displayName: 'Jane Star',
        bio: 'Singer',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/admin/contestants/${contestantResponse.body.id}/status`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({ status: ContestantStatus.APPROVED })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/admin/wallets/${users[1].id}/adjust`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({ amount: 10, reason: 'Test credit' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/stages/${stageResponse.body.id}/submissions`)
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .send({
        title: 'My audition entry',
        videoUrl: 'https://example.com/video.mp4',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/votes/cast')
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .send({
        contestantId: contestantResponse.body.id,
        stageId: stageResponse.body.id,
        coinsToSpend: 5,
      })
      .expect(201);

    const debitedWalletResponse = await request(app.getHttpServer())
      .get('/api/wallet/me')
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .expect(200);

    expect(debitedWalletResponse.body.balance).toBe(5);

    await request(app.getHttpServer())
      .post('/api/votes/cast')
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .send({
        contestantId: contestantResponse.body.id,
        stageId: stageResponse.body.id,
        coinsToSpend: 50,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/admin/wallets/${users[1].id}/adjust`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({ amount: -50, reason: 'Invalid negative adjustment' })
      .expect(400);

    const leaderboardResponse = await request(app.getHttpServer())
      .get(`/api/competitions/${competitionResponse.body.id}/leaderboard?mode=votes`)
      .expect(200);

    expect(leaderboardResponse.body).toHaveLength(1);
    expect(leaderboardResponse.body[0]).toMatchObject({
      rank: 1,
      contestantId: contestantResponse.body.id,
      displayName: 'Jane Star',
      status: ContestantStatus.APPROVED,
      totalVotes: 5,
    });
  });

  it('forbids normal users from admin wallet endpoints', async () => {
    const userAuth = await registerUser('jane@example.com');

    await request(app.getHttpServer())
      .get('/api/admin/wallets')
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/admin/exports/contestants.csv')
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .expect(403);
  });

  it('supports public stage discovery and audited admin password resets', async () => {
    const adminAuth = await registerUser('admin@example.com');
    users[0].role = UserRole.ADMIN;
    const userAuth = await registerUser('reset-user@example.com');

    const competitionResponse = await request(app.getHttpServer())
      .post('/api/competitions')
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({
        title: 'Live QA Competition',
        slug: 'live-qa-competition',
        status: CompetitionStatus.PUBLISHED,
      })
      .expect(201);

    const stageResponse = await request(app.getHttpServer())
      .post(`/api/competitions/${competitionResponse.body.id}/stages`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({
        title: 'Open Auditions',
        stageNumber: 1,
        status: StageStatus.ACTIVE,
        submissionStartDate: '2020-01-01T00:00:00.000Z',
        submissionEndDate: '2099-01-01T00:00:00.000Z',
        votingStartDate: '2020-01-01T00:00:00.000Z',
        votingEndDate: '2099-01-01T00:00:00.000Z',
      })
      .expect(201);

    const stagesResponse = await request(app.getHttpServer())
      .get(`/api/competitions/${competitionResponse.body.id}/stages`)
      .expect(200);

    expect(stagesResponse.body).toEqual([
      expect.objectContaining({
        id: stageResponse.body.id,
        title: 'Open Auditions',
        stageNumber: 1,
        status: StageStatus.ACTIVE,
        isActive: true,
        isSubmissionOpen: true,
        isSubmissionClosed: false,
        isVotingOpen: true,
        isVotingClosed: false,
      }),
    ]);

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${users[1].id}/password`)
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .send({ newPassword: 'TemporaryPassword123!' })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${users[1].id}/password`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({ newPassword: 'weakpassword' })
      .expect(400);

    const resetResponse = await request(app.getHttpServer())
      .patch(`/api/admin/users/${users[1].id}/password`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({ newPassword: 'TemporaryPassword123!' })
      .expect(200);

    expect(resetResponse.body).toEqual({
      message: 'Password reset successfully.',
    });

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'reset-user@example.com', password: 'password123' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'reset-user@example.com',
        password: 'TemporaryPassword123!',
      })
      .expect(201);

    const auditResponse = await request(app.getHttpServer())
      .get('/api/admin/audit-logs?action=USER_PASSWORD_RESET')
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .expect(200);

    expect(auditResponse.body).toMatchObject({
      total: 1,
      items: [
        {
          actorId: users[0].id,
          action: 'USER_PASSWORD_RESET',
          entity: 'User',
          entityId: users[1].id,
        },
      ],
    });
  });

  it('supports phase 7 uploads, public profiles, weighted scoring, winners, and password changes', async () => {
    const adminAuth = await registerUser('admin@example.com');
    users[0].role = UserRole.ADMIN;

    const fetchMock = jest.spyOn(global, 'fetch');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        secure_url: 'https://res.cloudinary.com/test/video/upload/entry.mp4',
        public_id: 'novorivera-test/entry',
        resource_type: 'video',
        format: 'mp4',
        bytes: 1024,
        duration: 12.5,
      }),
    } as Response);

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/uploads/video')
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .attach('file', Buffer.from('fake-video'), {
        filename: 'entry.mp4',
        contentType: 'video/mp4',
      })
      .expect(201);

    expect(uploadResponse.body).toMatchObject({
      secureUrl: 'https://res.cloudinary.com/test/video/upload/entry.mp4',
      publicId: 'novorivera-test/entry',
      resourceType: 'video',
      format: 'mp4',
      bytes: 1024,
      duration: 12.5,
    });

    const competitionResponse = await request(app.getHttpServer())
      .post('/api/competitions')
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({
        title: 'Novo Viral Superstar',
        slug: 'novo-viral-superstar',
        status: CompetitionStatus.PUBLISHED,
        prizeFirst: '₦500,000',
        prizeSecond: '₦350,000',
        prizeThird: '₦150,000',
      })
      .expect(201);

    const stageResponse = await request(app.getHttpServer())
      .post(`/api/competitions/${competitionResponse.body.id}/stages`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({
        title: 'Viral Round',
        stageNumber: 1,
        status: StageStatus.ACTIVE,
        submissionStartDate: '2020-01-01T00:00:00.000Z',
        submissionEndDate: '2030-01-01T00:00:00.000Z',
        votingStartDate: '2020-01-01T00:00:00.000Z',
        votingEndDate: '2030-01-01T00:00:00.000Z',
      })
      .expect(201);

    const firstUserAuth = await registerUser('first@example.com');
    const secondUserAuth = await registerUser('second@example.com');

    const firstContestantResponse = await request(app.getHttpServer())
      .post(`/api/competitions/${competitionResponse.body.id}/contestants`)
      .set('Authorization', `Bearer ${firstUserAuth.body.token}`)
      .send({ displayName: 'First Star', bio: 'Performer' })
      .expect(201);

    const secondContestantResponse = await request(app.getHttpServer())
      .post(`/api/competitions/${competitionResponse.body.id}/contestants`)
      .set('Authorization', `Bearer ${secondUserAuth.body.token}`)
      .send({ displayName: 'Second Star' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/admin/contestants/${firstContestantResponse.body.id}/status`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({ status: ContestantStatus.APPROVED })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/admin/contestants/${secondContestantResponse.body.id}/status`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({ status: ContestantStatus.APPROVED })
      .expect(200);

    const submissionResponse = await request(app.getHttpServer())
      .post(`/api/stages/${stageResponse.body.id}/submissions`)
      .set('Authorization', `Bearer ${firstUserAuth.body.token}`)
      .send({
        title: 'Cloudinary entry',
        videoUrl: uploadResponse.body.secureUrl,
        uploadUrl: uploadResponse.body.secureUrl,
        cloudinaryPublicId: uploadResponse.body.publicId,
        cloudinarySecureUrl: uploadResponse.body.secureUrl,
        uploadedFileMeta: { bytes: uploadResponse.body.bytes },
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/admin/submissions/${submissionResponse.body.id}/status`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({ status: SubmissionStatus.APPROVED })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/admin/submissions/${submissionResponse.body.id}/youtube`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({
        youtubeUrl: 'https://youtube.com/watch?v=abc123',
        tiktokUrl: 'https://www.tiktok.com/@novo/video/123',
        facebookUrl: 'https://facebook.com/reel/123',
        instagramUrl: 'https://instagram.com/reel/123',
        externalVideoUrl: 'https://example.com/video',
        thumbnailUrl: 'https://example.com/thumb.jpg',
      })
      .expect(200);

    const publicProfileResponse = await request(app.getHttpServer())
      .get(`/api/contestants/${firstContestantResponse.body.id}`)
      .expect(200);

    expect(publicProfileResponse.body).toMatchObject({
      id: firstContestantResponse.body.id,
      displayName: 'First Star',
      latestApprovedSubmission: {
        youtubeUrl: 'https://youtube.com/watch?v=abc123',
        tiktokUrl: 'https://www.tiktok.com/@novo/video/123',
        facebookUrl: 'https://facebook.com/reel/123',
      },
      shareTitle: 'First Star - Novo Viral Superstar',
    });
    expect(publicProfileResponse.body.user).toBeUndefined();

    await request(app.getHttpServer())
      .post(`/api/admin/contestants/${firstContestantResponse.body.id}/engagement`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({
        stageId: stageResponse.body.id,
        views: 100,
        likes: 25,
        comments: 10,
        shares: 5,
        watchScore: 10,
        platform: 'TIKTOK',
        note: 'Manual import',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/admin/contestants/${secondContestantResponse.body.id}/engagement`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({ onlineEngagementCount: 50 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/admin/wallets/${users[1].id}/adjust`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({ amount: 20, reason: 'Vote credit' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/admin/wallets/${users[2].id}/adjust`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({ amount: 10, reason: 'Vote credit' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/votes/cast')
      .set('Authorization', `Bearer ${firstUserAuth.body.token}`)
      .send({
        contestantId: firstContestantResponse.body.id,
        stageId: stageResponse.body.id,
        coinsToSpend: 10,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/votes/cast')
      .set('Authorization', `Bearer ${secondUserAuth.body.token}`)
      .send({
        contestantId: secondContestantResponse.body.id,
        stageId: stageResponse.body.id,
        coinsToSpend: 10,
      })
      .expect(201);

    const leaderboardResponse = await request(app.getHttpServer())
      .get(
        `/api/competitions/${competitionResponse.body.id}/leaderboard?mode=combined&engagementWeight=50&tokenWeight=50`,
      )
      .expect(200);

    expect(leaderboardResponse.body[0]).toMatchObject({
      contestantId: firstContestantResponse.body.id,
      totalOnlineEngagement: 150,
      engagementScore: 50,
      tokenScore: 50,
      combinedScore: 100,
      rank: 1,
    });

    const winnersResponse = await request(app.getHttpServer())
      .post(`/api/competitions/${competitionResponse.body.id}/declare-winners`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({})
      .expect(201);

    expect(winnersResponse.body[0]).toMatchObject({
      placement: 'FIRST',
      prizeAmount: '₦500,000',
      contestantId: firstContestantResponse.body.id,
    });

    await request(app.getHttpServer())
      .post(`/api/competitions/${competitionResponse.body.id}/declare-winners`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({})
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/competitions/${competitionResponse.body.id}/declare-winners`)
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({ force: true })
      .expect(201);

    const publicWinnersResponse = await request(app.getHttpServer())
      .get(`/api/competitions/${competitionResponse.body.id}/winners`)
      .expect(200);

    expect(publicWinnersResponse.body[0]).toMatchObject({
      placement: 'FIRST',
      prizeAmount: '₦500,000',
    });

    const auditResponse = await request(app.getHttpServer())
      .get('/api/admin/audit-logs?page=1&limit=5&action=ENGAGEMENT_UPDATE')
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .expect(200);

    expect(auditResponse.body.total).toBe(2);

    await request(app.getHttpServer())
      .get('/api/admin/exports/contestants.csv')
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .expect(200)
      .expect('Content-Type', /text\/csv/);

    await request(app.getHttpServer())
      .patch('/api/users/me/password')
      .set('Authorization', `Bearer ${firstUserAuth.body.token}`)
      .send({
        currentPassword: 'password123',
        newPassword: 'newpassword123',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'first@example.com', password: 'password123' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'first@example.com', password: 'newpassword123' })
      .expect(201);
  });

  it('runs Paystack coin purchase verification and webhook idempotently', async () => {
    const adminAuth = await registerUser('admin@example.com');
    users[0].role = UserRole.SUPER_ADMIN;

    const userAuth = await registerUser('jane@example.com');

    const activePackageResponse = await request(app.getHttpServer())
      .post('/api/admin/coin-packages')
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({
        name: 'Starter Pack',
        priceNaira: 1000,
        coins: 100,
        bonusCoins: 10,
        sortOrder: 1,
      })
      .expect(201);

    const inactivePackageResponse = await request(app.getHttpServer())
      .post('/api/admin/coin-packages')
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({
        name: 'Inactive Pack',
        priceNaira: 500,
        coins: 50,
        isActive: false,
        sortOrder: 2,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/payments/coin-purchase/init')
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .send({ coinPackageId: inactivePackageResponse.body.id })
      .expect(404);

    const fetchMock = jest.spyOn(global, 'fetch');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/mock',
          access_code: 'access_mock',
          reference: 'ignored-by-service',
        },
      }),
    } as Response);

    const initResponse = await request(app.getHttpServer())
      .post('/api/payments/coin-purchase/init')
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .send({ coinPackageId: activePackageResponse.body.id })
      .expect(201);

    expect(initResponse.body).toMatchObject({
      authorizationUrl: 'https://checkout.paystack.com/mock',
      accessCode: 'access_mock',
      amountNaira: 1000,
      totalCoins: 110,
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          reference: initResponse.body.reference,
          status: 'success',
        },
      }),
    } as Response);

    await request(app.getHttpServer())
      .get(`/api/payments/verify/${initResponse.body.reference}`)
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .expect(200);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          reference: initResponse.body.reference,
          status: 'success',
        },
      }),
    } as Response);

    await request(app.getHttpServer())
      .get(`/api/payments/verify/${initResponse.body.reference}`)
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .expect(200);

    expect(wallets.find((wallet) => wallet.userId === users[1].id)?.balance).toBe(110);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/mock-2',
          access_code: 'access_mock_2',
          reference: 'ignored-by-service',
        },
      }),
    } as Response);

    const webhookInitResponse = await request(app.getHttpServer())
      .post('/api/payments/coin-purchase/init')
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .send({ coinPackageId: activePackageResponse.body.id })
      .expect(201);

    const webhookPayload = {
      event: 'charge.success',
      data: {
        reference: webhookInitResponse.body.reference,
        status: 'success',
      },
    };
    const rawWebhookBody = JSON.stringify(webhookPayload);
    const signature = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(rawWebhookBody)
      .digest('hex');

    await request(app.getHttpServer())
      .post('/api/payments/webhook/paystack')
      .set('x-paystack-signature', signature)
      .set('Content-Type', 'application/json')
      .send(webhookPayload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/payments/webhook/paystack')
      .set('x-paystack-signature', signature)
      .set('Content-Type', 'application/json')
      .send(webhookPayload)
      .expect(201);

    expect(wallets.find((wallet) => wallet.userId === users[1].id)?.balance).toBe(220);

    await request(app.getHttpServer())
      .get('/api/admin/payments')
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .expect(403);
  });

  it('supports public and admin CMS flows', async () => {
    const defaultSettingsResponse = await request(app.getHttpServer())
      .get('/api/site-settings')
      .expect(200);

    expect(defaultSettingsResponse.body.siteName).toBe('NovoRivera');

    const defaultHomepageResponse = await request(app.getHttpServer())
      .get('/api/homepage')
      .expect(200);

    expect(defaultHomepageResponse.body.heroTitle).toBe('Discover NovoRivera');

    const adminAuth = await registerUser('admin@example.com');
    users[0].role = UserRole.SUPER_ADMIN;

    const updatedSettingsResponse = await request(app.getHttpServer())
      .patch('/api/admin/site-settings')
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({
        siteName: 'NovoRivera Global',
        contactEmail: 'support@novorivera.com',
      })
      .expect(200);

    expect(updatedSettingsResponse.body).toMatchObject({
      siteName: 'NovoRivera Global',
      contactEmail: 'support@novorivera.com',
    });

    await request(app.getHttpServer())
      .post('/api/admin/faqs')
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({
        question: 'How do I vote?',
        answer: 'Buy internal coins and vote for approved contestants.',
        sortOrder: 2,
        isActive: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/admin/faqs')
      .set('Authorization', `Bearer ${adminAuth.body.token}`)
      .send({
        question: 'Hidden FAQ',
        answer: 'This should not be public.',
        sortOrder: 1,
        isActive: false,
      })
      .expect(201);

    const publicFaqsResponse = await request(app.getHttpServer())
      .get('/api/faqs')
      .expect(200);

    expect(publicFaqsResponse.body).toHaveLength(1);
    expect(publicFaqsResponse.body[0].question).toBe('How do I vote?');

    const contactResponse = await request(app.getHttpServer())
      .post('/api/contact')
      .send({
        name: 'Visitor',
        email: 'visitor@example.com',
        subject: 'Support',
        message: 'I need help.',
      })
      .expect(201);

    expect(contactResponse.body.status).toBe(ContactMessageStatus.NEW);

    const userAuth = await registerUser('jane@example.com');

    await request(app.getHttpServer())
      .patch('/api/admin/homepage')
      .set('Authorization', `Bearer ${userAuth.body.token}`)
      .send({ heroTitle: 'Blocked' })
      .expect(403);
  });
});
