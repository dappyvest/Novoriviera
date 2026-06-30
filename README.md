# NovoRivera Backend

NestJS backend for NovoRivera, an online competition platform. This service uses PostgreSQL, Prisma, JWT-ready authentication dependencies, class-validator/class-transformer validation, CORS, and a modular NestJS structure.

Coins in this project are internal platform credits only. There is no blockchain or cryptocurrency logic.

## Requirements

- Node.js 20+
- npm
- PostgreSQL

## Setup

```bash
npm install
cp .env.example .env
```

Update `DATABASE_URL` and `JWT_SECRET` in `.env`.

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
npm run start:dev
```

The API starts on `http://localhost:3000` by default.

## Endpoints

- `GET /health` - service health check
- API routes use the `/api` prefix

### Auth

Register:

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Jane Rivera",
  "email": "jane@example.com",
  "phone": "+2348012345678",
  "password": "password123",
  "displayName": "Jane Star",
  "bio": "Singer",
  "photoUrl": "https://example.com/photo.jpg",
  "videoUrl": "https://example.com/video.mp4"
}
```

Registration is the main contestant onboarding flow. It creates the user as a
`CONTESTANT` and automatically creates a contestant profile in the current
`ACTIVE` competition, or the newest `PUBLISHED` competition when no active
competition exists. If no competition is open for registration, the API returns:
`No active competition is currently open for registration.`

Before registration, the frontend can upload optional contestant media without
authentication:

```http
POST /api/uploads/registration-image
POST /api/uploads/registration-video
Content-Type: multipart/form-data

file=<image or video file>
```

Registration images accept JPG, JPEG, PNG, and WebP up to 5 MB and upload to
`novoriviera/registration-images`. Registration videos accept MP4, MOV, WebM,
AVI, MKV, and 3GP up to 100 MB and upload to
`novoriviera/registration-videos`. Use the returned `secureUrl` and `publicId`
in the registration body. Cloudinary secrets stay backend-only.

Voters do not register. Public voting is manual bank transfer through
`POST /api/public-votes`; wallet, coin, and Paystack endpoints remain in the
backend for legacy/future use but are not required for MVP registration or
voting.

Login:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "jane@example.com",
  "password": "password123"
}
```

Current authenticated user:

```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Users

```http
GET /api/users/me
Authorization: Bearer <token>
```

```http
PATCH /api/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Novo",
  "phone": "+2348099999999"
}
```

### Admin

The admin user endpoints require `ADMIN` or `SUPER_ADMIN`.

```http
GET /api/admin/users
Authorization: Bearer <admin-token>
```

```http
GET /api/admin/users/:id
Authorization: Bearer <admin-token>
```

```http
PATCH /api/admin/users/:id/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "isActive": false
}
```

## Phase 3 Competition Engine

Competition writes require `ADMIN` or `SUPER_ADMIN`. Public reads only return `PUBLISHED` and `ACTIVE` competitions.

Create competition:

```http
POST /api/competitions
Authorization: Bearer <admin-token>
Content-Type: application/json

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
  "rules": "Competition rules"
}
```

Competition endpoints:

```http
GET /api/competitions
GET /api/competitions/:id
PATCH /api/competitions/:id
DELETE /api/competitions/:id
```

Create stage:

```http
POST /api/competitions/:competitionId/stages
Authorization: Bearer <admin-token>
Content-Type: application/json

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

Stage endpoints:

```http
GET /api/competitions/:competitionId/stages
PATCH /api/stages/:id
DELETE /api/stages/:id
POST /api/stages/:stageId/eliminate-bottom
```

Register contestant:

```http
POST /api/competitions/:competitionId/contestants
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "Jane Star",
  "bio": "Singer",
  "age": 19,
  "location": "Lagos",
  "guardianName": "Parent Name",
  "guardianPhone": "+2348012345678"
}
```

This legacy join endpoint remains available for existing clients, but new
frontend onboarding should use `POST /api/auth/register`.

Contestant endpoints:

```http
GET /api/contestants/me
GET /api/contestants/me/:competitionId
PATCH /api/contestants/me/:competitionId/photo
GET /api/admin/contestants
GET /api/admin/contestants/:id
PATCH /api/admin/contestants/:id/status
PATCH /api/admin/contestants/:id/premium
DELETE /api/admin/contestants/:id
POST /api/admin/competitions/:id/reset
POST /api/admin/competitions/:id/reset-votes
```

`DELETE /api/admin/contestants/:id` soft-removes a contestant from public
profiles, submissions, and leaderboards by marking the contestant rejected and
auditing the action. `POST /api/admin/competitions/:id/reset` archives/hides
contestants and submissions, clears public leaderboard counters/winners, audits
the reset, and preserves manual vote/payment records.
`POST /api/admin/competitions/:id/reset-votes` only resets vote data for a
competition: contestant `totalVotes` is set to `0`, manual vote payments are
rejected/archived so they no longer count, legacy vote rows are cleared, and a
`COMPETITION_VOTES_RESET` audit log is written. Users, contestants, and
submissions are not deleted.

Status update:

```json
{
  "status": "APPROVED"
}
```

Premium update:

```json
{
  "isPremium": true,
  "premiumExpiresAt": "2026-08-01T00:00:00.000Z"
}
```

Submit stage entry:

Any authenticated user can register as a contestant, upload their contestant photo, and submit a video entry after registration. Contestants can submit immediately unless their contestant profile is explicitly `REJECTED` or `ELIMINATED`, or their user account is deactivated. New submissions are publicly visible immediately and are stored as `APPROVED` by default; admins can still reject or remove bad entries after upload.

```http
POST /api/stages/:stageId/submissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My stage entry",
  "description": "Optional description",
  "videoUrl": "https://example.com/video.mp4",
  "uploadUrl": "https://example.com/uploaded-file"
}
```

Submission endpoints:

```http
GET /api/contestants/me/submissions
GET /api/stages/:stageId/submissions
GET /api/admin/submissions
PATCH /api/admin/submissions/:id/status
PATCH /api/admin/submissions/:id/youtube
```

New entries appear in the admin dashboard under **Submissions** and in public submission/leaderboard/profile responses immediately. Admins can reject or delete submissions and update their platform links after upload; invalid or inappropriate content should be removed through moderation.

Admin YouTube update:

```json
{
  "youtubeUrl": "https://youtube.com/watch?v=abc123",
  "youtubeVideoId": "abc123",
  "thumbnailUrl": "https://img.youtube.com/vi/abc123/hqdefault.jpg"
}
```

Leaderboard:

```http
GET /api/competitions/:competitionId/leaderboard
GET /api/competitions/:competitionId/leaderboard?featuredFirst=true
GET /api/competitions/:competitionId/leaderboard?mode=votes
GET /api/competitions/:competitionId/leaderboard?mode=engagement
GET /api/competitions/:competitionId/leaderboard?mode=combined
```

Leaderboard rows include registered entrants unless they are explicitly `REJECTED` or `ELIMINATED`. Each row includes `rank`, `entrantCount`, `photoUrl`, `totalVotes`, and `totalOnlineEngagement`.

## Phase 4 Coins Wallet And Voting

Coins are internal platform credits only. There is no withdrawal, transfer, cryptocurrency, blockchain, or Paystack integration in this phase.

### Coin Packages

Admin endpoints require `ADMIN` or `SUPER_ADMIN`.

```http
POST /api/admin/coin-packages
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Starter Pack",
  "priceNaira": 1000,
  "coins": 100,
  "bonusCoins": 10,
  "isActive": true,
  "sortOrder": 1
}
```

```http
GET /api/admin/coin-packages
PATCH /api/admin/coin-packages/:id
DELETE /api/admin/coin-packages/:id
GET /api/coin-packages
```

### Wallet

```http
GET /api/wallet/me
Authorization: Bearer <token>
```

```http
GET /api/wallet/me/transactions
Authorization: Bearer <token>
```

Wallet responses include `balance`, `totalPurchased`, `totalSpent`, and `transactions`.

Admin wallet endpoints:

```http
GET /api/admin/wallets
GET /api/admin/wallets/:userId
POST /api/admin/wallets/:userId/adjust
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "amount": 50,
  "reason": "Manual credit for support correction"
}
```

Use a negative `amount` to subtract coins. The API rejects adjustments that would make the balance negative.

### Voting

```http
POST /api/votes/cast
Authorization: Bearer <token>
Content-Type: application/json

{
  "contestantId": "contestant-id",
  "stageId": "stage-id",
  "coinsToSpend": 10
}
```

Rules:

- `coinsToSpend` must be at least `10` and divisible by `10`.
- `10` coins equal `1` vote.
- The voter must have enough coins.
- The stage must be `ACTIVE`.
- Voting must be inside the stage voting window.
- Rejected or eliminated contestants cannot receive votes.

Vote stats:

```http
GET /api/contestants/:id/votes
GET /api/stages/:stageId/votes/summary
GET /api/admin/votes
```

### Engagement

Admin endpoint for manually adding online engagement counts:

```http
POST /api/admin/contestants/:contestantId/engagement
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "stageId": "stage-id",
  "onlineEngagementCount": 25,
  "note": "Imported from manual review"
}
```

Audit logs are created for coin package changes, admin wallet adjustments, and engagement updates.

## Phase 5 Paystack Coin Purchase Flow

Coins remain internal platform credits only. This phase does not add withdrawals, refunds, transfers, cryptocurrency, or blockchain logic.

### Paystack Environment

Add these values to `.env`:

```env
PAYSTACK_SECRET_KEY="sk_test_replace_me"
PAYSTACK_PUBLIC_KEY="pk_test_replace_me"
APP_FRONTEND_URL="https://your-frontend.example.com"
```

Paystack webhook signatures are verified with `PAYSTACK_SECRET_KEY`, which is Paystack's expected HMAC secret for `x-paystack-signature`.

### Initialize Coin Purchase

```http
POST /api/payments/coin-purchase/init
Authorization: Bearer <token>
Content-Type: application/json

{
  "coinPackageId": "coin-package-id"
}
```

The backend validates the coin package, calculates the amount and coins server-side, creates a pending payment, initializes Paystack, and returns:

```json
{
  "authorizationUrl": "https://checkout.paystack.com/...",
  "accessCode": "access_code",
  "reference": "NR-...",
  "amountNaira": 1000,
  "totalCoins": 110
}
```

### Verify Payment

```http
GET /api/payments/verify/:reference
Authorization: Bearer <token>
```

On successful Paystack verification, the backend marks the payment `SUCCESS`, credits the user wallet once, and creates a `CoinTransaction` credit. Repeated verification is idempotent and will not double-credit coins.

### Webhook

Configure this URL in Paystack:

```http
POST /api/payments/webhook/paystack
```

The webhook is public but requires a valid `x-paystack-signature`. `charge.success` events are handled transactionally and idempotently.

### Payment History

```http
GET /api/payments/me
Authorization: Bearer <token>
```

Admin:

```http
GET /api/admin/payments
Authorization: Bearer <admin-token>
```

## Phase 6A CMS And Site Settings

CMS admin endpoints require `ADMIN` or `SUPER_ADMIN`. Public endpoints do not require authentication. Image and logo fields are URL strings only.

### Site Settings

```http
GET /api/site-settings
GET /api/admin/site-settings
PATCH /api/admin/site-settings
Authorization: Bearer <admin-token>
Content-Type: application/json

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

### Homepage

```http
GET /api/homepage
GET /api/admin/homepage
PATCH /api/admin/homepage
Authorization: Bearer <admin-token>
Content-Type: application/json

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

### FAQs

```http
GET /api/faqs
GET /api/admin/faqs
POST /api/admin/faqs
PATCH /api/admin/faqs/:id
DELETE /api/admin/faqs/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "question": "How do I vote?",
  "answer": "Buy internal coins and vote for registered contestants.",
  "sortOrder": 1,
  "isActive": true
}
```

Public FAQ responses only include active FAQs ordered by `sortOrder` ascending.

### Sponsors

```http
GET /api/sponsors
GET /api/admin/sponsors
POST /api/admin/sponsors
PATCH /api/admin/sponsors/:id
DELETE /api/admin/sponsors/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Sponsor Name",
  "logoUrl": "https://example.com/logo.png",
  "websiteUrl": "https://example.com",
  "sortOrder": 1,
  "isActive": true
}
```

Public sponsor responses only include active sponsors ordered by `sortOrder` ascending.

### Rules Page

```http
GET /api/rules
GET /api/admin/rules
PATCH /api/admin/rules
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "title": "Competition Rules",
  "content": "Rules content goes here.",
  "isActive": true
}
```

### Contact Messages

```http
POST /api/contact
Content-Type: application/json

{
  "name": "Visitor",
  "email": "visitor@example.com",
  "phone": "+2348000000000",
  "subject": "Support",
  "message": "I need help."
}
```

Admin:

```http
GET /api/admin/contact-messages
GET /api/admin/contact-messages/:id
PATCH /api/admin/contact-messages/:id/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "READ"
}
```

CMS admin changes write `AdminAuditLog` entries for settings, homepage, FAQs, sponsors, rules, and contact message status updates.

## Manual Public Voting

Manual transfer voting is the primary public voting flow. Contestants still register and log in, but voters do not create accounts. Contestants share their public profile or contestant code link, voters transfer to the configured competition bank account, include the contestant code in the transfer narration, and submit payment details for admin verification.

Contestants receive a unique `contestantCode` automatically on registration, for example `NRV-100001`. Public profiles are available by id or code:

```http
GET /api/contestants/:id
GET /api/contestants/code/:contestantCode
GET /api/contestants/code/:contestantCode/vote-info
```

`vote-info` returns the contestant summary, competition summary, `votePriceNaira`, bank/account details, payment instructions, and `requiredNarration` equal to the contestant code. `contestantCode` is included in contestant profile responses, leaderboard rows, admin contestant responses, and contestant dashboard responses.

Admins configure manual voting on competitions through the existing create/update competition payload:

```json
{
  "manualVotingEnabled": true,
  "votePriceNaira": 500,
  "paymentBankName": "Novo Bank",
  "paymentAccountName": "NovoRivera Votes",
  "paymentAccountNumber": "1234567890",
  "paymentInstructions": "Transfer and include the contestant code in narration."
}
```

Public competition detail exposes bank/payment settings only when `manualVotingEnabled` is `true`.

Voters submit transfer proof without authentication:

```http
POST /api/public-votes
Content-Type: application/json

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

For the upload button, voters can upload proof images before submitting the vote payment:

```http
POST /api/uploads/payment-proof
Content-Type: multipart/form-data

file=<jpg|jpeg|png|webp image>
```

This public endpoint requires no auth, accepts JPG, JPEG, PNG, and WebP images only, defaults to a 5 MB limit, uploads to Cloudinary under `novoriviera/payment-proofs`, and returns `secureUrl`, `publicId`, `resourceType`, `format`, and `bytes`. Use the returned `secureUrl` as `proofImageUrl` in `POST /api/public-votes`. Cloudinary secrets stay backend-only.

The API validates the contestant code, competition match, contestant eligibility, manual voting status, and minimum amount. It stores a `PENDING` manual vote payment and calculates `votesCalculated = floor(amountPaid / votePriceNaira)`. Contestant `totalVotes` is not incremented until admin approval.

Admin manual vote review endpoints require `ADMIN` or `SUPER_ADMIN`:

```http
GET /api/admin/public-votes?status=PENDING&competitionId=competition-id&contestantCode=NRV-100001
GET /api/admin/public-votes/:id
PATCH /api/admin/public-votes/:id/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "APPROVED",
  "adminNote": "Payment confirmed"
}
```

Approving a pending/rejected payment increments the contestant by `votesCalculated` once. Approving an already approved payment is idempotent and does not double-count. Rejecting an approved payment subtracts `votesCalculated` safely. Rejected pending payments do not increment votes. All status updates write `AdminAuditLog` entries with `PUBLIC_VOTE_STATUS_UPDATE`.

The old wallet/coin voting code remains in place for future use, but public manual transfer voting should be used for new voter-facing screens.

## Sponsored Ads Management

Admins can manage website ads from the dashboard. Ads are stored as `SponsoredAd` records with optional image/video creative URLs, one or more placements, destination metadata, status, date window, display priority, clicks, impressions, and calculated CTR.

Public ad endpoints:

```http
GET /api/ads?placement=HOME_TOP
POST /api/ads/:id/click
POST /api/ads/:id/impression
```

`GET /api/ads` returns only `ACTIVE` ads whose `startsAt` and `endsAt` window includes the current time. If `placement` is supplied, ads match when that location is in `placements` or the legacy `placement` field. Results are ordered by `sortOrder` ascending, then newest first. In admin UI, label `sortOrder` as **Display Priority**; lower numbers appear first. Valid placements are `HOME_TOP`, `HOME_MIDDLE`, `LEADERBOARD`, `COMPETITION_PAGE`, `CONTESTANT_PAGE`, and `VOTE_PAGE`.

Admin ad endpoints require `ADMIN` or `SUPER_ADMIN`:

```http
POST /api/admin/ads
GET /api/admin/ads
GET /api/admin/ads/:id
PATCH /api/admin/ads/:id
DELETE /api/admin/ads/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

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

`placements` is preferred. The legacy single `placement` field is still accepted for backward compatibility. Destination types are `WEBSITE`, `WHATSAPP`, `FACEBOOK`, `INSTAGRAM`, `TIKTOK`, `YOUTUBE`, and `OTHER`. If `destinationType` is `WHATSAPP` and `destinationValue` is a phone number, the backend normalizes Nigerian local numbers such as `08012345678` to `https://wa.me/2348012345678`. If `destinationValue` is already an HTTP URL, it is preserved. `targetUrl` is resolved from the destination where practical, while legacy `targetUrl`, `whatsappUrl`, and `socialUrl` are still accepted.

Admin ad responses include `placements`, `destinationType`, `destinationValue`, resolved `targetUrl`, `impressions`, `clicks`, `ctr`, `sortOrder`, and `displayPriority`. `ctr` is `clicks / impressions * 100`, or `0` when impressions is `0`.

Use existing upload routes for ad creative assets: `/api/uploads/image` for images and `/api/uploads/video` for videos. Ad videos use the same video endpoint and default to the 50 MB upload limit. Frontend ad clicks should open the resolved `targetUrl`.

Ads must be rendered in page slots only and should not interrupt voting or submission flows. Admin ad create/update/delete operations write `AdminAuditLog` entries with `SPONSORED_AD_CREATE`, `SPONSORED_AD_UPDATE`, and `SPONSORED_AD_DELETE`.

## Phase 7 Cloudinary Uploads, Public Profiles, Scoring, Winners, And MVP Polish

### Cloudinary Environment

Add these values to `.env` for backend-only signed uploads:

```env
CLOUDINARY_CLOUD_NAME="replace-with-cloud-name"
CLOUDINARY_API_KEY="replace-with-api-key"
CLOUDINARY_API_SECRET="replace-with-api-secret"
CLOUDINARY_UPLOAD_FOLDER="novorivera"
MAX_UPLOAD_SIZE_MB=100
MAX_VIDEO_UPLOAD_SIZE_MB=50
MAX_PAYMENT_PROOF_UPLOAD_SIZE_MB=5
```

Do not expose `CLOUDINARY_API_SECRET` to the frontend.

### Uploads

```http
POST /api/uploads/video
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=<video file>
```

The video upload endpoint accepts MP4, MOV, WebM, AVI, MKV, and 3GP files and uploads to Cloudinary under `CLOUDINARY_UPLOAD_FOLDER`. The maximum video size is controlled by `MAX_VIDEO_UPLOAD_SIZE_MB` (default `50` MB). Videos are written to temporary disk storage and streamed to Cloudinary rather than held in application memory. Oversized files return a JSON `413 Payload Too Large` response.

Authenticated image uploads:

```http
POST /api/uploads/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=<image file>
```

Public payment proof image uploads:

```http
POST /api/uploads/payment-proof
Content-Type: multipart/form-data

file=<jpg|jpeg|png|webp image>
```

Payment proof uploads are public so unregistered voters can submit transfer receipts. They accept only JPG, JPEG, PNG, and WebP images, default to `MAX_PAYMENT_PROOF_UPLOAD_SIZE_MB=5`, and upload to the fixed Cloudinary folder `novoriviera/payment-proofs`.

Public registration uploads:

```http
POST /api/uploads/registration-image
POST /api/uploads/registration-video
Content-Type: multipart/form-data

file=<jpg|jpeg|png|webp image or mp4|mov|webm|avi|mkv|3gp video>
```

These endpoints require no auth so new contestants can upload media before
`POST /api/auth/register`. Registration images are limited to 5 MB and upload
to `novoriviera/registration-images`. Registration videos are limited to 100 MB,
stored on temporary disk, streamed to Cloudinary, and upload to
`novoriviera/registration-videos`.

Upload response:

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

Set the uploaded image on the contestant profile for a competition:

```http
PATCH /api/contestants/me/:competitionId/photo
Authorization: Bearer <token>
Content-Type: application/json

{
  "photoUrl": "https://res.cloudinary.com/cloud/image/upload/novorivera/photo.jpg",
  "photoPublicId": "novorivera/photo",
  "photoMeta": { "format": "jpg", "bytes": 2048 }
}
```

Only the contestant profile owner can update the photo. `photoUrl` must be a valid HTTPS URL. No approval status is required for photo upload; `REJECTED` and `ELIMINATED` contestants should contact support. Cloudinary secrets remain backend-only.

Contestant submissions still support manually entered `videoUrl` and `uploadUrl`. If the frontend uploads a video first, submit the returned `secureUrl` as `videoUrl` and/or `uploadUrl`, and optionally include `cloudinaryPublicId`, `cloudinarySecureUrl`, and `uploadedFileMeta`.

### Public Contestant Profiles

```http
GET /api/contestants/:id
```

Returns registered entrant public profile data, excluding only `REJECTED` and `ELIMINATED` contestants. Public profiles include `photoUrl`, competition, status, premium state, vote/engagement totals, rank/counter fields where available, latest visible submission links, and social-share fields. Leaderboard rows include `rank`, `entrantCount`, `photoUrl`, `totalVotes`, `totalOnlineEngagement`, and latest submission video fields when available. Admin contestant responses also include photo upload metadata. Private user data and photo upload metadata are not returned publicly.

### Multi-Platform Submission Links

Admin submission link updates now support YouTube, TikTok, Facebook, Instagram, and an external video URL:

```http
PATCH /api/admin/submissions/:id/youtube
Authorization: Bearer <admin-token>
Content-Type: application/json

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

No TikTok, Facebook, Instagram, or YouTube API integration is performed. Admins enter links and metrics manually.

### Engagement Scoring

The existing engagement endpoint remains backward compatible:

```http
POST /api/admin/contestants/:contestantId/engagement
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "onlineEngagementCount": 25,
  "note": "Manual total"
}
```

It also accepts a breakdown:

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

Breakdown totals are computed as `views + likes + comments + shares + watchScore`.

### Weighted Leaderboard And Winners

```http
GET /api/competitions/:competitionId/leaderboard?mode=combined&engagementWeight=50&tokenWeight=50
```

Combined mode normalizes scores so the highest engagement receives the full engagement weight, the highest token votes receives the full token weight, and `combinedScore = engagementScore + tokenScore`.

Admin winner declaration:

```http
POST /api/competitions/:competitionId/declare-winners
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "force": true
}
```

The backend stores `FIRST`, `SECOND`, and `THIRD` placements using the combined leaderboard and competition prize fields. Reruns require `SUPER_ADMIN` or `force: true`.

Public winners:

```http
GET /api/competitions/:competitionId/winners
```

### Admin Exports And Audit Logs

```http
GET /api/admin/exports/contestants.csv
GET /api/admin/exports/payments.csv
GET /api/admin/exports/votes.csv
GET /api/admin/audit-logs?page=1&limit=20&action=ENGAGEMENT_UPDATE
Authorization: Bearer <admin-token>
```

CSV endpoints return `text/csv`. Audit logs support `page`, `limit`, and optional `action`.

### User Password Change

```http
PATCH /api/users/me/password
Authorization: Bearer <token>
Content-Type: application/json

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

## Scripts

```bash
npm run start:dev
npm run build
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
npm run test
npm run test:e2e
```

## Admin Seed

Set these values in `.env` before seeding:

```env
ADMIN_NAME="NovoRivera Super Admin"
ADMIN_EMAIL="admin@novorivera.com"
ADMIN_PASSWORD="replace-with-a-secure-admin-password"
DEMO_SEED=true
```

Then run:

```bash
npm run prisma:seed
```

The seed is idempotent. It creates or updates:

- one `SUPER_ADMIN` user and wallet
- default CMS singleton content
- one active demo competition
- three demo stages
- three active coin packages
- public FAQs
- a sponsor placeholder

Set `DEMO_SEED=false` to seed only the admin and CMS defaults.

## Project Structure

```text
src/
  admin/
  auth/
  competitions/
  contestants/
  stages/
  votes/
  wallet/
  payments/
  users/
  prisma/
  config/
```

## Prisma

The initial schema defines the core platform foundation:

- Users and roles
- Competitions, stages, and contestants
- Votes and vote sources
- Internal coin wallets and transactions
- Paystack payment records
- Admin audit logs

Business workflows are intentionally left thin so feature logic can be added module by module.
