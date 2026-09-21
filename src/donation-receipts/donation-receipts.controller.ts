import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { DonationReceiptsService } from './donation-receipts.service.js';
import { DonationReceiptResponseDto } from './dto/index.js';

/**
 * Certificates are read-only over HTTP.
 *
 * There is no create, update or delete route on purpose: a certificate is issued
 * by the donation flow when a handover is confirmed, and a tax document must not
 * be editable afterwards.
 */
@ApiTags('donation-receipts')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked token.' })
@Controller('donation-receipts')
export class DonationReceiptsController {
  constructor(
    private readonly donationReceiptsService: DonationReceiptsService,
  ) {}

  /**
   * Retrieves every certificate, newest first.
   * @returns A Promise that resolves with an array of DonationReceiptResponseDto.
   */
  @Get()
  @ApiOperation({ summary: 'Get all donation certificates' })
  @ApiOkResponse({
    description: 'List of all certificates.',
    type: [DonationReceiptResponseDto],
  })
  async findAll(): Promise<DonationReceiptResponseDto[]> {
    return await this.donationReceiptsService.findAll();
  }

  /**
   * Retrieves a certificate by its printed number.
   * @param receiptNumber The certificate number.
   * @returns A Promise that resolves with the certificate as DonationReceiptResponseDto.
   * @throws NotFoundException If no certificate carries that number.
   */
  @Get('by-number/:receiptNumber')
  @ApiOperation({ summary: 'Get a certificate by its printed number' })
  @ApiParam({
    name: 'receiptNumber',
    description: 'Certificate number',
    example: 'FR-REC-2026-000291',
  })
  @ApiOkResponse({
    description: 'Certificate found.',
    type: DonationReceiptResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Certificate not found.' })
  async findOneByNumber(
    @Param('receiptNumber') receiptNumber: string,
  ): Promise<DonationReceiptResponseDto> {
    return await this.donationReceiptsService.findOneByNumber(receiptNumber);
  }

  /**
   * Retrieves a certificate by its ID.
   * @param id The ID of the certificate to look up.
   * @returns A Promise that resolves with the certificate as DonationReceiptResponseDto.
   * @throws NotFoundException If the certificate is not found.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single donation certificate' })
  @ApiParam({ name: 'id', description: 'Certificate ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Certificate found.',
    type: DonationReceiptResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Certificate not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DonationReceiptResponseDto> {
    return await this.donationReceiptsService.findOne(id);
  }
}
