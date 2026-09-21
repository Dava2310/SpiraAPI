import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';

import { Roles } from '../common/decorators/index.js';
import {
  MessageResponseDto,
  PaginatedResponseDto,
} from '../common/dto/index.js';
import type { RequestWithUser } from '../common/interfaces/index.js';
import {
  ContactResponseDto,
  CreateContactDto,
  UpdateContactDto,
} from '../contacts/dto/index.js';
import { DonationReceiptResponseDto } from '../donation-receipts/dto/index.js';
import {
  RecipientResponseDto,
  UpdateRecipientDto,
} from '../recipients/dto/index.js';
import { UrgencyThreshold } from '../recipients/enums/urgency-threshold.enum.js';
import { ImpactReportResponseDto } from '../retailer-portal/dto/index.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import {
  CreateReservationDto,
  PartnerLocationResponseDto,
  QueryReservationsDto,
  QuerySurplusPackagesDto,
  ReservationCountsDto,
  ReservationResponseDto,
  SurplusPackagesResponseDto,
  UpdateNotificationPreferencesDto,
  VerificationPassResponseDto,
} from './dto/index.js';
import { RecipientPortalService } from './recipient-portal.service.js';
import { ReservationsService } from './reservations.service.js';
import { SurplusService } from './surplus.service.js';

@ApiTags('recipient-portal')
@ApiExtraModels(
  PaginatedResponseDto,
  ReservationResponseDto,
  DonationReceiptResponseDto,
)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked token.' })
@ApiForbiddenResponse({
  description: 'The account does not act for a recipient.',
})
@Roles(UserRole.RECIPIENT)
@Controller('recipients/me')
export class RecipientPortalController {
  constructor(
    private readonly recipientPortalService: RecipientPortalService,
    private readonly reservationsService: ReservationsService,
    private readonly surplusService: SurplusService,
  ) {}

  /**
   * Retrieves the caller's own organization profile.
   * @param request The authenticated request.
   * @returns A Promise that resolves with the profile.
   */
  @Get()
  @ApiOperation({ summary: "Get the caller's own recipient profile" })
  @ApiOkResponse({ description: 'The profile.', type: RecipientResponseDto })
  async findProfile(
    @Req() request: RequestWithUser,
  ): Promise<RecipientResponseDto> {
    return await this.recipientPortalService.findProfile(request.user);
  }

  /**
   * Edits the caller's own organization profile.
   * @param request The authenticated request.
   * @param updateRecipientDto The new values.
   * @returns A Promise that resolves with the updated profile.
   */
  @Patch()
  @ApiOperation({ summary: "Update the caller's own recipient profile" })
  @ApiBody({ type: UpdateRecipientDto, description: 'New profile values.' })
  @ApiOkResponse({
    description: 'The updated profile.',
    type: RecipientResponseDto,
  })
  async updateProfile(
    @Req() request: RequestWithUser,
    @Body() updateRecipientDto: UpdateRecipientDto,
  ): Promise<RecipientResponseDto> {
    return await this.recipientPortalService.updateProfile(
      request.user,
      updateRecipientDto,
    );
  }

  /**
   * Retrieves the open surplus shelf near the caller.
   * @param request The authenticated request.
   * @param query The filters, ordering and page.
   * @returns A Promise that resolves with one page of stores and the counts.
   */
  @Get('surplus-packages')
  @ApiOperation({ summary: 'Browse claimable surplus near the caller' })
  @ApiOkResponse({
    description: 'One page of stores with their availability summaries.',
    type: SurplusPackagesResponseDto,
  })
  async findSurplusPackages(
    @Req() request: RequestWithUser,
    @Query() query: QuerySurplusPackagesDto,
  ): Promise<SurplusPackagesResponseDto> {
    const recipient = await this.recipientPortalService.resolveRecipient(
      request.user,
    );

    return await this.surplusService.findPackages(
      recipient,
      query,
      await this.recipientPortalService.findOrigin(recipient),
    );
  }

  /**
   * Retrieves the surplus worth alerting the caller about.
   * @param request The authenticated request.
   * @param radiusKm Override for the saved radius.
   * @param urgencyThreshold Override for the saved threshold.
   * @param maxHoursLeft Only alert on stock expiring within this many hours.
   * @returns A Promise that resolves with the stores worth acting on.
   */
  @Get('alerts/urgent')
  @ApiOperation({
    summary: 'Get urgent surplus alerts, using the saved preferences',
  })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number })
  @ApiQuery({
    name: 'urgencyThreshold',
    required: false,
    enum: UrgencyThreshold,
    enumName: 'UrgencyThreshold',
  })
  @ApiQuery({ name: 'maxHoursLeft', required: false, type: Number })
  @ApiOkResponse({
    description: 'The stores worth acting on.',
    type: SurplusPackagesResponseDto,
  })
  async findUrgentAlerts(
    @Req() request: RequestWithUser,
    @Query('radiusKm', new ParseIntPipe({ optional: true }))
    radiusKm?: number,
    @Query('urgencyThreshold') urgencyThreshold?: UrgencyThreshold,
    @Query('maxHoursLeft', new ParseIntPipe({ optional: true }))
    maxHoursLeft?: number,
  ): Promise<SurplusPackagesResponseDto> {
    const recipient = await this.recipientPortalService.resolveRecipient(
      request.user,
    );

    return await this.surplusService.findUrgentAlerts(
      recipient,
      await this.recipientPortalService.findOrigin(recipient),
      radiusKm,
      urgencyThreshold,
      maxHoursLeft,
    );
  }

  /**
   * Claims lots off the shelf.
   * @param request The authenticated request.
   * @param createReservationDto What is being claimed, and when.
   * @returns A Promise that resolves with the reservation, pass included.
   */
  @Post('reservations')
  @ApiOperation({ summary: 'Claim surplus off the shelf' })
  @ApiBody({ type: CreateReservationDto, description: 'What to claim.' })
  @ApiCreatedResponse({
    description: 'The reservation, including the pickup pass.',
    type: ReservationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'The pickup window is missing or invalid.',
  })
  @ApiNotFoundResponse({ description: 'The store was not found.' })
  @ApiConflictResponse({
    description:
      'Some lots were claimed first. The body carries `unavailableItemIds`.',
  })
  async claim(
    @Req() request: RequestWithUser,
    @Body() createReservationDto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    const recipient = await this.recipientPortalService.resolveRecipient(
      request.user,
    );

    return await this.reservationsService.claim(
      recipient,
      request.user,
      createReservationDto,
    );
  }

  /**
   * Lists the caller's reservations.
   * @param request The authenticated request.
   * @param query The filters and page.
   * @returns A Promise that resolves with one page of reservations.
   */
  @Get('reservations')
  @ApiOperation({ summary: "Get the caller's reservations" })
  @ApiOkResponse({
    description: 'One page of reservations.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginatedResponseDto) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(ReservationResponseDto) },
            },
          },
        },
      ],
    },
  })
  async findReservations(
    @Req() request: RequestWithUser,
    @Query() query: QueryReservationsDto,
  ): Promise<PaginatedResponseDto<ReservationResponseDto>> {
    const recipient = await this.recipientPortalService.resolveRecipient(
      request.user,
    );

    return await this.reservationsService.findAll(recipient, query);
  }

  /**
   * Counts the caller's active reservations, split into today and later.
   * @param request The authenticated request.
   * @returns A Promise that resolves with the three counts.
   */
  @Get('reservations/counts')
  @ApiOperation({ summary: 'Count active reservations' })
  @ApiOkResponse({ description: 'The counts.', type: ReservationCountsDto })
  async countReservations(
    @Req() request: RequestWithUser,
  ): Promise<ReservationCountsDto> {
    const recipient = await this.recipientPortalService.resolveRecipient(
      request.user,
    );

    return await this.reservationsService.counts(recipient);
  }

  /**
   * Reads one of the caller's reservations.
   * @param request The authenticated request.
   * @param id The reservation ID.
   * @returns A Promise that resolves with the reservation.
   */
  @Get('reservations/:id')
  @ApiOperation({ summary: 'Get one reservation with its lines and pass' })
  @ApiParam({ name: 'id', description: 'Reservation ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'The reservation.',
    type: ReservationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'The reservation was not found.' })
  async findReservation(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReservationResponseDto> {
    const recipient = await this.recipientPortalService.resolveRecipient(
      request.user,
    );

    return await this.reservationsService.findOne(recipient, id);
  }

  /**
   * Lists the caller's completed collections.
   * @param request The authenticated request.
   * @param locationId Narrow to one store.
   * @param from Inclusive lower bound on the issue date.
   * @param to Exclusive upper bound on the issue date.
   * @param limit How many to return.
   * @param cursor Where to resume.
   * @returns A Promise that resolves with one page of certificates.
   */
  @Get('pickups')
  @ApiOperation({ summary: "Get the caller's collection history" })
  @ApiQuery({ name: 'locationId', required: false, format: 'uuid' })
  @ApiQuery({ name: 'from', required: false, format: 'date-time' })
  @ApiQuery({ name: 'to', required: false, format: 'date-time' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiOkResponse({
    description: 'One page of custody certificates.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginatedResponseDto) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(DonationReceiptResponseDto) },
            },
          },
        },
      ],
    },
  })
  async findPickups(
    @Req() request: RequestWithUser,
    @Query('locationId') locationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('cursor') cursor?: string,
  ): Promise<PaginatedResponseDto<DonationReceiptResponseDto>> {
    return await this.recipientPortalService.findPickups(
      request.user,
      locationId,
      from,
      to,
      limit,
      cursor,
    );
  }

  /**
   * Lists the stores the caller has collected from, for the history filter.
   * @param request The authenticated request.
   * @returns A Promise that resolves with the stores and their counts.
   */
  @Get('partner-locations')
  @ApiOperation({ summary: 'Get the stores the caller has collected from' })
  @ApiOkResponse({
    description: 'The stores and their pickup counts.',
    type: [PartnerLocationResponseDto],
  })
  async findPartnerLocations(
    @Req() request: RequestWithUser,
  ): Promise<PartnerLocationResponseDto[]> {
    return await this.recipientPortalService.findPartnerLocations(request.user);
  }

  /**
   * Retrieves a period-scoped impact report for the caller's organization.
   * @param request The authenticated request.
   * @param period The period as `YYYY` or `YYYY-MM`.
   * @returns A Promise that resolves with the report.
   */
  @Get('impact')
  @ApiOperation({ summary: "Get the caller's period impact report" })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Period as `YYYY` or `YYYY-MM`. Defaults to the current year.',
    example: '2026-09',
  })
  @ApiOkResponse({
    description: 'The impact report.',
    type: ImpactReportResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The period is malformed.' })
  async findImpact(
    @Req() request: RequestWithUser,
    @Query('period') period?: string,
  ): Promise<ImpactReportResponseDto> {
    return await this.recipientPortalService.findImpact(request.user, period);
  }

  /**
   * Retrieves the organization's permanent verification pass.
   * @param request The authenticated request.
   * @returns A Promise that resolves with the pass.
   */
  @Get('verification-pass')
  @ApiOperation({ summary: "Get the organization's permanent verification QR" })
  @ApiOkResponse({
    description: 'The verification pass.',
    type: VerificationPassResponseDto,
  })
  async findVerificationPass(
    @Req() request: RequestWithUser,
  ): Promise<VerificationPassResponseDto> {
    return await this.recipientPortalService.findVerificationPass(request.user);
  }

  /**
   * Lists the organization's authorised staff.
   * @param request The authenticated request.
   * @returns A Promise that resolves with the contacts.
   */
  @Get('contacts')
  @ApiOperation({ summary: "Get the organization's authorised staff" })
  @ApiOkResponse({
    description: 'The contacts.',
    type: [ContactResponseDto],
  })
  async findContacts(
    @Req() request: RequestWithUser,
  ): Promise<ContactResponseDto[]> {
    return await this.recipientPortalService.findContacts(request.user);
  }

  /**
   * Adds an authorised staff member.
   * @param request The authenticated request.
   * @param createContactDto The person to add.
   * @returns A Promise that resolves with the created contact.
   */
  @Post('contacts')
  @ApiOperation({ summary: 'Add an authorised staff member' })
  @ApiBody({ type: CreateContactDto, description: 'The person to add.' })
  @ApiCreatedResponse({
    description: 'The created contact.',
    type: ContactResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'The payload names another organization.',
  })
  async addContact(
    @Req() request: RequestWithUser,
    @Body() createContactDto: CreateContactDto,
  ): Promise<ContactResponseDto> {
    return await this.recipientPortalService.addContact(
      request.user,
      createContactDto,
    );
  }

  /**
   * Edits one of the organization's staff members.
   * @param request The authenticated request.
   * @param id The contact to edit.
   * @param updateContactDto The new values.
   * @returns A Promise that resolves with the updated contact.
   */
  @Patch('contacts/:id')
  @ApiOperation({ summary: 'Update an authorised staff member' })
  @ApiParam({ name: 'id', description: 'Contact ID', format: 'uuid' })
  @ApiBody({ type: UpdateContactDto, description: 'New contact values.' })
  @ApiOkResponse({
    description: 'The updated contact.',
    type: ContactResponseDto,
  })
  @ApiNotFoundResponse({ description: 'The contact was not found.' })
  async updateContact(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContactDto: UpdateContactDto,
  ): Promise<ContactResponseDto> {
    return await this.recipientPortalService.updateContact(
      request.user,
      id,
      updateContactDto,
    );
  }

  /**
   * Removes one of the organization's staff members.
   * @param request The authenticated request.
   * @param id The contact to remove.
   * @returns A Promise that resolves with a success message.
   */
  @Delete('contacts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an authorised staff member' })
  @ApiParam({ name: 'id', description: 'Contact ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'The contact was removed.',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'The contact was not found.' })
  @ApiConflictResponse({
    description: 'The organization must keep at least one contact.',
  })
  async removeContact(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    return await this.recipientPortalService.removeContact(request.user, id);
  }

  /**
   * Updates the surplus alert preferences.
   * @param request The authenticated request.
   * @param preferences The new preferences.
   * @returns A Promise that resolves with the updated profile.
   */
  @Patch('notification-preferences')
  @ApiOperation({ summary: 'Update the surplus alert preferences' })
  @ApiBody({
    type: UpdateNotificationPreferencesDto,
    description: 'New preferences.',
  })
  @ApiOkResponse({
    description: 'The updated profile.',
    type: RecipientResponseDto,
  })
  async updateNotificationPreferences(
    @Req() request: RequestWithUser,
    @Body() preferences: UpdateNotificationPreferencesDto,
  ): Promise<RecipientResponseDto> {
    return await this.recipientPortalService.updateNotificationPreferences(
      request.user,
      preferences,
    );
  }
}
