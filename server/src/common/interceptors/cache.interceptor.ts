import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

export const CACHE_TTL_KEY = 'cache_ttl';
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_KEY, ttl);

const responseCache = new Map<string, { data: any; expiry: number }>();

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    if (request.method !== 'GET') {
      return next.handle();
    }

    const handler = context.getHandler();
    const ttlMetadata = Reflect.getMetadata(CACHE_TTL_KEY, handler);
    const ttl = ttlMetadata || 30000;

    const cacheKey = `${request.user?.userId || 'anon'}:${request.url}`;
    const cached = responseCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return of(cached.data);
    }

    return next.handle().pipe(
      tap((data) => {
        responseCache.set(cacheKey, {
          data,
          expiry: Date.now() + ttl,
        });

        if (responseCache.size > 1000) {
          const oldestKey = responseCache.keys().next().value;
          if (oldestKey) responseCache.delete(oldestKey);
        }
      }),
    );
  }
}
