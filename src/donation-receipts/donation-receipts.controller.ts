import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { DonationReceiptsService } from './donation-receipts.service.js';
import { DonationReceiptResponseDto } from './dto/index.js';
import { ReceiptExportService } from './receipt-export.service.js';

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
    private readonly receiptExportService: ReceiptExportService,
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
  @Get('export')
  @ApiOperation({ summary: 'Export certificates as CSV or PDF' })
  @ApiQuery({ name: 'from', required: false, format: 'date-time' })
  @ApiQuery({ name: 'to', required: false, format: 'date-time' })
  @ApiQuery({ name: 'recipientId', required: false, format: 'uuid' })
  @ApiQuery({ name: 'retailerId', required: false, format: 'uuid' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'pdf'],
    description: 'Defaults to csv. `pdf` returns the first match only.',
  })
  @ApiOkResponse({
    description: 'The export file.',
    content: {
      'text/csv': { schema: { type: 'string' } },
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiNotFoundResponse({
    description: 'No certificate matched, so there is nothing to export.',
  })
  async export(
    @Res() response: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('recipientId') recipientId?: string,
    @Query('retailerId') retailerId?: string,
    @Query('format') format?: string,
  ): Promise<void> {
    const receipts = await this.donationReceiptsService.findForExport(
      from,
      to,
      recipientId,
      retailerId,
    );

    if (receipts.length === 0) {
      throw new NotFoundException(
        'No certificates matched, so there is nothing to export.',
      );
    }

    if (format === 'pdf') {
      const pdf = await this.receiptExportService.toPdf(receipts[0]);

      response
        .status(HttpStatus.OK)
        .setHeader('Content-Type', 'application/pdf')
        .setHeader(
          'Content-Disposition',
          `attachment; filename="spira-${receipts[0].receiptNumber}.pdf"`,
        )
        .send(pdf);

      return;
    }

    response
      .status(HttpStatus.OK)
      .setHeader('Content-Type', 'text/csv; charset=utf-8')
      .setHeader(
        'Content-Disposition',
        'attachment; filename="spira-certificates.csv"',
      )
      .send(this.receiptExportService.toCsv(receipts));
  }

  /**
   * Renders one certificate as a PDF the recipient can file with a funder.
   * @param id The ID of the certificate.
   * @param response The HTTP response to stream the file onto.
   */
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download one certificate as a PDF' })
  @ApiParam({ name: 'id', description: 'Certificate ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'The certificate as a PDF.',
    content: {
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiNotFoundResponse({ description: 'Certificate not found.' })
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ): Promise<void> {
    const receipt = await this.donationReceiptsService.findValid(id);
    const pdf = await this.receiptExportService.toPdf(receipt);

    response
      .status(HttpStatus.OK)
      .setHeader('Content-Type', 'application/pdf')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="spira-${receipt.receiptNumber}.pdf"`,
      )
      .send(pdf);
  }

  /**
   * Retrieves a certificate by its ID.
   * @param id The ID of the certificate to look up.
   * @returns A Promise that resolves with the certificate.
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
