import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { MessageResponseDto } from '../common/dto/index.js';
import type { RequestWithUser } from '../common/interfaces/index.js';
import { DonationReceiptCreatedResponseDto } from '../donation-receipts/dto/index.js';
import { DonationsService } from './donations.service.js';
import {
  AcceptDonationDto,
  AddDonationLinesDto,
  CancelDonationDto,
  ConfirmDonationDto,
  CreateDonationDto,
  DeclineDonationDto,
  DonationCreatedResponseDto,
  DonationResponseDto,
  OfferDonationDto,
  PickupTokenResponseDto,
  UpdateDonationDto,
} from './dto/index.js';
import { DonationStatus } from './enums/donation-status.enum.js';

@ApiTags('donations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked token.' })
@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  /**
   * Retrieves every donation, newest first.
   * @returns A Promise that resolves with an array of DonationResponseDto.
   */
  @Get()
  @ApiOperation({ summary: 'Get all donations' })
  @ApiOkResponse({
    description: 'List of all donations.',
    type: [DonationResponseDto],
  })
  async findAll(): Promise<DonationResponseDto[]> {
    return await this.donationsService.findAll();
  }

  /**
   * Retrieves one branch's donations.
   * @param locationId The ID of the branch.
   * @param status Only return donations in this state, when given.
   * @returns A Promise that resolves with an array of DonationResponseDto.
   */
  @Get('by-location/:locationId')
  @ApiOperation({ summary: "Get one branch's donations" })
  @ApiParam({ name: 'locationId', description: 'Location ID', format: 'uuid' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DonationStatus,
    enumName: 'DonationStatus',
  })
  @ApiOkResponse({
    description: 'List of donations.',
    type: [DonationResponseDto],
  })
  async findAllByLocation(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Query('status') status?: DonationStatus,
  ): Promise<DonationResponseDto[]> {
    return await this.donationsService.findAllByLocation(locationId, status);
  }

  /**
   * Retrieves one recipient's donations — the recipient app's inbox.
   * @param recipientId The ID of the recipient.
   * @param status Only return donations in this state, when given.
   * @returns A Promise that resolves with an array of DonationResponseDto.
   */
  @Get('by-recipient/:recipientId')
  @ApiOperation({ summary: "Get one recipient's donations" })
  @ApiParam({
    name: 'recipientId',
    description: 'Recipient ID',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DonationStatus,
    enumName: 'DonationStatus',
  })
  @ApiOkResponse({
    description: 'List of donations.',
    type: [DonationResponseDto],
  })
  async findAllByRecipient(
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
    @Query('status') status?: DonationStatus,
  ): Promise<DonationResponseDto[]> {
    return await this.donationsService.findAllByRecipient(recipientId, status);
  }

  /**
   * Retrieves a donation with its lines.
   * @param id The ID of the donation to look up.
   * @returns A Promise that resolves with the donation as DonationResponseDto.
   * @throws NotFoundException If the donation is not found.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single donation with its lines' })
  @ApiParam({ name: 'id', description: 'Donation ID', format: 'uuid' })
  @ApiOkResponse({ description: 'Donation found.', type: DonationResponseDto })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DonationResponseDto> {
    return await this.donationsService.findOne(id);
  }

  /**
   * Opens a donation as a draft.
   * @param req The authenticated request.
   * @param createDonationDto The parties, proposed time and any initial lots.
   * @returns A Promise that resolves with the created donation as DonationCreatedResponseDto.
   * @throws BadRequestException If the recipient is not an active partner, or a lot is unavailable.
   */
  @Post()
  @ApiOperation({ summary: 'Open a new donation as a draft' })
  @ApiBody({
    type: CreateDonationDto,
    description: 'Data to open a new donation.',
  })
  @ApiCreatedResponse({
    description: 'The donation has been created successfully.',
    type: DonationCreatedResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid data — the recipient is not an active partner, or an inventory item is unavailable.',
  })
  async create(
    @Req() req: RequestWithUser,
    @Body() createDonationDto: CreateDonationDto,
  ): Promise<DonationCreatedResponseDto> {
    return await this.donationsService.create(createDonationDto, req.user);
  }

  /**
   * Changes the parties or proposed time of a draft donation.
   * @param id The ID of the donation to update.
   * @param updateDonationDto The new values.
   * @returns A Promise that resolves with the updated donation as DonationCreatedResponseDto.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If the donation is no longer a draft.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft donation' })
  @ApiParam({ name: 'id', description: 'Donation ID', format: 'uuid' })
  @ApiBody({
    type: UpdateDonationDto,
    description: 'New values for the donation.',
  })
  @ApiOkResponse({
    description: 'Donation updated successfully.',
    type: DonationCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  @ApiBadRequestResponse({ description: 'The donation is no longer a draft.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDonationDto: UpdateDonationDto,
  ): Promise<DonationCreatedResponseDto> {
    return await this.donationsService.update(id, updateDonationDto);
  }

  /**
   * Puts more stock lots into an open donation.
   * @param id The ID of the donation.
   * @param addDonationLinesDto The lots to add.
   * @returns A Promise that resolves with the updated donation as DonationCreatedResponseDto.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If the donation is past staging, or a lot is unavailable.
   */
  @Post(':id/lines')
  @ApiOperation({ summary: 'Add inventory items to a donation' })
  @ApiParam({ name: 'id', description: 'Donation ID', format: 'uuid' })
  @ApiBody({
    type: AddDonationLinesDto,
    description: 'Inventory items to add.',
  })
  @ApiCreatedResponse({
    description: 'Inventory items added.',
    type: DonationCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  @ApiBadRequestResponse({
    description:
      'The donation is past staging, or an inventory item is unavailable.',
  })
  async addLines(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addDonationLinesDto: AddDonationLinesDto,
  ): Promise<DonationCreatedResponseDto> {
    return await this.donationsService.addLines(id, addDonationLinesDto);
  }

  /**
   * Takes one line back out of an open donation, releasing its stock lot.
   * @param id The ID of the donation.
   * @param lineId The ID of the line to remove.
   * @returns A Promise that resolves with the updated donation as DonationCreatedResponseDto.
   * @throws NotFoundException If the donation or the line is not found.
   * @throws BadRequestException If the donation is past staging.
   */
  @Delete(':id/lines/:lineId')
  @ApiOperation({ summary: 'Remove an inventory item from a donation' })
  @ApiParam({ name: 'id', description: 'Donation ID', format: 'uuid' })
  @ApiParam({ name: 'lineId', description: 'Donation line ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Inventory item removed.',
    type: DonationCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Donation or line not found.' })
  @ApiBadRequestResponse({ description: 'The donation is past staging.' })
  async removeLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
  ): Promise<DonationCreatedResponseDto> {
    return await this.donationsService.removeLine(id, lineId);
  }

  /**
   * Sends a donation to the recipient for an answer.
   * @param id The ID of the donation.
   * @param offerDonationDto An optional revised pickup time.
   * @returns A Promise that resolves with the offered donation as DonationCreatedResponseDto.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If it cannot be offered, or has no lines.
   */
  @Patch(':id/offer')
  @ApiOperation({ summary: 'Offer a donation to its recipient' })
  @ApiParam({ name: 'id', description: 'Donation ID', format: 'uuid' })
  @ApiBody({
    type: OfferDonationDto,
    description: 'Optional revised pickup time.',
  })
  @ApiOkResponse({
    description: 'Donation offered.',
    type: DonationCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  @ApiBadRequestResponse({
    description:
      'The donation cannot be offered from its current state, or has no lines.',
  })
  async offer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() offerDonationDto: OfferDonationDto,
  ): Promise<DonationCreatedResponseDto> {
    return await this.donationsService.offer(id, offerDonationDto);
  }

  /**
   * Records the recipient taking on an offered donation.
   * @param req The authenticated request, carrying the recipient-side user.
   * @param id The ID of the donation.
   * @param acceptDonationDto The collecting vehicle, driver and workable time.
   * @returns A Promise that resolves with the accepted donation as DonationCreatedResponseDto.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If it was not offered.
   */
  @Patch(':id/accept')
  @ApiOperation({
    summary: 'Accept an offered donation',
    description: 'Performed by the recipient.',
  })
  @ApiParam({ name: 'id', description: 'Donation ID', format: 'uuid' })
  @ApiBody({ type: AcceptDonationDto, description: 'Collection details.' })
  @ApiOkResponse({
    description: 'Donation accepted.',
    type: DonationCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  @ApiBadRequestResponse({ description: 'The donation was not offered.' })
  async accept(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() acceptDonationDto: AcceptDonationDto,
  ): Promise<DonationCreatedResponseDto> {
    return await this.donationsService.accept(id, acceptDonationDto, req.user);
  }

  /**
   * Records the recipient turning down an offered donation.
   * @param req The authenticated request, carrying the recipient-side user.
   * @param id The ID of the donation.
   * @param declineDonationDto Why it was turned down.
   * @returns A Promise that resolves with the declined donation as DonationCreatedResponseDto.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If it was not offered.
   */
  @Patch(':id/decline')
  @ApiOperation({
    summary: 'Decline an offered donation',
    description:
      'Performed by the recipient. The reason is required so the retailer can re-offer it.',
  })
  @ApiParam({ name: 'id', description: 'Donation ID', format: 'uuid' })
  @ApiBody({ type: DeclineDonationDto, description: 'Why it was turned down.' })
  @ApiOkResponse({
    description: 'Donation declined.',
    type: DonationCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  @ApiBadRequestResponse({ description: 'The donation was not offered.' })
  async decline(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() declineDonationDto: DeclineDonationDto,
  ): Promise<DonationCreatedResponseDto> {
    return await this.donationsService.decline(
      id,
      declineDonationDto,
      req.user,
    );
  }

  /**
   * Marks the goods physically staged and waiting for the driver.
   * @param id The ID of the donation.
   * @returns A Promise that resolves with the donation as DonationCreatedResponseDto.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If it has not been accepted.
   */
  @Patch(':id/ready-for-pickup')
  @ApiOperation({ summary: 'Mark a donation ready for pickup' })
  @ApiParam({ name: 'id', description: 'Donation ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Donation is ready for pickup.',
    type: DonationCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  @ApiBadRequestResponse({ description: 'The donation has not been accepted.' })
  async markReadyForPickup(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DonationCreatedResponseDto> {
    return await this.donationsService.markReadyForPickup(id);
  }

  /**
   * Records the recipient's driver setting off.
   * @param id The ID of the donation.
   * @returns A Promise that resolves with the donation as DonationCreatedResponseDto.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If it is not ready for pickup.
   */
  @Patch(':id/en-route')
  @ApiOperation({
    summary: 'Mark the driver en route',
    description: 'Performed by the recipient.',
  })
  @ApiParam({ name: 'id', description: 'Donation ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Driver is en route.',
    type: DonationCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  @ApiBadRequestResponse({
    description: 'The donation is not ready for pickup.',
  })
  async markDriverEnRoute(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DonationCreatedResponseDto> {
    return await this.donationsService.markDriverEnRoute(id);
  }

  /**
   * Issues a single-use pickup token for the recipient to present as a QR code.
   * @param id The ID of the donation.
   * @returns A Promise that resolves with the issued token as PickupTokenResponseDto.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If the donation is not awaiting collection.
   */
  @Post(':id/pickup-token')
  @ApiOperation({
    summary: 'Issue a pickup token',
    description:
      'Single-use and expiring. Any token already outstanding for the donation is consumed, so only the newest one works.',
  })
  @ApiParam({ name: 'id', description: 'Donation ID', format: 'uuid' })
  @ApiCreatedResponse({
    description: 'Pickup token issued.',
    type: PickupTokenResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  @ApiBadRequestResponse({
    description: 'The donation is not awaiting collection.',
  })
  async issuePickupToken(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PickupTokenResponseDto> {
    return await this.donationsService.issuePickupToken(id);
  }

  /**
   * Completes a handover by verifying the token the recipient presented, then
   * issues the certificate.
   * @param req The authenticated request, carrying the retailer-side user.
   * @param id The ID of the donation.
   * @param confirmDonationDto The token code that was scanned.
   * @returns A Promise that resolves with the issued certificate.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If the donation is not awaiting collection, or the
   * token is unknown, expired, already used, or for another donation.
   */
  @Post(':id/confirm')
  @ApiOperation({
    summary: 'Confirm a handover and issue the certificate',
    description:
      'Performed by the retailer after scanning the QR code the recipient presents.',
  })
  @ApiParam({ name: 'id', description: 'Donation ID', format: 'uuid' })
  @ApiBody({
    type: ConfirmDonationDto,
    description: 'The pickup token that was scanned.',
  })
  @ApiCreatedResponse({
    description: 'Handover confirmed and certificate issued.',
    type: DonationReceiptCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  @ApiBadRequestResponse({
    description:
      'The donation is not awaiting collection, or the pickup token is invalid, expired or already used.',
  })
  async confirm(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() confirmDonationDto: ConfirmDonationDto,
  ): Promise<DonationReceiptCreatedResponseDto> {
    return await this.donationsService.confirm(
      id,
      confirmDonationDto,
      req.user,
    );
  }

  /**
   * Calls off a donation and releases every lot back to inventory.
   * @param id The ID of the donation.
   * @param cancelDonationDto Why it was called off.
   * @returns A Promise that resolves with the cancelled donation as DonationCreatedResponseDto.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If it has already been delivered or cancelled.
   */
  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel a donation',
    description: 'Either side may cancel. Covers a driver no-show.',
  })
  @ApiParam({ name: 'id', description: 'Donation ID', format: 'uuid' })
  @ApiBody({ type: CancelDonationDto, description: 'Why it was called off.' })
  @ApiOkResponse({
    description: 'Donation cancelled.',
    type: DonationCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  @ApiBadRequestResponse({
    description: 'The donation has already been delivered or cancelled.',
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelDonationDto: CancelDonationDto,
  ): Promise<DonationCreatedResponseDto> {
    return await this.donationsService.cancel(id, cancelDonationDto);
  }

  /**
   * Soft-deletes a donation that never went anywhere, releasing its lots.
   * @param id The ID of the donation to delete.
   * @returns A Promise that resolves with a success message as MessageResponseDto.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If it is anything other than a draft or cancelled.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft or cancelled donation' })
  @ApiParam({ name: 'id', description: 'Donation ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Donation deleted successfully.',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  @ApiBadRequestResponse({
    description: 'Only a draft or cancelled donation can be deleted.',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    return await this.donationsService.remove(id);
  }
}
