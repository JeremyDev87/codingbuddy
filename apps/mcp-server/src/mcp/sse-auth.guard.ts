import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

/**
 * Guard for SSE endpoints that validates Bearer token against MCP_SSE_TOKEN env var.
 *
 * @remarks
 * - If MCP_SSE_TOKEN is not set or empty, all requests are allowed (backward compatible).
 * - If set, requests must include `Authorization: Bearer <token>` header.
 * - Uses timing-safe comparison to prevent timing attacks.
 */
@Injectable()
export class SseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SseAuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const expectedToken = process.env.MCP_SSE_TOKEN;

    // No token configured — auth disabled (backward compatible)
    if (!expectedToken) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn('SSE request rejected: missing Authorization header');
      throw new UnauthorizedException('Missing Authorization header');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
      this.logger.warn('SSE request rejected: invalid Authorization format');
      throw new UnauthorizedException('Invalid Authorization header format');
    }

    const providedToken = parts[1];

    if (!this.tokensMatch(expectedToken, providedToken)) {
      this.logger.warn('SSE request rejected: invalid token');
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }

  /**
   * Timing-safe token comparison to prevent timing attacks.
   * Handles tokens of different lengths safely.
   */
  private tokensMatch(expected: string, provided: string): boolean {
    const expectedBuf = Buffer.from(expected, 'utf-8');
    const providedBuf = Buffer.from(provided, 'utf-8');

    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }

    return timingSafeEqual(expectedBuf, providedBuf);
  }
}
