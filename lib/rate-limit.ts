import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from './validation';

// Global rate limiter instance
const rateLimiter = new RateLimiter(100, 15 * 60 * 1000); // 100 requests per 15 minutes

// Rate limiting middleware
export function withRateLimit(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const identifier = getClientIdentifier(request);
    
    if (!rateLimiter.isAllowed(identifier)) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(rateLimiter.getRemainingRequests(identifier) / 100 * 15 * 60)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': rateLimiter.getRemainingRequests(identifier).toString(),
            'Retry-After': Math.ceil(rateLimiter.getRemainingRequests(identifier) / 100 * 15 * 60).toString()
          }
        }
      );
    }
    
    return handler(request, ...args);
  };
}

// Get client identifier for rate limiting
function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from auth token first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // For authenticated requests, use user ID
    // Note: In production, you'd want to decode the JWT to get the user ID
    return `user:${authHeader.split('Bearer ')[1].substring(0, 10)}`;
  }
  
  // For unauthenticated requests, use IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
  return `ip:${ip}`;
}

// Specific rate limiters for different endpoints
export const importRateLimiter = new RateLimiter(10, 60 * 60 * 1000); // 10 imports per hour
export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 auth attempts per 15 minutes
export const searchRateLimiter = new RateLimiter(200, 15 * 60 * 1000); // 200 searches per 15 minutes

// Rate limiting for specific endpoints
export function withImportRateLimit(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const identifier = getClientIdentifier(request);
    
    if (!importRateLimiter.isAllowed(identifier)) {
      return NextResponse.json(
        { error: 'Import rate limit exceeded. Please try again in an hour.' },
        { status: 429 }
      );
    }
    
    return handler(request, ...args);
  };
}

export function withAuthRateLimit(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const identifier = getClientIdentifier(request);
    
    if (!authRateLimiter.isAllowed(identifier)) {
      return NextResponse.json(
        { error: 'Too many authentication attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    return handler(request, ...args);
  };
}

export function withSearchRateLimit(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const identifier = getClientIdentifier(request);
    
    if (!searchRateLimiter.isAllowed(identifier)) {
      return NextResponse.json(
        { error: 'Search rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    return handler(request, ...args);
  };
}
