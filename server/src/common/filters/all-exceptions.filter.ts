import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any).requestId || uuidv4();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'حدث خطأ داخلي في الخادم';
    let errorResponse: any = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'string') {
        message = exResponse;
      } else if (typeof exResponse === 'object') {
        message = (exResponse as any).message || message;
        errorResponse = exResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(`[${requestId}] Unknown error: ${String(exception)}`);
    }

    const errorPayload = {
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      error: errorResponse.error || 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      requestId,
    };

    response.status(status).json(errorPayload);
  }
}
