# NovoRivera Frontend API Reference

This document is generated from the backend source code, controllers, DTOs, Prisma schema, and README. It is intended to be copied into the frontend repository so frontend implementation can target the actual backend surface.

Do not treat this as a product wishlist. Only use endpoints documented here unless the backend adds new routes and this file is updated.

## API Basics

- Default local base URL: `http://localhost:3000`
- Frontend environment variable: `NEXT_PUBLIC_API_URL=http://localhost:3000`
- API prefix: `/api`
- Health check exception: `GET /health` is not prefixed with `/api`.
- Request content type: `Content-Type: application/json`
- Auth header: `Authorization: Bearer <token>`
- JWT source: backend extracts tokens only from the Bearer auth header.
- Validation: global whitelist validation is enabled. Unknown request body fields are rejected.
- CORS: backend allows `APP_FRONTEND_URL` when configured.
- Paystack webhook signatures are verified with backend `PAYSTACK_SECRET_KEY`.
- Cloudinary credentials stay on the backend only. Frontend uses upload responses, not Cloudinary secrets.
- Seed mode: `DEMO_SEED=false` disables demo competition/packages/FAQs/sponsor placeholder during seed.

Example frontend client base:

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const res = await fetch(`${API_URL}/api/competitions`);
```

## Auth, Roles, And Errors

### User Roles

From Prisma `UserRole`:

```ts
type UserRole = "USER" | "CONTESTANT" | "ADMIN" | "SUPER_ADMIN";
```

- `USER`: default registered user.
- `CONTESTANT`: user that has registered as a contestant for at least one competition.
- `ADMIN`: admin access.
- `SUPER_ADMIN`: admin access.

Admin-protected endpoints allow `ADMIN` and `SUPER_ADMIN`.

### Frontend Enum Values

```ts
type PaymentProvider = "PAYSTACK";
type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
type ContestantStatus = "PENDING" | "APPROVED" | "REJECTED" | "ELIMINATED";
type CompetitionStatus = "DRAFT" | "PUBLISHED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
type StageStatus = "UPCOMING" | "ACTIVE" | "VOTING_CLOSED" | "COMPLETED";
type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";
type VoteSource = "COIN" | "ONLINE_ENGAGEMENT" | "ITEM_PURCHASE";
type CoinTransactionType = "CREDIT" | "DEBIT" | "ADJUSTMENT";
type ContactMessageStatus = "NEW" | "READ" | "RESOLVED";
type EngagementPlatform = "TIKTOK" | "FACEBOOK" | "YOUTUBE" | "INSTAGRAM" | "OTHER";
type WinnerPlacement = "FIRST" | "SECOND" | "THIRD";
type LeaderboardMode = "votes" | "engagement" | "combined";
type SponsoredAdPlacement = "HOME_TOP" | "HOME_MIDDLE" | "LEADERBOARD" | "COMPETITION_PAGE" | "CONTESTANT_PAGE" | "VOTE_PAGE";
type SponsoredAdStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED";
type SponsoredAdDestinationType = "WEBSITE" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "OTHER";
type ManualVotePaymentStatus = "PENDING" | "APPROVED" | "REJECTED";
```

### Error Response Format

NestJS default exception responses are used.

```json
{
  "message": "Competition not found",
  "error": "Not Found",
  "statusCode": 404
}
```

Validation errors can return an array in `message`:

```json
{
  "message": ["email must be an email", "password must be longer than or equal to 8 characters"],
  "error": "Bad Request",
  "statusCode": 400
}
```

Common status codes:

- `400`: validation or business rule failure.
- `401`: missing/invalid/expired token, inactive user, invalid Paystack signature.
- `403`: authenticated but not allowed.
- `404`: resource not found.
- `409`: unique constraint conflict.

## TypeScript Interfaces

Dates are serialized as ISO strings in JSON.

```ts
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Competition {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  bannerUrl: string | null;
  status: CompetitionStatus;
  startDate: string | null;
  endDate: string | null;
  prizeFirst: string | null;
  prizeSecond: string | null;
  prizeThird: string | null;
  rules: string | null;
  manualVotingEnabled: boolean;
  votePriceNaira?: number;
  paymentBankName?: string | null;
  paymentAccountName?: string | null;
  paymentAccountNumber?: string | null;
  paymentInstructions?: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  stages?: Stage[];
}

export interface Stage {
  id: string;
  title: string;
  description: string | null;
  stageNumber: number;
  status: StageStatus;
  submissionStartDate: string | null;
  submissionEndDate: string | null;
  votingStartDate: string | null;
  votingEndDate: string | null;
  eliminationPercentage: number;
  competitionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contestant {
  id: string;
  contestantCode: string;
  displayName: string;
  bio: string | null;
  age: number | null;
  location: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  photoUrl: string | null;
  status: ContestantStatus;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  totalVotes: number;
  totalOnlineEngagement: number;
  userId: string | null;
  competitionId: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  competition?: Competition;
}

export interface Submission {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  uploadUrl: string | null;
  youtubeUrl: string | null;
  youtubeVideoId: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  externalVideoUrl: string | null;
  thumbnailUrl: string | null;
  cloudinaryPublicId: string | null;
  cloudinarySecureUrl: string | null;
  uploadedFileMeta: unknown | null;
  status: SubmissionStatus;
  adminNote: string | null;
  contestantId: string;
  stageId: string;
  createdAt: string;
  updatedAt: string;
  contestant?: Contestant;
  stage?: Stage;
}

export interface LeaderboardSubmission {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  uploadUrl: string | null;
  cloudinarySecureUrl: string | null;
  externalVideoUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  contestantId: string;
  displayName: string;
  status: ContestantStatus;
  isPremium: boolean;
  totalVotes: number;
  totalOnlineEngagement: number;
  engagementScore: number;
  tokenScore: number;
  combinedScore: number;
  videoUrl: string | null;
  uploadUrl: string | null;
  cloudinarySecureUrl: string | null;
  externalVideoUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  thumbnailUrl: string | null;
  latestVideoUrl: string | null;
  latestUploadUrl: string | null;
  latestCloudinarySecureUrl: string | null;
  latestExternalVideoUrl: string | null;
  latestTiktokUrl: string | null;
  latestFacebookUrl: string | null;
  latestYoutubeUrl: string | null;
  latestThumbnailUrl: string | null;
  latestSubmission: LeaderboardSubmission | null;
}

export interface CoinPackage {
  id: string;
  name: string;
  priceNaira: number;
  coins: number;
  bonusCoins: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CoinTransaction {
  id: string;
  amount: number;
  type: CoinTransactionType;
  description: string | null;
  reference: string | null;
  metadata: unknown | null;
  walletId: string;
  userId: string | null;
  createdAt: string;
}

export interface Wallet {
  id: string;
  balance: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  totalPurchased?: number;
  totalSpent?: number;
  transactions?: CoinTransaction[];
}

export interface Payment {
  id: string;
  provider: PaymentProvider;
  reference: string;
  amountNaira: number;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  status: PaymentStatus;
  providerResponse: unknown | null;
  paidAt: string | null;
  userId: string;
  coinPackageId: string;
  competitionId: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  coinPackage?: CoinPackage;
}

export interface SiteSettings {
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
  createdAt: string;
  updatedAt: string;
}

export interface HomepageContent {
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
  createdAt: string;
  updatedAt: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SponsoredAd {
  id: string;
  title: string;
  productName: string;
  description: string;
  imageUrl: string | null;
  videoUrl: string | null;
  videoPublicId: string | null;
  targetUrl: string | null;
  whatsappUrl: string | null;
  socialUrl: string | null;
  placement: SponsoredAdPlacement;
  placements: SponsoredAdPlacement[];
  destinationType: SponsoredAdDestinationType;
  destinationValue: string | null;
  buttonText: string | null;
  status: SponsoredAdStatus;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  clicks: number;
  impressions: number;
  ctr: number;
  displayPriority: number;
  createdAt: string;
  updatedAt: string;
}

export interface ManualVotePayment {
  id: string;
  contestantId: string;
  competitionId: string;
  contestantCode: string;
  voterName: string;
  voterPhone: string;
  voterEmail: string | null;
  amountPaid: number;
  votePriceNaira: number;
  votesCalculated: number;
  transferReference: string | null;
  paymentNarration: string | null;
  proofImageUrl: string | null;
  note: string | null;
  status: ManualVotePaymentStatus;
  adminNote: string | null;
  verifiedAt: string | null;
  verifiedById: string | null;
  createdAt: string;
  updatedAt: string;
  contestant?: Contestant;
  competition?: Competition;
  verifiedBy?: User;
}

export interface CompetitionRules {
  id: string;
  singletonKey: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResponse {
  secureUrl: string;
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
  duration?: number;
}

export interface CompetitionWinner {
  id: string;
  placement: WinnerPlacement;
  prizeAmount: string | null;
  totalVotes: number;
  totalOnlineEngagement: number;
  engagementScore: number;
  tokenScore: number;
  combinedScore: number;
  declaredAt: string;
  competitionId: string;
  contestantId: string;
  contestant?: Contestant;
  competition?: Competition;
}
```

## Endpoint Reference

Each path below is shown as the actual HTTP path.

### Health

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | None |

Success:

```json
{
  "status": "ok",
  "service": "novorivera-backend"
}
```

Common errors: none expected.

### Auth

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | None |
| `POST` | `/api/auth/login` | Public | None |
| `GET` | `/api/auth/me` | Required | Any active user |

`POST /api/auth/register`

Body:

```json
{
  "name": "Jane Rivera",
  "email": "jane@example.com",
  "phone": "+2348012345678",
  "password": "password123"
}
```

Success:

```json
{
  "user": {
    "id": "user-id",
    "name": "Jane Rivera",
    "email": "jane@example.com",
    "phone": "+2348012345678",
    "role": "USER",
    "isActive": true,
    "createdAt": "2026-06-14T00:00:00.000Z",
    "updatedAt": "2026-06-14T00:00:00.000Z"
  },
  "token": "jwt-token"
}
```

Common errors: `400` invalid body, `409` email already registered.

`POST /api/auth/login`

Body:

```json
{
  "email": "jane@example.com",
  "password": "password123"
}
```

Success: same `AuthResponse` shape as register.

Common errors: `400` invalid body, `401` invalid email/password or inactive user.

`GET /api/auth/me`

Success:

```json
{
  "user": {
    "id": "user-id",
    "email": "jane@example.com",
    "name": "Jane Rivera",
    "phone": "+2348012345678",
    "role": "USER",
    "isActive": true,
    "createdAt": "2026-06-14T00:00:00.000Z",
    "updatedAt": "2026-06-14T00:00:00.000Z"
  }
}
```

Common errors: `401`.

### Users/Profile

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `GET` | `/api/users/me` | Required | Any active user |
| `PATCH` | `/api/users/me` | Required | Any active user |
| `PATCH` | `/api/users/me/password` | Required | Any active user |

`PATCH /api/users/me`

Body:

```json
{
  "name": "Jane Novo",
  "phone": "+2348099999999"
}
```

Success:

```json
{
  "user": {
    "id": "user-id",
    "name": "Jane Novo",
    "email": "jane@example.com",
    "phone": "+2348099999999",
    "role": "USER",
    "isActive": true,
    "createdAt": "2026-06-14T00:00:00.000Z",
    "updatedAt": "2026-06-14T00:00:00.000Z"
  }
}
```

Request params/query params: none.

Common errors: `400`, `401`, `404`.

`PATCH /api/users/me/password`

Body:

```json
{
  "currentPassword": "password123",
  "newPassword": "newpassword123"
}
```

Success:

```json
{
  "success": true
}
```

Common errors: `400`, `401`, `404`.

### Public CMS

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `GET` | `/api/site-settings` | Public | None |
| `GET` | `/api/homepage` | Public | None |
| `GET` | `/api/faqs` | Public | None |
| `GET` | `/api/sponsors` | Public | None |
| `GET` | `/api/rules` | Public | None |

Request params/query params/body: none.

Success examples:

```json
{
  "id": "settings-id",
  "singletonKey": "default",
  "siteName": "NovoRivera",
  "siteTagline": "Online competition platform",
  "aboutTitle": "About NovoRivera",
  "aboutContent": "NovoRivera helps competitions run online.",
  "contactEmail": "hello@novorivera.com",
  "contactPhone": "",
  "whatsappNumber": "",
  "facebookUrl": "",
  "instagramUrl": "",
  "tiktokUrl": "",
  "youtubeUrl": "",
  "termsUrl": null,
  "privacyUrl": null,
  "createdAt": "2026-06-14T00:00:00.000Z",
  "updatedAt": "2026-06-14T00:00:00.000Z"
}
```

`GET /api/faqs` returns active FAQs only, sorted by `sortOrder` then `createdAt`.

```json
[
  {
    "id": "faq-id",
    "question": "How do I vote?",
    "answer": "Buy internal coins and vote for registered contestants.",
    "sortOrder": 1,
    "isActive": true,
    "createdAt": "2026-06-14T00:00:00.000Z",
    "updatedAt": "2026-06-14T00:00:00.000Z"
  }
]
```

`GET /api/sponsors` returns active sponsors only, sorted by `sortOrder` then `createdAt`.

Common errors: none expected for singleton reads; standard `500` if database unavailable.

### Contact

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `POST` | `/api/contact` | Public | None |

Body:

```json
{
  "name": "Visitor",
  "email": "visitor@example.com",
  "phone": "+2348000000000",
  "subject": "Support",
  "message": "I need help."
}
```

Success:

```json
{
  "id": "message-id",
  "name": "Visitor",
  "email": "visitor@example.com",
  "phone": "+2348000000000",
  "subject": "Support",
  "message": "I need help.",
  "status": "NEW",
  "createdAt": "2026-06-14T00:00:00.000Z",
  "updatedAt": "2026-06-14T00:00:00.000Z"
}
```

Common errors: `400` invalid body.

### Uploads

Cloudinary credentials are backend-only. Do not store or use `CLOUDINARY_API_SECRET` in the frontend.

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `POST` | `/api/uploads/video` | Required | Any active user |
| `POST` | `/api/uploads/image` | Required | Any active user |
| `POST` | `/api/uploads/payment-proof` | Public | None |

Request:

- `multipart/form-data`
- Field name: `file`
- Video route accepts MP4, MOV, WebM, AVI, MKV, and 3GP.
- Image route accepts `image/*` only.
- Max video upload size is configured by `MAX_VIDEO_UPLOAD_SIZE_MB`, default `50` MB.
- Payment proof route accepts only JPG, JPEG, PNG, and WebP images.
- Payment proof max size is configured by `MAX_PAYMENT_PROOF_UPLOAD_SIZE_MB`, default `5` MB.
- Payment proofs upload to the fixed Cloudinary folder `novoriviera/payment-proofs`.

Success:

```json
{
  "secureUrl": "https://res.cloudinary.com/cloud/video/upload/novorivera/entry.mp4",
  "publicId": "novorivera/entry",
  "resourceType": "video",
  "format": "mp4",
  "bytes": 1048576,
  "duration": 30.5
}
```

Use the image response `secureUrl` and `publicId` with the contestant photo update endpoint. Cloudinary API credentials and signatures are never returned.

Use `POST /api/uploads/payment-proof` before `POST /api/public-votes` when the voter chooses a proof image. Send the returned `secureUrl` as `proofImageUrl`. This endpoint is intentionally public because voters do not register or log in.

Common errors: `400` missing file or unsupported/invalid payment proof format, `401` for auth-required upload routes, `413` file too large, `502` Cloudinary upload failure, `503` Cloudinary not configured. All application errors are JSON responses.

### Manual Public Voting

Manual transfer voting is the primary public voter flow. Voters do not register or log in. Contestants share their public profile link or contestant code, voters transfer to the configured bank account with the contestant code in the narration, then submit payment proof for admin review. The old wallet/coin endpoints still exist for future use.

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `GET` | `/api/contestants/code/:contestantCode` | Public | None |
| `GET` | `/api/contestants/code/:contestantCode/vote-info` | Public | None |
| `POST` | `/api/public-votes` | Public | None |
| `GET` | `/api/admin/public-votes` | Required | `ADMIN`, `SUPER_ADMIN` |
| `GET` | `/api/admin/public-votes/:id` | Required | `ADMIN`, `SUPER_ADMIN` |
| `PATCH` | `/api/admin/public-votes/:id/status` | Required | `ADMIN`, `SUPER_ADMIN` |

Contestant codes are generated automatically on contestant registration and look like `NRV-100001`. `contestantCode` is returned in contestant profiles, leaderboard rows, admin contestant responses, and contestant dashboard responses.

`GET /api/contestants/code/:contestantCode/vote-info`

Success:

```json
{
  "contestant": {
    "id": "contestant-id",
    "contestantCode": "NRV-100001",
    "displayName": "Ada Star",
    "photoUrl": "https://example.com/photo.jpg",
    "status": "APPROVED"
  },
  "competition": {
    "id": "competition-id",
    "title": "Novo Talent 2026",
    "slug": "novo-talent-2026",
    "bannerUrl": "https://example.com/banner.jpg"
  },
  "votePriceNaira": 500,
  "bankName": "Novo Bank",
  "accountName": "NovoRivera Votes",
  "accountNumber": "1234567890",
  "paymentInstructions": "Transfer and include contestant code.",
  "requiredNarration": "NRV-100001",
  "contestantCode": "NRV-100001"
}
```

`POST /api/public-votes`

```json
{
  "contestantCode": "NRV-100001",
  "competitionId": "competition-id",
  "voterName": "John Doe",
  "voterPhone": "08000000000",
  "voterEmail": "john@example.com",
  "amountPaid": 1000,
  "transferReference": "BANK-REF-1",
  "paymentNarration": "NRV-100001",
  "proofImageUrl": "https://example.com/proof.jpg",
  "note": "Optional note"
}
```

Optional proof upload:

```http
POST /api/uploads/payment-proof
Content-Type: multipart/form-data

file=<jpg|jpeg|png|webp image>
```

Success:

```json
{
  "secureUrl": "https://res.cloudinary.com/cloud/image/upload/novoriviera/payment-proofs/proof.jpg",
  "publicId": "novoriviera/payment-proofs/proof",
  "resourceType": "image",
  "format": "jpg",
  "bytes": 512000
}
```

Send `secureUrl` as `proofImageUrl` in `POST /api/public-votes`. Do not expose Cloudinary credentials in the frontend.

Rules:

- `contestantCode` must exist.
- Contestant must belong to `competitionId`.
- Contestant must not be `REJECTED` or `ELIMINATED`.
- Competition `manualVotingEnabled` must be `true`.
- `amountPaid` must be at least `votePriceNaira`.
- `votesCalculated = floor(amountPaid / votePriceNaira)`.
- Initial status is `PENDING`; votes are not added until admin approval.

Admin list filters:

- `status`: `PENDING`, `APPROVED`, or `REJECTED`.
- `competitionId`.
- `contestantCode`.

Status update body:

```json
{
  "status": "APPROVED",
  "adminNote": "Payment confirmed"
}
```

Approving increments `Contestant.totalVotes` by `votesCalculated` once. Re-approving an already approved payment does not double-count. Rejecting a pending payment does not increment votes. Rejecting a previously approved payment subtracts the approved votes safely. Status updates are audited with `PUBLIC_VOTE_STATUS_UPDATE`.

Admin competition create/update accepts manual voting fields:

```json
{
  "manualVotingEnabled": true,
  "votePriceNaira": 500,
  "paymentBankName": "Novo Bank",
  "paymentAccountName": "NovoRivera Votes",
  "paymentAccountNumber": "1234567890",
  "paymentInstructions": "Transfer and include contestant code."
}
```

Public competition detail exposes bank/payment fields only when `manualVotingEnabled` is `true`.

### Sponsored Ads

Public ad reads only return `ACTIVE` ads whose date window is currently valid. Ads are ordered by `sortOrder` ascending, then newest first. In admin UI, label `sortOrder` as **Display Priority**; lower numbers appear first. The frontend should render ads in non-blocking slots and should never place an ad modal or forced interstitial inside voting or submission flows.

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `GET` | `/api/ads?placement=HOME_TOP` | Public | None |
| `GET` | `/api/ads?placement=VOTE_PAGE` | Public | None |
| `POST` | `/api/ads/:id/click` | Public | None |
| `POST` | `/api/ads/:id/impression` | Public | None |
| `POST` | `/api/admin/ads` | Required | `ADMIN`, `SUPER_ADMIN` |
| `GET` | `/api/admin/ads` | Required | `ADMIN`, `SUPER_ADMIN` |
| `GET` | `/api/admin/ads/:id` | Required | `ADMIN`, `SUPER_ADMIN` |
| `PATCH` | `/api/admin/ads/:id` | Required | `ADMIN`, `SUPER_ADMIN` |
| `DELETE` | `/api/admin/ads/:id` | Required | `ADMIN`, `SUPER_ADMIN` |

Create body:

```json
{
  "title": "Leaderboard sponsor",
  "productName": "Novo Boost",
  "description": "Promoted product for contestants",
  "imageUrl": "https://res.cloudinary.com/cloud/image/upload/novorivera/ad.jpg",
  "videoUrl": "https://res.cloudinary.com/cloud/video/upload/novorivera/ad.mp4",
  "videoPublicId": "novorivera/ad",
  "placements": ["HOME_TOP", "LEADERBOARD", "VOTE_PAGE"],
  "destinationType": "WHATSAPP",
  "destinationValue": "08012345678",
  "buttonText": "Chat on WhatsApp",
  "status": "ACTIVE",
  "startsAt": "2026-07-01T00:00:00.000Z",
  "endsAt": "2026-08-01T00:00:00.000Z",
  "sortOrder": 1
}
```

`placements` is preferred and must contain at least one location. Valid values are `HOME_TOP`, `HOME_MIDDLE`, `LEADERBOARD`, `COMPETITION_PAGE`, `CONTESTANT_PAGE`, and `VOTE_PAGE`. The legacy single `placement` field is still accepted. Destination types are `WEBSITE`, `WHATSAPP`, `FACEBOOK`, `INSTAGRAM`, `TIKTOK`, `YOUTUBE`, and `OTHER`. If `destinationType` is `WHATSAPP` and `destinationValue` is a phone number, the backend normalizes Nigerian local numbers such as `08012345678` to `https://wa.me/2348012345678`. If `destinationValue` is already an HTTP URL, it is preserved. `targetUrl` is generated/resolved where practical; legacy `targetUrl`, `whatsappUrl`, and `socialUrl` remain compatible.

`PATCH /api/admin/ads/:id` accepts any subset of the create fields. Nullable media/link/window fields can be sent as `null` to clear them.

Public response:

```json
[
  {
    "id": "ad-id",
    "title": "Leaderboard sponsor",
    "productName": "Novo Boost",
    "description": "Promoted product for contestants",
    "imageUrl": "https://res.cloudinary.com/cloud/image/upload/novorivera/ad.jpg",
    "videoUrl": "https://res.cloudinary.com/cloud/video/upload/novorivera/ad.mp4",
    "videoPublicId": "novorivera/ad",
    "targetUrl": "https://wa.me/2348012345678",
    "whatsappUrl": "https://wa.me/2348012345678",
    "socialUrl": null,
    "placement": "LEADERBOARD",
    "placements": ["HOME_TOP", "LEADERBOARD", "VOTE_PAGE"],
    "destinationType": "WHATSAPP",
    "destinationValue": "08012345678",
    "buttonText": "Chat on WhatsApp",
    "status": "ACTIVE",
    "startsAt": "2026-07-01T00:00:00.000Z",
    "endsAt": "2026-08-01T00:00:00.000Z",
    "sortOrder": 1,
    "clicks": 0,
    "impressions": 0,
    "ctr": 0,
    "displayPriority": 1,
    "createdAt": "2026-06-26T00:00:00.000Z",
    "updatedAt": "2026-06-26T00:00:00.000Z"
  }
]
```

For navigation, use the resolved `targetUrl`. Call the click endpoint before or while opening the selected destination. Call the impression endpoint when an ad slot becomes visible enough to count as viewed. `POST /api/ads/:id/click` and `POST /api/ads/:id/impression` are public and do not require auth.

Analytics: all admin ad responses include `impressions`, `clicks`, and `ctr`, where `ctr = clicks / impressions * 100`. If impressions is `0`, `ctr` is `0`.

Admins upload ad images with `/api/uploads/image` and ad videos with `/api/uploads/video`, then save `secureUrl` as `imageUrl` or `videoUrl` and `publicId` as `videoPublicId` where relevant. Ad video uploads use the existing video upload endpoint and the 50 MB default max.

Admin create/update/delete writes `AdminAuditLog` entries with actions `SPONSORED_AD_CREATE`, `SPONSORED_AD_UPDATE`, and `SPONSORED_AD_DELETE`.

### Competitions

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `GET` | `/api/competitions` | Public, optional token | None; admins see all statuses |
| `GET` | `/api/competitions/:id` | Public, optional token | None; admins see all statuses |

`GET /api/competitions`

- Params: none.
- Query: none.
- Public response includes only competitions with `PUBLISHED` or `ACTIVE` status.
- If an admin token is supplied, all statuses can be returned.

Success:

```json
[
  {
    "id": "competition-id",
    "title": "Novo Talent 2026",
    "slug": "novo-talent-2026",
    "description": "Online talent competition",
    "bannerUrl": "https://example.com/banner.jpg",
    "status": "PUBLISHED",
    "startDate": "2026-07-01T00:00:00.000Z",
    "endDate": "2026-08-01T00:00:00.000Z",
    "prizeFirst": "First prize",
    "prizeSecond": "Second prize",
    "prizeThird": "Third prize",
    "rules": "Competition rules",
    "ownerId": "admin-user-id",
    "createdAt": "2026-06-14T00:00:00.000Z",
    "updatedAt": "2026-06-14T00:00:00.000Z"
  }
]
```

`GET /api/competitions/:id`

- `:id` is the competition id. There is no slug lookup route in the backend.
- Response includes `stages` ordered by `stageNumber`.

Common errors: `404` competition not found.

### Stages

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `GET` | `/api/competitions/:competitionId/stages` | Public | None |
| `GET` | `/api/stages/:stageId/submissions` | Public | None |
| `GET` | `/api/stages/:stageId/votes/summary` | Public | None |

Public competition details include stages via `GET /api/competitions/:id`. The standalone stage route also exposes ordered stages and active/submission/voting window flags.

`GET /api/stages/:stageId/submissions`

- Params: `stageId`.
- Returns visible submissions, including contestant. New submissions are visible immediately; rejected submissions and rejected/eliminated contestants are excluded.

Success:

```json
[
  {
    "id": "submission-id",
    "title": "My stage entry",
    "description": "Optional description",
    "videoUrl": "https://example.com/video.mp4",
    "uploadUrl": "https://example.com/uploaded-file",
    "cloudinarySecureUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
    "externalVideoUrl": "https://example.com/video",
    "tiktokUrl": "https://www.tiktok.com/@novo/video/123",
    "facebookUrl": "https://facebook.com/reel/123",
    "youtubeUrl": "https://youtube.com/watch?v=abc123",
    "youtubeVideoId": "abc123",
    "thumbnailUrl": "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    "status": "APPROVED",
    "adminNote": null,
    "contestantId": "contestant-id",
    "stageId": "stage-id",
    "createdAt": "2026-06-14T00:00:00.000Z",
    "updatedAt": "2026-06-14T00:00:00.000Z",
    "contestant": {
      "id": "contestant-id",
      "displayName": "Jane Star",
      "status": "APPROVED"
    }
  }
]
```

`GET /api/stages/:stageId/votes/summary`

Success:

```json
{
  "totalVotes": 25,
  "totalCoinVotes": 25,
  "votersCount": 5
}
```

Common errors: `401`, `403`, `404`.

### Contestants

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `GET` | `/api/contestants/:id` | Public | None |
| `POST` | `/api/competitions/:competitionId/contestants` | Required | Any active user |
| `GET` | `/api/contestants/me` | Required | Any active user |
| `GET` | `/api/contestants/me/:competitionId` | Required | Any active user |
| `PATCH` | `/api/contestants/me/:competitionId/photo` | Required | Contestant owner |
| `GET` | `/api/contestants/:id/votes` | Required | Any active user |

`GET /api/contestants/:id`

Returns registered entrants, excluding only `REJECTED` and `ELIMINATED` contestants. It does not expose private user data.

Success:

```json
{
  "id": "contestant-id",
  "displayName": "Jane Star",
  "bio": "Singer",
  "age": 19,
  "location": "Lagos",
  "photoUrl": "https://res.cloudinary.com/cloud/image/upload/novorivera/photo.jpg",
  "status": "APPROVED",
  "isPremium": false,
  "premiumExpiresAt": null,
  "totalVotes": 100,
  "totalOnlineEngagement": 150,
  "rank": 1,
  "entrantCount": 25,
  "competition": {
    "id": "competition-id",
    "title": "Novo Viral Superstar"
  },
  "latestSubmission": {
    "id": "submission-id",
    "title": "My entry",
    "videoUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
    "uploadUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
    "youtubeUrl": "https://youtube.com/watch?v=abc123",
    "tiktokUrl": "https://www.tiktok.com/@novo/video/123",
    "facebookUrl": "https://facebook.com/reel/123",
    "instagramUrl": "https://instagram.com/reel/123",
    "externalVideoUrl": "https://example.com/video",
    "thumbnailUrl": "https://example.com/thumb.jpg",
    "cloudinarySecureUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4"
  },
  "latestApprovedSubmission": {
    "id": "submission-id",
    "title": "My entry",
    "videoUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
    "uploadUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
    "youtubeUrl": "https://youtube.com/watch?v=abc123",
    "tiktokUrl": "https://www.tiktok.com/@novo/video/123",
    "facebookUrl": "https://facebook.com/reel/123",
    "instagramUrl": "https://instagram.com/reel/123",
    "externalVideoUrl": "https://example.com/video",
    "thumbnailUrl": "https://example.com/thumb.jpg",
    "cloudinarySecureUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4"
  },
  "shareTitle": "Jane Star - Novo Viral Superstar",
  "shareDescription": "Singer",
  "shareImageUrl": "https://example.com/thumb.jpg"
}
```

Common errors: `404` when contestant is rejected, eliminated, or does not exist.

`PATCH /api/contestants/me/:competitionId/photo`

Upload an `image/*` file to `POST /api/uploads/image`, then send its returned values:

```json
{
  "photoUrl": "https://res.cloudinary.com/cloud/image/upload/novorivera/photo.jpg",
  "photoPublicId": "novorivera/photo",
  "photoMeta": {
    "format": "jpg",
    "bytes": 2048
  }
}
```

`photoUrl` must be a valid HTTPS URL. The current user must own the contestant profile for `competitionId`; no approval status is required for photo upload. The response includes the updated contestant, including `photoUrl`, `photoPublicId`, and `photoMeta`. Public contestant profiles and leaderboard entries expose only `photoUrl`; owner and admin contestant responses include all three fields.

Common errors: `400` invalid URL/body, `401`, `404` contestant profile not found for the current user and competition.

`POST /api/competitions/:competitionId/contestants`

Body:

```json
{
  "displayName": "Jane Star",
  "bio": "Singer",
  "age": 19,
  "location": "Lagos",
  "guardianName": "Parent Name",
  "guardianPhone": "+2348012345678"
}
```

Success:

```json
{
  "id": "contestant-id",
  "displayName": "Jane Star",
  "bio": "Singer",
  "age": 19,
  "location": "Lagos",
  "guardianName": "Parent Name",
  "guardianPhone": "+2348012345678",
  "status": "PENDING",
  "isPremium": false,
  "premiumExpiresAt": null,
  "totalVotes": 0,
  "totalOnlineEngagement": 0,
  "userId": "user-id",
  "competitionId": "competition-id",
  "createdAt": "2026-06-14T00:00:00.000Z",
  "updatedAt": "2026-06-14T00:00:00.000Z"
}
```

Notes:

- A user can have only one contestant profile per competition.
- If the user's role is `USER`, registration updates the role to `CONTESTANT`.
- Newly registered contestants start as `PENDING`.

`GET /api/contestants/me`

Returns current user's contestant profiles including competition.

`GET /api/contestants/me/:competitionId`

Returns the current user's contestant profile for one competition including competition.

`GET /api/contestants/:id/votes`

Success:

```json
{
  "totalVotes": 25,
  "totalCoinVotes": 25,
  "votersCount": 5
}
```

Common errors: `400`, `401`, `404`, `409`.

### Submissions

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `POST` | `/api/stages/:stageId/submissions` | Required | Any active user |
| `GET` | `/api/contestants/me/submissions` | Required | Any active user |
| `GET` | `/api/stages/:stageId/submissions` | Public | None |

`POST /api/stages/:stageId/submissions`

Body:

```json
{
  "title": "My stage entry",
  "description": "Optional description",
  "videoUrl": "https://example.com/video.mp4",
  "uploadUrl": "https://example.com/uploaded-file",
  "cloudinaryPublicId": "novorivera/entry",
  "cloudinarySecureUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
  "uploadedFileMeta": {
    "bytes": 1048576,
    "duration": 30.5
  }
}
```

Success:

```json
{
  "id": "submission-id",
  "title": "My stage entry",
  "description": "Optional description",
  "videoUrl": "https://example.com/video.mp4",
  "uploadUrl": "https://example.com/uploaded-file",
  "youtubeUrl": null,
  "youtubeVideoId": null,
  "tiktokUrl": null,
  "facebookUrl": null,
  "instagramUrl": null,
  "externalVideoUrl": null,
  "thumbnailUrl": null,
  "cloudinarySecureUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
  "status": "APPROVED",
  "adminNote": null,
  "contestantId": "contestant-id",
  "stageId": "stage-id",
  "createdAt": "2026-06-14T00:00:00.000Z",
  "updatedAt": "2026-06-14T00:00:00.000Z"
}
```

Rules:

- Stage must exist.
- Current user must have a contestant profile in the stage competition. Missing profiles should register first through `/api/competitions/:competitionId/contestants`. `REJECTED` and `ELIMINATED` contestants receive `Your account or contestant profile is not allowed to submit entries. Please contact support.`
- Current time must be inside the stage submission window when dates are set.
- One submission per contestant per stage.

Common errors: `400` outside window, missing contestant registration, or blocked contestant profile; `401`, `404`, `409`.

### Leaderboard

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `GET` | `/api/competitions/:competitionId/leaderboard` | Public | None |

Query params:

- `featuredFirst=true`: premium contestants sort before non-premium contestants.
- `mode=votes`: sort by `totalVotes`. Default.
- `mode=engagement`: sort by `totalOnlineEngagement`.
- `mode=combined`: sort by `totalVotes + totalOnlineEngagement`.
- `engagementWeight=50`: combined mode engagement weight. Default `50`.
- `tokenWeight=50`: combined mode token vote weight. Default `50`.

Combined mode uses simple normalization:

- Highest engagement gets full `engagementWeight`.
- Highest token votes gets full `tokenWeight`.
- Other contestants are proportional.
- `combinedScore = engagementScore + tokenScore`.

Success:

```json
[
  {
    "rank": 1,
    "entrantCount": 25,
    "contestantId": "contestant-id",
    "displayName": "Jane Star",
    "photoUrl": "https://res.cloudinary.com/cloud/image/upload/novorivera/photo.jpg",
    "status": "APPROVED",
    "isPremium": true,
    "totalVotes": 100,
    "totalOnlineEngagement": 20,
    "engagementScore": 50,
    "tokenScore": 50,
    "combinedScore": 100,
    "videoUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
    "uploadUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
    "cloudinarySecureUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
    "externalVideoUrl": "https://example.com/video",
    "tiktokUrl": "https://www.tiktok.com/@novo/video/123",
    "facebookUrl": "https://facebook.com/reel/123",
    "youtubeUrl": "https://youtube.com/watch?v=abc123",
    "thumbnailUrl": "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    "latestVideoUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
    "latestUploadUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
    "latestCloudinarySecureUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
    "latestExternalVideoUrl": "https://example.com/video",
    "latestTiktokUrl": "https://www.tiktok.com/@novo/video/123",
    "latestFacebookUrl": "https://facebook.com/reel/123",
    "latestYoutubeUrl": "https://youtube.com/watch?v=abc123",
    "latestThumbnailUrl": "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    "latestSubmission": {
      "id": "submission-id",
      "title": "My entry",
      "videoUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
      "uploadUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
      "cloudinarySecureUrl": "https://res.cloudinary.com/cloud/video/upload/entry.mp4",
      "externalVideoUrl": "https://example.com/video",
      "tiktokUrl": "https://www.tiktok.com/@novo/video/123",
      "facebookUrl": "https://facebook.com/reel/123",
      "youtubeUrl": "https://youtube.com/watch?v=abc123",
      "thumbnailUrl": "https://img.youtube.com/vi/abc123/hqdefault.jpg"
    }
  }
]
```

Registered entrants are included unless their contestant profile is `REJECTED` or `ELIMINATED`. Leaderboard rows include `photoUrl`, `totalVotes`, `totalOnlineEngagement`, `rank`, `entrantCount`, direct video fields from the latest approved visible submission, compatibility `latest*` video aliases, and `latestSubmission` when available. Rejected or deleted submissions are not returned.

Common errors: `404` competition not found.

### Winners

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `GET` | `/api/competitions/:competitionId/winners` | Public | None |

Success:

```json
[
  {
    "id": "winner-id",
    "placement": "FIRST",
    "prizeAmount": "₦500,000",
    "totalVotes": 100,
    "totalOnlineEngagement": 150,
    "engagementScore": 50,
    "tokenScore": 50,
    "combinedScore": 100,
    "competitionId": "competition-id",
    "contestantId": "contestant-id",
    "declaredAt": "2026-06-14T00:00:00.000Z",
    "contestant": {
      "id": "contestant-id",
      "displayName": "Jane Star"
    }
  }
]
```

Common errors: `404` competition not found.

### Coin Packages

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `GET` | `/api/coin-packages` | Public | None |

Returns active packages only, sorted by `sortOrder` ascending then `createdAt` descending.

Success:

```json
[
  {
    "id": "coin-package-id",
    "name": "Starter Pack",
    "priceNaira": 1000,
    "coins": 100,
    "bonusCoins": 10,
    "isActive": true,
    "sortOrder": 1,
    "createdAt": "2026-06-14T00:00:00.000Z",
    "updatedAt": "2026-06-14T00:00:00.000Z"
  }
]
```

Common errors: none expected.

### Wallet

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `GET` | `/api/wallet/me` | Required | Any active user |
| `GET` | `/api/wallet/me/transactions` | Required | Any active user |

`GET /api/wallet/me`

Success:

```json
{
  "id": "wallet-id",
  "balance": 110,
  "userId": "user-id",
  "createdAt": "2026-06-14T00:00:00.000Z",
  "updatedAt": "2026-06-14T00:00:00.000Z",
  "totalPurchased": 110,
  "totalSpent": 0,
  "transactions": [
    {
      "id": "transaction-id",
      "amount": 110,
      "type": "CREDIT",
      "description": "Paystack coin purchase",
      "reference": "NR-...",
      "metadata": {
        "paymentId": "payment-id",
        "coinPackageId": "coin-package-id"
      },
      "walletId": "wallet-id",
      "userId": "user-id",
      "createdAt": "2026-06-14T00:00:00.000Z"
    }
  ]
}
```

`GET /api/wallet/me/transactions`

Returns only `CoinTransaction[]`, newest first.

Common errors: `401`.

### Votes

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `POST` | `/api/votes/cast` | Required | Any active user |
| `GET` | `/api/contestants/:id/votes` | Required | Any active user |
| `GET` | `/api/stages/:stageId/votes/summary` | Public | None |

`POST /api/votes/cast`

Body:

```json
{
  "contestantId": "contestant-id",
  "stageId": "stage-id",
  "coinsToSpend": 10
}
```

Success:

```json
{
  "vote": {
    "id": "vote-id",
    "source": "COIN",
    "quantity": 1,
    "userId": "user-id",
    "competitionId": "competition-id",
    "stageId": "stage-id",
    "contestantId": "contestant-id",
    "createdAt": "2026-06-14T00:00:00.000Z"
  },
  "wallet": {
    "id": "wallet-id",
    "balance": 100,
    "userId": "user-id",
    "createdAt": "2026-06-14T00:00:00.000Z",
    "updatedAt": "2026-06-14T00:00:00.000Z"
  },
  "coinTransaction": {
    "id": "transaction-id",
    "amount": -10,
    "type": "DEBIT",
    "description": "Vote for contestant Jane Star",
    "reference": null,
    "metadata": {
      "contestantId": "contestant-id",
      "stageId": "stage-id",
      "coinsToSpend": 10,
      "votesCredited": 1
    },
    "walletId": "wallet-id",
    "userId": "user-id",
    "createdAt": "2026-06-14T00:00:00.000Z"
  },
  "contestant": {
    "id": "contestant-id",
    "displayName": "Jane Star",
    "totalVotes": 105,
    "totalOnlineEngagement": 0,
    "status": "APPROVED"
  }
}
```

Rules:

- `coinsToSpend` must be an integer >= `10`.
- `coinsToSpend` must be divisible by `10`.
- `10` coins equal `1` vote.
- Voter wallet must have enough balance.
- Stage must be `ACTIVE`.
- Current time must be inside the stage voting window when dates are set.
- Contestant must be in the same competition as the stage.
- Rejected or eliminated contestants cannot receive votes.
- The code does not block votes for `PENDING` contestants; registered entrants stay visible unless they are `REJECTED` or `ELIMINATED`.

Common errors: `400`, `401`, `404`.

### Payments

| Method | Path | Auth | Roles |
| --- | --- | --- | --- |
| `POST` | `/api/payments/coin-purchase/init` | Required | Any active user |
| `GET` | `/api/payments/verify/:reference` | Required | Any active user |
| `GET` | `/api/payments/me` | Required | Any active user |
| `POST` | `/api/payments/webhook/paystack` | Public webhook | Valid Paystack signature |

`POST /api/payments/coin-purchase/init`

Body:

```json
{
  "coinPackageId": "coin-package-id"
}
```

Success:

```json
{
  "authorizationUrl": "https://checkout.paystack.com/...",
  "accessCode": "access_code",
  "reference": "NR-1718323200000-uuid",
  "amountNaira": 1000,
  "totalCoins": 110
}
```

`GET /api/payments/verify/:reference`

Success:

```json
{
  "payment": {
    "id": "payment-id",
    "provider": "PAYSTACK",
    "reference": "NR-1718323200000-uuid",
    "amountNaira": 1000,
    "coins": 100,
    "bonusCoins": 10,
    "totalCoins": 110,
    "status": "SUCCESS",
    "providerResponse": {},
    "paidAt": "2026-06-14T00:00:00.000Z",
    "userId": "user-id",
    "coinPackageId": "coin-package-id",
    "competitionId": null,
    "createdAt": "2026-06-14T00:00:00.000Z",
    "updatedAt": "2026-06-14T00:00:00.000Z"
  },
  "walletBalance": 110
}
```

`GET /api/payments/me`

Returns current user's `Payment[]`, newest first.

`POST /api/payments/webhook/paystack`

- Public route for Paystack.
- Requires `x-paystack-signature`.
- Handles only `charge.success`.
- Non-charge-success events return `{ "received": true, "ignored": true }`.
- Frontend should not call this route.

Common errors: `400` Paystack init/verify failure or missing secret config, `401`, `403` verifying another user's reference, `404`.

### Admin CMS

All routes require `Authorization: Bearer <admin-token>` and role `ADMIN` or `SUPER_ADMIN`.

| Method | Path |
| --- | --- |
| `GET` | `/api/admin/site-settings` |
| `PATCH` | `/api/admin/site-settings` |
| `GET` | `/api/admin/homepage` |
| `PATCH` | `/api/admin/homepage` |
| `GET` | `/api/admin/faqs` |
| `POST` | `/api/admin/faqs` |
| `PATCH` | `/api/admin/faqs/:id` |
| `DELETE` | `/api/admin/faqs/:id` |
| `GET` | `/api/admin/sponsors` |
| `POST` | `/api/admin/sponsors` |
| `PATCH` | `/api/admin/sponsors/:id` |
| `DELETE` | `/api/admin/sponsors/:id` |
| `GET` | `/api/admin/rules` |
| `PATCH` | `/api/admin/rules` |
| `GET` | `/api/admin/contact-messages` |
| `GET` | `/api/admin/contact-messages/:id` |
| `PATCH` | `/api/admin/contact-messages/:id/status` |

Example bodies:

```json
{
  "siteName": "NovoRivera",
  "siteTagline": "Online competition platform",
  "aboutTitle": "About NovoRivera",
  "aboutContent": "NovoRivera helps competitions run online.",
  "contactEmail": "hello@novorivera.com",
  "contactPhone": "+2348000000000",
  "whatsappNumber": "+2348000000000",
  "facebookUrl": "https://facebook.com/novorivera",
  "instagramUrl": "https://instagram.com/novorivera",
  "tiktokUrl": "https://tiktok.com/@novorivera",
  "youtubeUrl": "https://youtube.com/@novorivera",
  "termsUrl": "/terms",
  "privacyUrl": "/privacy"
}
```

```json
{
  "heroTitle": "Discover NovoRivera",
  "heroSubtitle": "Join, compete, and vote online.",
  "heroImageUrl": "https://example.com/hero.jpg",
  "primaryCtaText": "View Competitions",
  "primaryCtaUrl": "/competitions",
  "secondaryCtaText": "Learn More",
  "secondaryCtaUrl": "/about",
  "featuredCompetitionId": "competition-id",
  "announcementText": "Registration is open.",
  "announcementIsActive": true
}
```

```json
{
  "question": "How do I vote?",
    "answer": "Buy internal coins and vote for registered contestants.",
  "sortOrder": 1,
  "isActive": true
}
```

```json
{
  "name": "Sponsor Name",
  "logoUrl": "https://example.com/logo.png",
  "websiteUrl": "https://example.com",
  "sortOrder": 1,
  "isActive": true
}
```

```json
{
  "title": "Competition Rules",
  "content": "Rules content goes here.",
  "isActive": true
}
```

```json
{
  "status": "READ"
}
```

Success responses are the updated/created/deleted model object, except list routes return arrays. Common errors: `400`, `401`, `403`, `404`.

### Admin Coin Packages

All routes require admin auth.

| Method | Path |
| --- | --- |
| `POST` | `/api/admin/coin-packages` |
| `GET` | `/api/admin/coin-packages` |
| `PATCH` | `/api/admin/coin-packages/:id` |
| `DELETE` | `/api/admin/coin-packages/:id` |

Create/update body:

```json
{
  "name": "Starter Pack",
  "priceNaira": 1000,
  "coins": 100,
  "bonusCoins": 10,
  "isActive": true,
  "sortOrder": 1
}
```

Success: `CoinPackage` for create/update/delete. `GET /api/admin/coin-packages` returns all packages, including inactive packages, sorted by `sortOrder` ascending then `createdAt` descending.

Common errors: `400`, `401`, `403`, `404`.

### Admin Competitions

All routes require admin auth.

| Method | Path |
| --- | --- |
| `POST` | `/api/competitions` |
| `PATCH` | `/api/competitions/:id` |
| `DELETE` | `/api/competitions/:id` |
| `POST` | `/api/competitions/:competitionId/declare-winners` |

Create/update body:

```json
{
  "title": "Novo Talent 2026",
  "slug": "novo-talent-2026",
  "description": "Online talent competition",
  "bannerUrl": "https://example.com/banner.jpg",
  "status": "PUBLISHED",
  "startDate": "2026-07-01T00:00:00.000Z",
  "endDate": "2026-08-01T00:00:00.000Z",
  "prizeFirst": "First prize",
  "prizeSecond": "Second prize",
  "prizeThird": "Third prize",
  "rules": "Competition rules",
  "manualVotingEnabled": true,
  "votePriceNaira": 500,
  "paymentBankName": "Novo Bank",
  "paymentAccountName": "NovoRivera Votes",
  "paymentAccountNumber": "1234567890",
  "paymentInstructions": "Transfer and include contestant code."
}
```

The manual voting fields above are set per competition through this same create/update endpoint. When `manualVotingEnabled` is `true`, public competition detail and `GET /api/contestants/code/:contestantCode/vote-info` expose the vote price, bank name, account name, account number, and payment instructions for that competition. When `manualVotingEnabled` is `false`, public competition detail hides the payment fields and vote-info returns `404`.

Success: `Competition`.

Common errors: `400`, `401`, `403`, `404`, `409` duplicate slug.

Declare winners body:

```json
{
  "force": true
}
```

Rules:

- Uses combined leaderboard with 50% engagement and 50% token voting.
- Stores `FIRST`, `SECOND`, and `THIRD` where enough non-rejected, non-eliminated contestants exist.
- Prize amounts come from `prizeFirst`, `prizeSecond`, and `prizeThird`.
- If winners already exist, rerun requires `SUPER_ADMIN` or `{ "force": true }`.

### Admin Stages

All routes require admin auth.

| Method | Path |
| --- | --- |
| `POST` | `/api/competitions/:competitionId/stages` |
| `GET` | `/api/competitions/:competitionId/stages` |
| `PATCH` | `/api/stages/:id` |
| `DELETE` | `/api/stages/:id` |
| `POST` | `/api/stages/:stageId/eliminate-bottom` |

Create/update body:

```json
{
  "title": "Auditions",
  "stageNumber": 1,
  "description": "First stage",
  "status": "ACTIVE",
  "submissionStartDate": "2026-07-01T00:00:00.000Z",
  "submissionEndDate": "2026-07-10T23:59:59.000Z",
  "votingStartDate": "2026-07-11T00:00:00.000Z",
  "votingEndDate": "2026-07-20T23:59:59.000Z",
  "eliminationPercentage": 30
}
```

`POST /api/stages/:stageId/eliminate-bottom` success:

```json
{
  "affectedContestants": [
    {
      "id": "contestant-id",
      "displayName": "Contestant",
      "status": "ELIMINATED"
    }
  ]
}
```

Rules:

- `stageNumber` must be unique per competition.
- Only one `ACTIVE` stage is allowed per competition.
- `eliminationPercentage` must be between `0` and `100`.

Common errors: `400`, `401`, `403`, `404`, `409`.

### Admin Contestants

All routes require admin auth.

| Method | Path |
| --- | --- |
| `GET` | `/api/admin/contestants` |
| `GET` | `/api/admin/contestants/:id` |
| `PATCH` | `/api/admin/contestants/:id/status` |
| `PATCH` | `/api/admin/contestants/:id/premium` |
| `POST` | `/api/admin/contestants/:contestantId/engagement` |

Status body:

```json
{
  "status": "APPROVED"
}
```

Premium body:

```json
{
  "isPremium": true,
  "premiumExpiresAt": "2026-08-01T00:00:00.000Z"
}
```

Engagement body:

```json
{
  "stageId": "stage-id",
  "views": 100,
  "likes": 25,
  "comments": 10,
  "shares": 5,
  "watchScore": 10,
  "platform": "TIKTOK",
  "note": "Imported from manual review"
}
```

Backward compatible simple body:

```json
{
  "onlineEngagementCount": 25,
  "note": "Imported from manual review"
}
```

Breakdown total is computed as `views + likes + comments + shares + watchScore`.

Success: contestant object. Lists include related `user` and `competition`, plus `photoUrl`, `photoPublicId`, and `photoMeta` when set.

Common errors: `400`, `401`, `403`, `404`.

### Admin Submissions

All routes require admin auth.

| Method | Path |
| --- | --- |
| `GET` | `/api/admin/submissions` |
| `PATCH` | `/api/admin/submissions/:id/status` |
| `PATCH` | `/api/admin/submissions/:id/youtube` |

Status body:

```json
{
  "status": "APPROVED",
  "adminNote": "Looks good"
}
```

YouTube body:

```json
{
  "youtubeUrl": "https://youtube.com/watch?v=abc123",
  "youtubeVideoId": "abc123",
  "tiktokUrl": "https://www.tiktok.com/@novo/video/123",
  "facebookUrl": "https://facebook.com/reel/123",
  "instagramUrl": "https://instagram.com/reel/123",
  "externalVideoUrl": "https://example.com/video",
  "thumbnailUrl": "https://img.youtube.com/vi/abc123/hqdefault.jpg"
}
```

Success: submission object. Admin list includes contestant, contestant user, contestant competition, and stage.

All new entries are stored as `APPROVED`, appear publicly immediately, and appear in the admin dashboard under **Submissions**. Admins moderate content after upload, reject or delete invalid/inappropriate entries, and can update YouTube, TikTok, Facebook, Instagram, external video, and thumbnail links.

Common errors: `400`, `401`, `403`, `404`.

### Admin Wallets

All routes require admin auth.

| Method | Path |
| --- | --- |
| `GET` | `/api/admin/wallets` |
| `GET` | `/api/admin/wallets/:userId` |
| `POST` | `/api/admin/wallets/:userId/adjust` |

Adjust body:

```json
{
  "amount": 50,
  "reason": "Manual credit for support correction"
}
```

Use a negative `amount` to subtract coins. The backend rejects `0` and rejects adjustments that would make balance negative.

Success:

```json
{
  "wallet": {
    "id": "wallet-id",
    "balance": 160,
    "userId": "user-id",
    "createdAt": "2026-06-14T00:00:00.000Z",
    "updatedAt": "2026-06-14T00:00:00.000Z"
  },
  "transaction": {
    "id": "transaction-id",
    "amount": 50,
    "type": "ADJUSTMENT",
    "description": "Manual credit for support correction",
    "reference": null,
    "metadata": {
      "actorId": "admin-user-id"
    },
    "walletId": "wallet-id",
    "userId": "user-id",
    "createdAt": "2026-06-14T00:00:00.000Z"
  }
}
```

Common errors: `400`, `401`, `403`, `404`.

### Admin Votes

All routes require admin auth.

| Method | Path |
| --- | --- |
| `GET` | `/api/admin/votes` |
| `GET` | `/api/admin/exports/votes.csv` |

Success: `Vote[]` including `user`, `contestant`, `stage`, and `competition`.

Common errors: `401`, `403`.

### Admin Payments

All routes require admin auth.

| Method | Path |
| --- | --- |
| `GET` | `/api/admin/payments` |
| `GET` | `/api/admin/exports/payments.csv` |

Success: `Payment[]` including `user` and `coinPackage`, newest first.

Common errors: `401`, `403`.

### Admin Users

All routes require admin auth.

| Method | Path |
| --- | --- |
| `GET` | `/api/admin/users` |
| `GET` | `/api/admin/users/:id` |
| `PATCH` | `/api/admin/users/:id/status` |
| `GET` | `/api/admin/audit-logs` |
| `GET` | `/api/admin/exports/contestants.csv` |

`GET /api/admin/users` success:

```json
{
  "users": [
    {
      "id": "user-id",
      "name": "Jane Rivera",
      "email": "jane@example.com",
      "phone": "+2348012345678",
      "role": "USER",
      "isActive": true,
      "createdAt": "2026-06-14T00:00:00.000Z",
      "updatedAt": "2026-06-14T00:00:00.000Z"
    }
  ]
}
```

Status body:

```json
{
  "isActive": false
}
```

Success for single/status routes:

```json
{
  "user": {
    "id": "user-id",
    "name": "Jane Rivera",
    "email": "jane@example.com",
    "phone": "+2348012345678",
    "role": "USER",
    "isActive": false,
    "createdAt": "2026-06-14T00:00:00.000Z",
    "updatedAt": "2026-06-14T00:00:00.000Z"
  }
}
```

Common errors: `400`, `401`, `403`, `404`.

`GET /api/admin/audit-logs`

Query params:

- `page`: default `1`.
- `limit`: default `20`, max `100`.
- `action`: optional exact action filter, for example `ENGAGEMENT_UPDATE`.

Success:

```json
{
  "items": [
    {
      "id": "audit-id",
      "action": "ENGAGEMENT_UPDATE",
      "entity": "Contestant",
      "entityId": "contestant-id",
      "metadata": {},
      "actorId": "admin-user-id",
      "createdAt": "2026-06-14T00:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1,
  "totalPages": 1
}
```

CSV export endpoints return `text/csv; charset=utf-8` with attachment filenames.

## Frontend Implementation Notes

### Token Storage

- Store the JWT returned from `/api/auth/register` or `/api/auth/login` in the frontend's auth storage.
- Prefer an app-level auth abstraction that can later move from `localStorage` to an httpOnly cookie if the backend adds cookie auth.
- This backend currently reads only `Authorization: Bearer <token>`.

Attach token:

```ts
await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/wallet/me`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### Route Categories

Public routes:

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/site-settings`
- `GET /api/homepage`
- `GET /api/faqs`
- `GET /api/sponsors`
- `GET /api/rules`
- `POST /api/contact`
- `GET /api/competitions`
- `GET /api/competitions/:id`
- `GET /api/competitions/:competitionId/leaderboard`
- `GET /api/competitions/:competitionId/winners`
- `GET /api/contestants/:id`
- `GET /api/stages/:stageId/submissions`
- `GET /api/stages/:stageId/votes/summary`
- `GET /api/coin-packages`
- `POST /api/payments/webhook/paystack` is public for Paystack only; frontend should not call it.

User-auth routes:

- `GET /api/auth/me`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `PATCH /api/users/me/password`
- `POST /api/uploads/video`
- `POST /api/uploads/image`
- `POST /api/competitions/:competitionId/contestants`
- `GET /api/contestants/me`
- `GET /api/contestants/me/:competitionId`
- `PATCH /api/contestants/me/:competitionId/photo`
- `GET /api/contestants/me/submissions`
- `GET /api/contestants/:id/votes`
- `GET /api/contestants/code/:contestantCode`
- `GET /api/contestants/code/:contestantCode/vote-info`
- `POST /api/public-votes`
- `POST /api/stages/:stageId/submissions`
- `GET /api/wallet/me`
- `GET /api/wallet/me/transactions`
- `POST /api/votes/cast`
- `POST /api/payments/coin-purchase/init`
- `GET /api/payments/verify/:reference`
- `GET /api/payments/me`

Admin-auth routes:

- All `/api/admin/*` routes.
- `POST /api/admin/ads`
- `GET /api/admin/ads`
- `GET /api/admin/ads/:id`
- `PATCH /api/admin/ads/:id`
- `DELETE /api/admin/ads/:id`
- `GET /api/admin/public-votes`
- `GET /api/admin/public-votes/:id`
- `PATCH /api/admin/public-votes/:id/status`
- `POST /api/admin/coin-packages`
- `GET /api/admin/coin-packages`
- `PATCH /api/admin/coin-packages/:id`
- `DELETE /api/admin/coin-packages/:id`
- `POST /api/competitions`
- `PATCH /api/competitions/:id`
- `DELETE /api/competitions/:id`
- `POST /api/competitions/:competitionId/declare-winners`
- `POST /api/competitions/:competitionId/stages`
- `GET /api/competitions/:competitionId/stages`
- `PATCH /api/stages/:id`
- `DELETE /api/stages/:id`
- `POST /api/stages/:stageId/eliminate-bottom`

### Paystack Flow

1. User selects an active coin package from `GET /api/coin-packages`.
2. Frontend calls `POST /api/payments/coin-purchase/init` with `{ "coinPackageId": "..." }`.
3. Backend calculates amount and coins server-side, creates a `PENDING` payment, initializes Paystack, and returns `authorizationUrl`, `accessCode`, `reference`, `amountNaira`, and `totalCoins`.
4. Frontend redirects the browser to `authorizationUrl` or opens Paystack checkout with the returned data.
5. After Paystack redirects back to the frontend, call `GET /api/payments/verify/:reference` with the user's Bearer token.
6. On Paystack success, backend marks the payment `SUCCESS`, credits the wallet once, and creates a `CREDIT` coin transaction.
7. Webhook `POST /api/payments/webhook/paystack` also processes `charge.success` idempotently. The frontend should not call the webhook route.

### Coin Purchase Flow

1. Load packages with `GET /api/coin-packages`.
2. Require login before purchase.
3. Initialize purchase through `/api/payments/coin-purchase/init`.
4. Complete Paystack checkout.
5. Verify with `/api/payments/verify/:reference`.
6. Refresh wallet with `/api/wallet/me`.
7. Show payment history from `/api/payments/me`.

### Manual Public Voting Flow

1. Contestant registers/logs in and shares `/contestants/[id]` or a code-based frontend route.
2. Public profile shows `contestantCode` and a Vote Now action.
3. Vote Now loads `/api/contestants/code/:contestantCode/vote-info`.
4. Voter transfers to the returned bank account and uses `requiredNarration` as the transfer narration.
5. Voter submits details and optional proof image URL to `/api/public-votes`.
6. Admin reviews `/api/admin/public-votes` and approves or rejects with `/api/admin/public-votes/:id/status`.
7. Approved manual vote payments update `totalVotes`; pending/rejected payments do not count.

### Legacy Coin Voting Flow

1. Load competition detail with `/api/competitions/:id`.
2. Load leaderboard with `/api/competitions/:competitionId/leaderboard`.
3. Load user's wallet with `/api/wallet/me`.
4. Require login and enough coins before calling `/api/votes/cast`.
5. Send `contestantId`, `stageId`, and integer `coinsToSpend`.
6. On success, update displayed wallet balance from response and refresh leaderboard/stats.
7. For weighted winner views, use leaderboard `mode=combined&engagementWeight=50&tokenWeight=50`.

### Sponsored Ads Flow

1. Admin uploads optional creative assets with `/api/uploads/image` or `/api/uploads/video`.
2. Admin creates an ad through `/api/admin/ads` with placement, destination URL fields, status, and optional date window.
3. Frontend loads ads by page slot with `/api/ads?placement=HOME_TOP`, `/api/ads?placement=LEADERBOARD`, and similar placement values.
4. Frontend renders ads in existing page space only; voting and submission actions must remain uninterrupted.
5. When an ad is visible, call `/api/ads/:id/impression`.
6. When a user clicks, call `/api/ads/:id/click` and open `targetUrl`, `whatsappUrl`, or `socialUrl`.

### Contestant Registration And Submission Flow

1. User registers/logs in.
2. Frontend loads competition detail from `/api/competitions/:id`.
3. User submits contestant profile to `/api/competitions/:competitionId/contestants`.
4. Contestant starts as `PENDING`; the entrant can continue immediately. Admin can approve, reject, or eliminate the contestant later with `/api/admin/contestants/:id/status`.
5. Optional photo path: upload an image to `/api/uploads/image`, then set `secureUrl`, `publicId`, and optional response metadata through `/api/contestants/me/:competitionId/photo`.
6. Optional video path: upload video to `/api/uploads/video`, then send `secureUrl` as `videoUrl` and/or `uploadUrl`. Manual URL submission still works.
7. Registered contestants can submit immediately to open submission stages through `/api/stages/:stageId/submissions`; only `REJECTED` and `ELIMINATED` contestant profiles are blocked.
8. One submission is allowed per contestant per stage.
9. Submission starts as `APPROVED`, appears publicly immediately, and appears in the admin dashboard under **Submissions**; admin removes, rejects, or moderates spam, bots, scammers, invalid, or inappropriate entries through admin contestant/submission status tools.
10. Admin can attach YouTube, TikTok, Facebook, Instagram, external video, and thumbnail links through `/api/admin/submissions/:id/youtube`.
11. Public stage submissions list visible submissions and exclude only rejected submissions or rejected/eliminated contestants.
12. TikTok/Facebook/Instagram metrics are entered manually through the admin engagement endpoint; there is no external social API integration yet.

## Suggested Frontend Routes

- `/` -> homepage using `/api/homepage`, `/api/site-settings`, `/api/faqs`, `/api/sponsors`, and competitions.
- `/competitions` -> competition listing from `/api/competitions`.
- `/competitions/[id-or-slug]` -> competition detail. Backend supports id only; if using slug in URL, frontend must first resolve from `/api/competitions`.
- `/contestants/[id]` -> public contestant profile from `/api/contestants/:id`.
- `/vote/[contestantCode]` -> `/api/contestants/code/:contestantCode/vote-info` and `/api/public-votes`.
- `/leaderboard/[competitionId]` -> `/api/competitions/:competitionId/leaderboard`.
- `/login` -> `/api/auth/login`.
- `/register` -> `/api/auth/register`.
- `/dashboard` -> `/api/auth/me`, `/api/users/me`, `/api/contestants/me`.
- `/dashboard/wallet` -> `/api/wallet/me`, `/api/wallet/me/transactions`, `/api/payments/me`, `/api/coin-packages`.
- `/dashboard/submissions` -> `/api/contestants/me/submissions`.
- `/admin` -> admin overview using admin list endpoints.
- `/admin/competitions` -> admin competition and stage management.
- `/admin/contestants` -> `/api/admin/contestants`.
- `/admin/submissions` -> `/api/admin/submissions`.
- `/admin/payments` -> `/api/admin/payments`.
- `/admin/public-votes` -> `/api/admin/public-votes`.
- `/admin/cms` -> `/api/admin/site-settings`, `/api/admin/homepage`, `/api/admin/faqs`, `/api/admin/sponsors`, `/api/admin/rules`, `/api/admin/contact-messages`.
- `/admin/ads` -> `/api/admin/ads`.

## Warnings

- Do not hardcode fake endpoints.
- Do not invent fields.
- Always update this document when backend endpoints, DTOs, Prisma models, auth rules, or response shapes change.
- Frontend must use `NEXT_PUBLIC_API_URL` for the backend origin.
- Backend route params named `:id` for competition detail/update/delete are ids, not slugs.
- Cloudinary credentials are backend-only; frontend should only use returned upload URLs/public ids.
- Coins are internal platform credits only. There is no blockchain, cryptocurrency, withdrawal, transfer, or refund endpoint in this backend.
