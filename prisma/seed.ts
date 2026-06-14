import 'dotenv/config';
import {
  CompetitionStatus,
  PrismaClient,
  StageStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      'ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required for seeding',
    );
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email },
    include: { coinWallet: true },
  });

  if (existingAdmin) {
    if (!existingAdmin.coinWallet) {
      await prisma.coinWallet.create({
        data: {
          userId: existingAdmin.id,
          balance: 0,
        },
      });
    }

    await seedCmsDefaults();
    await seedDemoData();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      coinWallet: {
        create: {
          balance: 0,
        },
      },
    },
  });

  await seedCmsDefaults();
  await seedDemoData();
}

async function seedCmsDefaults() {
  await prisma.siteSettings.upsert({
    where: { singletonKey: 'default' },
    update: {
      siteName: 'NovoRivera',
      siteTagline: 'The Next Viral Superstar Competition',
      contactEmail: 'novo.riviera@gmail.com',
      contactPhone: '09026595713',
      whatsappNumber: '09075075529',
      facebookUrl: 'https://facebook.com/novoriviera',
      tiktokUrl: 'https://www.tiktok.com/@novo.riviera',
      instagramUrl: 'https://instagram.com/novo.riviera',
      youtubeUrl: 'https://youtube.com/@novo.riviera',
      aboutTitle: 'About NovoRivera',
      aboutContent:
        'NovoRivera is the home of The Next Viral Superstar Competition.',
    },
    create: {
      singletonKey: 'default',
      siteName: 'NovoRivera',
      siteTagline: 'The Next Viral Superstar Competition',
      aboutTitle: 'About NovoRivera',
      aboutContent:
        'NovoRivera is the home of The Next Viral Superstar Competition.',
      contactEmail: 'novo.riviera@gmail.com',
      contactPhone: '09026595713',
      whatsappNumber: '09075075529',
      facebookUrl: 'https://facebook.com/novoriviera',
      instagramUrl: 'https://instagram.com/novo.riviera',
      tiktokUrl: 'https://www.tiktok.com/@novo.riviera',
      youtubeUrl: 'https://youtube.com/@novo.riviera',
    },
  });

  await prisma.homepageContent.upsert({
    where: { singletonKey: 'default' },
    update: {
      heroTitle:
        'NOVO RIVIERA PRESENTS THE NEXT VIRAL SUPERSTAR COMPETITION!',
      heroSubtitle:
        'Registration starts 21 June 2026 and ends 21 July 2026. A ₦1,000,000 grand prize pool is available: 1st ₦500,000, 2nd ₦350,000, 3rd ₦150,000.',
      primaryCtaText: 'Register Now',
      primaryCtaUrl: '/register',
      secondaryCtaText: 'View Competitions',
      secondaryCtaUrl: '/competitions',
      announcementText:
        'Registration starts 21 June 2026 and ends 21 July 2026.',
      announcementIsActive: true,
    },
    create: {
      singletonKey: 'default',
      heroTitle:
        'NOVO RIVIERA PRESENTS THE NEXT VIRAL SUPERSTAR COMPETITION!',
      heroSubtitle:
        'Registration starts 21 June 2026 and ends 21 July 2026. A ₦1,000,000 grand prize pool is available: 1st ₦500,000, 2nd ₦350,000, 3rd ₦150,000.',
      primaryCtaText: 'Register Now',
      primaryCtaUrl: '/register',
      secondaryCtaText: 'View Competitions',
      secondaryCtaUrl: '/competitions',
      announcementText:
        'Registration starts 21 June 2026 and ends 21 July 2026.',
      announcementIsActive: true,
    },
  });

  await prisma.competitionRules.upsert({
    where: { singletonKey: 'default' },
    update: {
      title: 'Official Winning Criteria',
      content:
        'Winners are selected by 50% Online Engagement and 50% Voting Token Volume. Fraud, bot activity, vote manipulation, tampering, or any attempt to undermine the competition can result in disqualification. Participation confirms acceptance of all competition rules and organizer decisions.',
      isActive: true,
    },
    create: {
      singletonKey: 'default',
      title: 'Official Winning Criteria',
      content:
        'Winners are selected by 50% Online Engagement and 50% Voting Token Volume. Fraud, bot activity, vote manipulation, tampering, or any attempt to undermine the competition can result in disqualification. Participation confirms acceptance of all competition rules and organizer decisions.',
      isActive: true,
    },
  });
}

async function seedDemoData() {
  if (process.env.DEMO_SEED === 'false') {
    return;
  }

  const competition = await prisma.competition.upsert({
    where: { slug: 'next-viral-superstar-2026' },
    update: {
      title: 'The Next Viral Superstar Competition',
      description:
        'NovoRivera online competition for viral creators across TikTok, Facebook, Instagram, and YouTube.',
      status: CompetitionStatus.ACTIVE,
      startDate: new Date('2026-06-21T00:00:00.000Z'),
      endDate: new Date('2026-07-21T23:59:59.000Z'),
      prizeFirst: '\u20a6500,000',
      prizeSecond: '\u20a6350,000',
      prizeThird: '\u20a6150,000',
      rules:
        'Winning criteria: 50% Online Engagement and 50% Voting Token Volume. Fraud, bots, vote manipulation, or tampering may lead to disqualification.',
    },
    create: {
      title: 'The Next Viral Superstar Competition',
      slug: 'next-viral-superstar-2026',
      description:
        'NovoRivera online competition for viral creators across TikTok, Facebook, Instagram, and YouTube.',
      status: CompetitionStatus.ACTIVE,
      startDate: new Date('2026-06-21T00:00:00.000Z'),
      endDate: new Date('2026-07-21T23:59:59.000Z'),
      prizeFirst: '\u20a6500,000',
      prizeSecond: '\u20a6350,000',
      prizeThird: '\u20a6150,000',
      rules:
        'Winning criteria: 50% Online Engagement and 50% Voting Token Volume. Fraud, bots, vote manipulation, or tampering may lead to disqualification.',
    },
  });

  const stages = [
    {
      title: 'Registration And Auditions',
      stageNumber: 1,
      status: StageStatus.ACTIVE,
      submissionStartDate: new Date('2026-06-21T00:00:00.000Z'),
      submissionEndDate: new Date('2026-07-21T23:59:59.000Z'),
      votingStartDate: new Date('2026-06-21T00:00:00.000Z'),
      votingEndDate: new Date('2026-07-21T23:59:59.000Z'),
      eliminationPercentage: 0,
    },
    {
      title: 'Engagement Challenge',
      stageNumber: 2,
      status: StageStatus.UPCOMING,
      submissionStartDate: new Date('2026-07-22T00:00:00.000Z'),
      submissionEndDate: new Date('2026-08-05T23:59:59.000Z'),
      votingStartDate: new Date('2026-07-22T00:00:00.000Z'),
      votingEndDate: new Date('2026-08-05T23:59:59.000Z'),
      eliminationPercentage: 30,
    },
    {
      title: 'Grand Finale',
      stageNumber: 3,
      status: StageStatus.UPCOMING,
      submissionStartDate: new Date('2026-08-06T00:00:00.000Z'),
      submissionEndDate: new Date('2026-08-20T23:59:59.000Z'),
      votingStartDate: new Date('2026-08-06T00:00:00.000Z'),
      votingEndDate: new Date('2026-08-20T23:59:59.000Z'),
      eliminationPercentage: 0,
    },
  ];

  for (const stage of stages) {
    await prisma.stage.upsert({
      where: {
        competitionId_stageNumber: {
          competitionId: competition.id,
          stageNumber: stage.stageNumber,
        },
      },
      update: stage,
      create: {
        ...stage,
        competitionId: competition.id,
      },
    });
  }

  await upsertCoinPackage('Starter Pack', 1000, 100, 10, 1);
  await upsertCoinPackage('Voter Pack', 2500, 250, 40, 2);
  await upsertCoinPackage('Super Fan Pack', 5000, 500, 100, 3);

  await upsertFaq(
    'How are winners selected?',
    'Winners are selected using 50% Online Engagement and 50% Voting Token Volume.',
    1,
  );
  await upsertFaq(
    'Can I submit TikTok or Facebook links?',
    'Yes. Admins can attach TikTok, Facebook, Instagram, YouTube, and external video links to approved submissions.',
    2,
  );
  await upsertFaq(
    'Are coins cryptocurrency?',
    'No. Coins are internal NovoRivera platform credits used for voting only.',
    3,
  );

  await upsertSponsor('Sponsor Placeholder', '', '', 1);
}

async function upsertCoinPackage(
  name: string,
  priceNaira: number,
  coins: number,
  bonusCoins: number,
  sortOrder: number,
) {
  const existing = await prisma.coinPackage.findFirst({ where: { name } });
  const data = { priceNaira, coins, bonusCoins, sortOrder, isActive: true };

  if (existing) {
    await prisma.coinPackage.update({ where: { id: existing.id }, data });
    return;
  }

  await prisma.coinPackage.create({ data: { name, ...data } });
}

async function upsertFaq(question: string, answer: string, sortOrder: number) {
  const existing = await prisma.faq.findFirst({ where: { question } });
  const data = { answer, sortOrder, isActive: true };

  if (existing) {
    await prisma.faq.update({ where: { id: existing.id }, data });
    return;
  }

  await prisma.faq.create({ data: { question, ...data } });
}

async function upsertSponsor(
  name: string,
  logoUrl: string,
  websiteUrl: string,
  sortOrder: number,
) {
  const existing = await prisma.sponsor.findFirst({ where: { name } });
  const data = { logoUrl, websiteUrl, sortOrder, isActive: true };

  if (existing) {
    await prisma.sponsor.update({ where: { id: existing.id }, data });
    return;
  }

  await prisma.sponsor.create({ data: { name, ...data } });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
