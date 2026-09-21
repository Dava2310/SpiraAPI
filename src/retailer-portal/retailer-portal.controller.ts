import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '../common/decorators/index.js';
import type { RequestWithUser } from '../common/interfaces/index.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import {
  ImpactReportResponseDto,
  PartnerResponseDto,
  RetailerDashboardResponseDto,
} from './dto/index.js';
import { RetailerPortalService } from './retailer-portal.service.js';

@ApiTags('retailer-portal')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked token.' })
@ApiForbiddenResponse({
  description: 'The branch belongs to another retailer.',
})
@Roles(UserRole.RETAILER)
@Controller('retailer')
export class RetailerPortalController {
  constructor(private readonly retailerPortalService: RetailerPortalService) {}

  /**
   * Retrieves the retailer home screen in one call.
   * @param request The authenticated request.
   * @param locationId The branch to report on, defaulting to the primary one.
   * @returns A Promise that resolves with the dashboard.
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Get the retailer home dashboard' })
  @ApiQuery({
    name: 'locationId',
    required: false,
    format: 'uuid',
    description: 'Branch to report on. Defaults to the primary branch.',
  })
  @ApiOkResponse({
    description: 'The dashboard.',
    type: RetailerDashboardResponseDto,
  })
  async findDashboard(
    @Req() request: RequestWithUser,
    @Query('locationId') locationId?: string,
  ): Promise<RetailerDashboardResponseDto> {
    return await this.retailerPortalService.findDashboard(
      request.user,
      locationId,
    );
  }

  /**
   * Retrieves a period-scoped impact report for one branch.
   * @param request The authenticated request.
   * @param locationId The branch to report on.
   * @param period The period as `YYYY` or `YYYY-MM`.
   * @returns A Promise that resolves with the report.
   */
  @Get('locations/:locationId/impact')
  @ApiOperation({ summary: "Get a branch's period impact report" })
  @ApiParam({ name: 'locationId', description: 'Location ID', format: 'uuid' })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Period as `YYYY` or `YYYY-MM`. Defaults to the current year.',
    example: '2026',
  })
  @ApiOkResponse({
    description: 'The impact report.',
    type: ImpactReportResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The period is malformed.' })
  async findImpact(
    @Req() request: RequestWithUser,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Query('period') period?: string,
  ): Promise<ImpactReportResponseDto> {
    return await this.retailerPortalService.findImpact(
      request.user,
      locationId,
      period,
    );
  }

  /**
   * Retrieves the recipients this branch may actually donate to.
   * @param request The authenticated request.
   * @param locationId The branch whose delivery counts to report.
   * @returns A Promise that resolves with the partner list.
   */
  @Get('locations/:locationId/partners')
  @ApiOperation({ summary: "Get a branch's donation partners" })
  @ApiParam({ name: 'locationId', description: 'Location ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'The partner list.',
    type: [PartnerResponseDto],
  })
  async findPartners(
    @Req() request: RequestWithUser,
    @Param('locationId', ParseUUIDPipe) locationId: string,
  ): Promise<PartnerResponseDto[]> {
    return await this.retailerPortalService.findPartners(
      request.user,
      locationId,
    );
  }
}
