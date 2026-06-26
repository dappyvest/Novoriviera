import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  CompetitionStatus,
  ContestantStatus,
  Prisma,
  StageStatus,
  SubmissionStatus,
  User,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const competition = await this.findRegistrationCompetition();
    if (!competition) {
      throw new BadRequestException(
        'No active competition is currently open for registration.',
      );
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 12);
    const { user, contestant, submission } = await this.prisma.$transaction(
      async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            name: registerDto.name,
            email,
            phone: registerDto.phone,
            passwordHash,
            role: UserRole.CONTESTANT,
          },
        });

        const contestantCode = await this.generateContestantCode(tx);
        const createdContestant = await tx.contestant.create({
          data: {
            contestantCode,
            userId: createdUser.id,
            competitionId: competition.id,
            displayName: registerDto.displayName ?? registerDto.name,
            bio: registerDto.bio,
            age: registerDto.age,
            location: registerDto.location,
            guardianName: registerDto.guardianName,
            guardianPhone: registerDto.guardianPhone,
            photoUrl: registerDto.photoUrl,
            photoPublicId: registerDto.photoPublicId,
            photoMeta: registerDto.photoMeta as
              | Prisma.InputJsonValue
              | undefined,
            status: ContestantStatus.PENDING,
          },
        });

        const createdSubmission = await this.createRegistrationSubmission(
          tx,
          competition.id,
          createdContestant.id,
          registerDto,
        );

        return {
          user: createdUser,
          contestant: createdContestant,
          submission: createdSubmission,
        };
      },
    );

    return {
      ...this.buildAuthResponse(user),
      contestant,
      submission,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
  }

  toSafeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private buildAuthResponse(user: User) {
    return {
      user: this.toSafeUser(user),
      token: this.signToken(user),
    };
  }

  private signToken(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  private async findRegistrationCompetition() {
    const activeCompetition = await this.prisma.competition.findFirst({
      where: { status: CompetitionStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });

    if (activeCompetition) {
      return activeCompetition;
    }

    return this.prisma.competition.findFirst({
      where: { status: CompetitionStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async createRegistrationSubmission(
    tx: Prisma.TransactionClient,
    competitionId: string,
    contestantId: string,
    registerDto: RegisterDto,
  ) {
    const hasVideo =
      Boolean(registerDto.videoUrl) ||
      Boolean(registerDto.uploadUrl) ||
      Boolean(registerDto.cloudinarySecureUrl);

    if (!hasVideo) {
      return null;
    }

    const stage =
      (await tx.stage.findFirst({
        where: { competitionId, status: StageStatus.ACTIVE },
        orderBy: { stageNumber: 'asc' },
      })) ??
      (await tx.stage.findFirst({
        where: { competitionId },
        orderBy: { stageNumber: 'asc' },
      }));

    if (!stage) {
      return null;
    }

    return tx.submission.create({
      data: {
        contestantId,
        stageId: stage.id,
        title: registerDto.submissionTitle ?? registerDto.displayName ?? registerDto.name,
        description: registerDto.submissionDescription ?? registerDto.bio,
        videoUrl: registerDto.videoUrl,
        uploadUrl: registerDto.uploadUrl,
        cloudinaryPublicId: registerDto.cloudinaryPublicId,
        cloudinarySecureUrl: registerDto.cloudinarySecureUrl,
        uploadedFileMeta: registerDto.uploadedFileMeta as
          | Prisma.InputJsonValue
          | undefined,
        status: SubmissionStatus.APPROVED,
      },
    });
  }

  private async generateContestantCode(tx: Prisma.TransactionClient) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = `NRV-${Math.floor(100000 + Math.random() * 900000)}`;
      const existing = await tx.contestant.findUnique({
        where: { contestantCode: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException('Could not generate unique contestant code');
  }
}
