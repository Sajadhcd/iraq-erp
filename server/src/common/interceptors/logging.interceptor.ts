import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userId = request.user?.userId || 'anonymous';
    const requestId = (request as any).requestId || '-';
    const now = Date.now();

    // Track metrics
    const monitoringService = (global as any).__monitoringService;
    if (monitoringService) {
      monitoringService.incrementRequests();
    }

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - now;
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        // Track response time
        if (monitoringService) {
          monitoringService.recordResponseTime(elapsed);
        }

        if (statusCode >= 500) {
          if (monitoringService) monitoringService.incrementErrors();
          this.logger.error(
            `[${requestId}] ${method} ${url} ${statusCode} ${elapsed}ms - user:${userId} ip:${ip}`,
          );
        } else if (statusCode >= 400) {
          this.logger.warn(
            `[${requestId}] ${method} ${url} ${statusCode} ${elapsed}ms - user:${userId} ip:${ip}`,
          );
        } else if (process.env.NODE_ENV !== 'production') {
          this.logger.log(
            `[${requestId}] ${method} ${url} ${statusCode} ${elapsed}ms - user:${userId}`,
          );
        }
      }),
    );
  }
}
