import { Controller, Get, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import type { RequestWithUser } from '../common/interfaces/index.js';
import { MeResponseDto } from './dto/index.js';
import { MeService } from './me.service.js';

@ApiTags('me')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked token.' })
@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  /**
   * Retrieves the caller's sign-in context: user, organization, primary branch
   * and running impact.
   * @param request The authenticated request.
   * @returns A Promise that resolves with the context as MeResponseDto.
   * @throws NotFoundException If the account no longer exists.
   */
  @Get()
  @ApiOperation({ summary: "Get the caller's own context" })
  @ApiOkResponse({ description: 'The caller context.', type: MeResponseDto })
  @ApiForbiddenResponse({
    description: 'The account is not linked to an organization yet.',
  })
  async findContext(@Req() request: RequestWithUser): Promise<MeResponseDto> {
    return await this.meService.findContext(request.user);
  }
}
