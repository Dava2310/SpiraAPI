import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Donation } from '../donations/entities/donation.entity.js';
import { DonationStatus } from '../donations/enums/donation-status.enum.js';
import { ImpactFactorsService } from '../impact-factors/impact-factors.service.js';

/** Which donations an impact total covers. */
export interface ImpactQuery {
  retailerId?: string;
  recipientId?: string;
  locationId?: string;

  /** Inclusive lower bound on `completed_at`. */
  from?: Date;

  /** Exclusive upper bound on `completed_at`. */
  to?: Date;
}

/** One organization's rescued totals over a period. */
export interface ImpactTotals {
  totalWeightKg: number;
  totalMeals: number;
  totalCo2Kg: number;
  totalRetailValue: number;
  currency: string;
  donationCount: number;
  partnerCount: number;
}

const DEFAULT_CURRENCY = 'EUR';

/**
 * Computes impact totals in the database rather than in the caller.
 *
 * Both frontends summed an unbounded client-side list, and both labelled the
 * result a period report while showing lifetime figures. Every total here is
 * one aggregate query over `DELIVERED` donations only, because impact that has
 * not actually been handed over is a projection, not impact.
 */
@Injectable()
export class ImpactService {
  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    private readonly impactFactorsService: ImpactFactorsService,
  ) {}

  /**
   * Sums delivered donations for one organization and period.
   * @param query Which donations to count.
   * @returns A Promise that resolves with the totals, zeroed when none match.
   */
  async totals(query: ImpactQuery): Promise<ImpactTotals> {
    const builder = this.donationRepository
      .createQueryBuilder('donation')
      .select('COALESCE(SUM(donation.total_weight_kg), 0)', 'weight')
      .addSelect('COALESCE(SUM(donation.total_retail_value), 0)', 'value')
      .addSelect('COALESCE(SUM(donation.estimated_meals), 0)', 'meals')
      .addSelect('COALESCE(SUM(donation.co2_avoided_kg), 0)', 'co2')
      .addSelect('COUNT(*)', 'donations')
      .addSelect(
        query.recipientId
          ? 'COUNT(DISTINCT donation.retailer_id)'
          : 'COUNT(DISTINCT donation.recipient_id)',
        'partners',
      )
      .where('donation.deleted_at IS NULL')
      .andWhere('donation.status = :status', {
        status: DonationStatus.DELIVERED,
      });

    if (query.retailerId) {
      builder.andWhere('donation.retailer_id = :retailerId', {
        retailerId: query.retailerId,
      });
    }

    if (query.recipientId) {
      builder.andWhere('donation.recipient_id = :recipientId', {
        recipientId: query.recipientId,
      });
    }

    if (query.locationId) {
      builder.andWhere('donation.location_id = :locationId', {
        locationId: query.locationId,
      });
    }

    if (query.from) {
      builder.andWhere('donation.completed_at >= :from', { from: query.from });
    }

    if (query.to) {
      builder.andWhere('donation.completed_at < :to', { to: query.to });
    }

    const row = await builder.getRawOne<{
      weight: string;
      value: string;
      meals: string;
      co2: string;
      donations: string;
      partners: string;
    }>();

    const totalWeightKg = Number(row?.weight ?? 0);
    const storedMeals = Number(row?.meals ?? 0);
    const storedCo2 = Number(row?.co2 ?? 0);

    // Donations delivered before impact was pinned carry nulls, which SUM skips.
    // Falling back to the current factor keeps a historical total from reading
    // as zero, and pinned rows always win.
    const factor =
      storedMeals === 0 && storedCo2 === 0 && totalWeightKg > 0
        ? await this.impactFactorsService.findEffectiveOn()
        : null;

    return {
      totalWeightKg: Number(totalWeightKg.toFixed(3)),
      totalMeals: Number(
        (factor ? totalWeightKg * factor.mealsPerKg : storedMeals).toFixed(2),
      ),
      totalCo2Kg: Number(
        (factor ? totalWeightKg * factor.co2KgPerKg : storedCo2).toFixed(3),
      ),
      totalRetailValue: Number(Number(row?.value ?? 0).toFixed(2)),
      currency: DEFAULT_CURRENCY,
      donationCount: Number(row?.donations ?? 0),
      partnerCount: Number(row?.partners ?? 0),
    };
  }
}
