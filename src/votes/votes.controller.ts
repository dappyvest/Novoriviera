import { Controller } from '@nestjs/common';

// Voting is now initiated through the public Paystack checkout endpoints.
// This controller intentionally exposes no authenticated coin-casting route.
@Controller('votes')
export class VotesController {}
