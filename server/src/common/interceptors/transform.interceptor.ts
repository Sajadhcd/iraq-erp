import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface ResponseFormat {
  success: boolean;
  data: any;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseFormat> {
    return next.handle().pipe(
      tap((data) => {
        // Response is already wrapped by individual controllers
        // This interceptor can be used for additional transformations
      }),
    );
  }
}
