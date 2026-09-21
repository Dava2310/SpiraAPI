import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { CrudRepository } from '../common/use-case/index.js';
import { UUID_PATTERN } from '../common/validation/index.js';
import type { Donation } from '../donations/entities/donation.entity.js';
import { ImpactFactorsService } from '../impact-factors/impact-factors.service.js';
import {
  DonationReceiptCreatedResponseDto,
  DonationReceiptResponseDto,
} from './dto/index.js';
import { DonationReceipt } from './entities/donation-receipt.entity.js';

/** Extra details the donation flow supplies when a certificate is issued. */
export interface IssueReceiptContext {
  /** Name of the retailer-side user who authorised the handover. */
  authorizedByName: string;

  /** Name of the person who collected, when one is recorded. */
  driverName?: string | null;

  /** Who signed for the goods on the receiving side. */
  receivedByLabel?: string | null;

  /** The pickup token that was consumed, retained as evidence. */
  verificationCode?: string | null;

  /** PIN of that token, which the certificate prints. */
  handoverPin?: string | null;

  /** Statute the certificate is issued under, which depends on jurisdiction. */
  legalReference?: string | null;
}

/**
 * Issues and serves donation certificates.
 *
 * Read-only from the outside: a certificate is created by the donation flow at
 * handover, never by a client, and is immutable once issued. There is no update
 * and no delete — correcting one means voiding it and issuing a replacement.
 */
@Injectable()
export class DonationReceiptsService implements CrudRepository<DonationReceipt> {
  constructor(
    @InjectRepository(DonationReceipt)
    private readonly receiptRepository: Repository<DonationReceipt>,
    private readonly impactFactorsService: ImpactFactorsService,
  ) {}

  /**
   * Finds a DonationReceipt by its ID.
   * @param id The ID of the certificate to look up.
   * @returns A Promise that resolves with the certificate found.
   * @throws NotFoundException If it does not exist.
   */
  async findValid(id: number | string): Promise<DonationReceipt> {
    const uuid = String(id);

    if (!UUID_PATTERN.test(uuid)) {
      throw new NotFoundException(`Invalid DonationReceipt ID: ${id}`);
    }

    const receipt = await this.receiptRepository.findOne({
      where: { id: uuid },
    });

    if (!receipt) {
      throw new NotFoundException(
        `DonationReceipt with ID: ${id} not found or not valid`,
      );
    }

    return receipt;
  }

  /**
   * Retrieves every certificate, newest first.
   * @returns A Promise that resolves with all certificates mapped to DonationReceiptResponseDto.
   */
  async findAll(): Promise<DonationReceiptResponseDto[]> {
    const receipts = await this.receiptRepository.find({
      order: { issuedAt: 'DESC' },
    });

    return receipts.map((receipt) => new DonationReceiptResponseDto(receipt));
  }

  /**
   * Retrieves a single certificate by its ID.
   * @param id The ID of the certificate to look up.
   * @returns A Promise that resolves with the certificate mapped to DonationReceiptResponseDto.
   * @throws NotFoundException If the certificate is not found.
   */
  async findOne(id: string): Promise<DonationReceiptResponseDto> {
    const receipt = await this.findValid(id);

    return new DonationReceiptResponseDto(receipt);
  }

  /**
   * Retrieves a certificate by its printed number, which is how somebody holding
   * a paper copy looks it up.
   * @param receiptNumber The certificate number.
   * @returns A Promise that resolves with the certificate mapped to DonationReceiptResponseDto.
   * @throws NotFoundException If no certificate carries that number.
   */
  async findOneByNumber(
    receiptNumber: string,
  ): Promise<DonationReceiptResponseDto> {
    const receipt = await this.receiptRepository.findOne({
      where: { receiptNumber },
    });

    if (!receipt) {
      throw new NotFoundException(
        `No certificate found with the number: ${receiptNumber}`,
      );
    }

    return new DonationReceiptResponseDto(receipt);
  }

  /**
   * Retrieves the certificate issued for one donation.
   * @param donationId The ID of the donation.
   * @returns A Promise that resolves with the certificate, or null if none was issued.
   */
  async findOneByDonation(donationId: string): Promise<DonationReceipt | null> {
    return await this.receiptRepository.findOne({ where: { donationId } });
  }

  /**
   * Issues the certificate for a completed donation.
   *
   * Every party name, total and impact figure is snapshotted here, so reprinting
   * the certificate years later reproduces it exactly even if the branch is
   * renamed or the conversion factors are revised.
   *
   * @param donation The donation, loaded with its retailer, location and recipient.
   * @param context Names and evidence the donation flow resolved.
   * @returns A Promise that resolves with the issued certificate and a success message.
   */
  /**
   * Reads the certificates in a date range, for a bulk export.
   * @param from Inclusive lower bound on the issue date.
   * @param to Exclusive upper bound on the issue date.
   * @param recipientId Narrow to one recipient's collections.
   * @param retailerId Narrow to one retailer's donations.
   * @returns A Promise that resolves with the matching certificates, oldest first.
   */
  async findForExport(
    from?: string,
    to?: string,
    recipientId?: string,
    retailerId?: string,
  ): Promise<DonationReceipt[]> {
    const builder = this.receiptRepository
      .createQueryBuilder('receipt')
      .innerJoin('receipt.donation', 'donation')
      .where('donation.deleted_at IS NULL');

    if (from) {
      builder.andWhere('receipt.issued_at >= :from', { from: new Date(from) });
    }

    if (to) {
      builder.andWhere('receipt.issued_at < :to', { to: new Date(to) });
    }

    if (recipientId) {
      builder.andWhere('donation.recipient_id = :recipientId', { recipientId });
    }

    if (retailerId) {
      builder.andWhere('donation.retailer_id = :retailerId', { retailerId });
    }

    return await builder.orderBy('receipt.issued_at', 'ASC').getMany();
  }

  async issueForDonation(
    donation: Donation,
    context: IssueReceiptContext,
  ): Promise<DonationReceiptCreatedResponseDto> {
    const issuedAt = new Date();
    const factor = await this.impactFactorsService.findEffectiveOn(
      issuedAt.toISOString().slice(0, 10),
    );

    const receipt = this.receiptRepository.create({
      donationId: donation.id,
      receiptNumber: await this.nextReceiptNumber(issuedAt),
      issuedAt,
      retailerLegalName: donation.retailer?.legalName ?? 'Unknown retailer',
      retailerTaxId: donation.retailer?.taxId ?? null,
      locationLabel: donation.location?.label ?? 'Unknown location',
      locationCode: donation.location?.code ?? null,
      locationAddress: this.formatAddress(donation),
      authorizedByName: context.authorizedByName,
      recipientLegalName:
        donation.recipient?.legalName ??
        donation.recipient?.displayName ??
        'Unknown recipient',
      recipientTaxId: donation.recipient?.taxId ?? null,
      driverName: context.driverName ?? null,
      receivedByLabel: context.receivedByLabel ?? null,
      vehiclePlate: donation.recipientVehicle?.plate ?? null,
      lineCount: donation.lineCount,
      totalQuantity: donation.totalQuantity,
      totalWeightKg: donation.totalWeightKg,
      totalRetailValue: donation.totalRetailValue,
      currency: donation.currency,
      // Prefer what the donation already carried: the recipient app showed
      // those figures before delivery, and the certificate must not restate them.
      estimatedMeals:
        donation.estimatedMeals ??
        (factor
          ? Number((donation.totalWeightKg * factor.mealsPerKg).toFixed(2))
          : null),
      co2AvoidedKg:
        donation.co2AvoidedKg ??
        (factor
          ? Number((donation.totalWeightKg * factor.co2KgPerKg).toFixed(3))
          : null),
      impactFactorId: donation.impactFactorId ?? factor?.id ?? null,
      legalReference: context.legalReference ?? null,
      verificationCode: context.verificationCode ?? null,
      handoverPin: context.handoverPin ?? null,
    });

    const newReceipt = await this.receiptRepository.save(receipt);

    return new DonationReceiptCreatedResponseDto(
      newReceipt,
      'Certificate issued successfully.',
    );
  }

  /**
   * Builds the next certificate number, sequential within the issuing year so the
   * numbering is auditable rather than random.
   * @param issuedAt When the certificate is being issued.
   * @returns A Promise that resolves with a number of the form `FR-REC-YYYY-NNNNNN`.
   */
  private async nextReceiptNumber(issuedAt: Date): Promise<string> {
    const year = issuedAt.getUTCFullYear();
    const prefix = `FR-REC-${year}-`;

    const issuedThisYear = await this.receiptRepository
      .createQueryBuilder('receipt')
      .where('receipt.receipt_number LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();

    return `${prefix}${String(issuedThisYear + 1).padStart(6, '0')}`;
  }

  /**
   * Flattens the collection address into the single line a certificate prints.
   * @param donation The donation, loaded with its location.
   * @returns The address as one comma-separated string.
   */
  private formatAddress(donation: Donation): string {
    const location = donation.location;

    if (!location) {
      return 'Unknown address';
    }

    return [
      location.addressLine1,
      location.addressLine2,
      location.city,
      location.state,
      location.postalCode,
      location.countryCode,
    ]
      .filter((part) => part)
      .join(', ');
  }
}
