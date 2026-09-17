import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service.js';
import { Public } from './common/decorators/index.js';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Liveness check' })
  @ApiOkResponse({ description: 'The API is up.', type: String })
  getHello(): string {
    return this.appService.getHello();
  }
}
