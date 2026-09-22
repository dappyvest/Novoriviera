import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class PublicVoteRateLimitGuard implements CanActivate {
  private static readonly requests = new Map<string, number[]>();
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ ip?: string; headers?: Record<string, string> }>();
    const key = request.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || request.ip || 'unknown';
    const now = Date.now();
    const recent = (PublicVoteRateLimitGuard.requests.get(key) ?? []).filter((time) => now - time < 60_000);
    if (recent.length >= 12) throw new HttpException('Too many vote payment requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    recent.push(now);
    PublicVoteRateLimitGuard.requests.set(key, recent);
    return true;
  }
}
