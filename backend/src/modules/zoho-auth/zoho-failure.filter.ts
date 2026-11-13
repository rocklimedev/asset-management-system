import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { ZohoFailure } from './zoho-token.service';

@Catch(ZohoFailure)
export class ZohoFailureFilter implements ExceptionFilter {
  catch(error: ZohoFailure, host: ArgumentsHost) {
    const statusCode =
      error.code === 'RATE_LIMITED' ? 429 : error.code === 'RECONNECT_REQUIRED' ? 409 : 502;
    host
      .switchToHttp()
      .getResponse()
      .status(statusCode)
      .json({ statusCode, message: error.code, retryable: error.retryable });
  }
}
