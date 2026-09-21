import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';

import {
  EXPIRING_HOURS_THRESHOLD,
  SurplusUrgency,
} from '../common/enums/surplus-urgency.enum.js';
import { urgencyOf } from '../common/expiry/expiry.view.js';
import type { AuthenticatedUser } from '../common/interfaces/index.js';
import { resolvePeriod } from '../common/period/index.js';
import { assertRetailerScope, resolveScope } from '../common/scoping/index.js';
import { Donation } from '../donations/entities/donation.entity.js';
import { DonationStatus } from '../donations/enums/donation-status.enum.js';
import { ImpactFactorsService } from '../impact-factors/impact-factors.service.js';
import { ImpactService } from '../impact/impact.service.js';
import { InventoryItem } from '../inventory-items/entities/inventory-item.entity.js';
import { InventoryItemStatus } from '../inventory-items/enums/inventory-item-status.enum.js';
import { Location } from '../locations/entities/location.entity.js';
import { Partnership } from '../partnerships/entities/partnership.entity.js';
import { PartnershipStatus } from '../partnerships/enums/partnership-status.enum.js';
import {
  ImpactFactorSummaryDto,
  ImpactReportResponseDto,
  NextPickupDto,
  PartnerResponseDto,
  ReadyToDonateDto,
  RetailerDashboardResponseDto,
} from './dto/index.js';

const MS_PER_MINUTE = 60 * 1000;

/** Statuses that count as "staged, not yet handed over". */
const OPEN_STATUSES = [
  DonationStatus.ACCEPTED,
  DonationStatus.READY_FOR_PICKUP,
  DonationStatus.DRIVER_EN_ROUTE,
];

/** Aggregates the retailer app's home, profile and partner screens. */
@Injectable()
export class RetailerPortalService {
  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(InventoryItem)
    private readonly inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Partnership)
    private readonly partnershipRepository: Repository<Partnership>,
    private readonly impactService: ImpactService,
    private readonly impactFactorsService: ImpactFactorsService,
  ) {}

  /**
   * Builds the retailer home screen for the caller's branch.
   * @param caller The authenticated retailer-side caller.
   * @param locationId The branch to report on, defaulting to their primary one.
   * @returns A Promise that resolves with the dashboard.
   * @throws ForbiddenException If the caller has no retailer, or the branch is
   * not theirs.
   */
  async findDashboard(
    caller: AuthenticatedUser,
    locationId?: string,
  ): Promise<RetailerDashboardResponseDto> {
    const branch = await this.resolveBranch(caller, locationId);

    const staged = await this.donationRepository.find({
      where: { locationId: branch.id, status: In(OPEN_STATUSES) },
      relations: {
        recipient: true,
        recipientVehicle: true,
        driverContact: true,
      },
      order: { pickupWindowStart: 'ASC' },
    });

    const factor = await this.impactFactorsService.findEffectiveOn();

    const totalWeightKg = staged.reduce(
      (sum, donation) => sum + donation.totalWeightKg,
      0,
    );

    const lineCount = staged.reduce(
      (sum, donation) => sum + donation.lineCount,
      0,
    );

    const [urgentCount, inventoryCount, deliveredCount, highestUrgency] =
      await Promise.all([
        this.countUrgent(branch.id),
        this.inventoryItemRepository.count({
          where: {
            locationId: branch.id,
            status: InventoryItemStatus.IN_INVENTORY,
          },
        }),
        this.donationRepository.count({
          where: { locationId: branch.id, status: DonationStatus.DELIVERED },
        }),
        this.findHighestUrgency(branch.id),
      ]);

    return new RetailerDashboardResponseDto({
      ready: new ReadyToDonateDto({
        lineCount,
        totalWeightKg: Number(totalWeightKg.toFixed(3)),
        estimatedMeals: factor
          ? Number((totalWeightKg * factor.mealsPerKg).toFixed(2))
          : 0,
      }),
      nextPickup: this.toNextPickup(staged),
      urgentCount,
      highestUrgency,
      deliveredCount,
      inventoryCount,
    });
  }

  /**
   * Builds a period-scoped impact report for one branch.
   * @param caller The authenticated retailer-side caller.
   * @param locationId The branch to report on.
   * @param period The period as `YYYY` or `YYYY-MM`, defaulting to this year.
   * @returns A Promise that resolves with the report.
   * @throws ForbiddenException If the branch is not the caller's.
   * @throws BadRequestException If the period is malformed.
   */
  async findImpact(
    caller: AuthenticatedUser,
    locationId: string,
    period?: string,
  ): Promise<ImpactReportResponseDto> {
    const branch = await this.resolveBranch(caller, locationId);
    const resolved = resolvePeriod(period);

    const totals = await this.impactService.totals({
      locationId: branch.id,
      from: resolved.from,
      to: resolved.to,
    });

    const factor = await this.impactFactorsService.findEffectiveOn(
      resolved.from.toISOString().slice(0, 10),
    );

    return new ImpactReportResponseDto({
      ...totals,
      period: resolved.period,
      periodLabel: resolved.periodLabel,
      impactFactor: new ImpactFactorSummaryDto({
        mealsPerKg: factor?.mealsPerKg ?? 0,
        co2KgPerKg: factor?.co2KgPerKg ?? 0,
      }),
    });
  }

  /**
   * Lists the recipients this branch's retailer may actually donate to.
   * @param caller The authenticated retailer-side caller.
   * @param locationId The branch whose delivery counts to report.
   * @returns A Promise that resolves with the partner list.
   * @throws ForbiddenException If the branch is not the caller's.
   */
  async findPartners(
    caller: AuthenticatedUser,
    locationId: string,
  ): Promise<PartnerResponseDto[]> {
    const branch = await this.resolveBranch(caller, locationId);

    const partnerships = await this.partnershipRepository.find({
      where: {
        retailerId: branch.retailerId as string,
        status: In([PartnershipStatus.ACTIVE, PartnershipStatus.PAUSED]),
      },
      relations: {
        recipient: { contacts: true, vehicles: true },
      },
      order: { isPreferred: 'DESC' },
    });

    if (partnerships.length === 0) {
      return [];
    }

    const deliveredCounts = await this.countDeliveredPerRecipient(
      branch.id,
      partnerships.map((partnership) => partnership.recipientId),
    );

    return partnerships.map((partnership) => {
      const recipient = partnership.recipient;
      const primaryContact =
        recipient?.contacts?.find((contact) => contact.isPrimary) ??
        recipient?.contacts?.[0] ??
        null;
      const vehicle =
        recipient?.vehicles?.find((candidate) => candidate.isActive) ??
        recipient?.vehicles?.[0] ??
        null;

      return new PartnerResponseDto({
        partnershipId: partnership.id,
        recipientId: partnership.recipientId,
        displayName: recipient?.displayName ?? 'Unknown recipient',
        shortName: recipient?.shortName ?? null,
        type: recipient?.type as PartnerResponseDto['type'],
        logoUrl: recipient?.logoUrl ?? null,
        isVerified: recipient?.verifiedAt != null,
        partnershipStatus: partnership.status,
        isPreferred: partnership.isPreferred,
        contactPerson: primaryContact?.fullName ?? null,
        phone: primaryContact?.phone ?? null,
        vehiclePlate: vehicle?.plate ?? null,
        deliveredCount: deliveredCounts.get(partnership.recipientId) ?? 0,
      });
    });
  }

  /**
   * Resolves which branch a request is about and confirms the caller owns it.
   * @param caller The authenticated caller.
   * @param locationId The requested branch, or undefined for their primary one.
   * @returns A Promise that resolves with the branch.
   * @throws ForbiddenException If the caller has no retailer, or the branch is
   * not theirs.
   */
  private async resolveBranch(
    caller: AuthenticatedUser,
    locationId?: string,
  ): Promise<Location> {
    const scope = resolveScope(caller);

    if (locationId) {
      const branch = await this.locationRepository.findOne({
        where: { id: locationId },
      });

      if (!branch?.retailerId) {
        throw new ForbiddenException(
          'This branch does not belong to a retailer.',
        );
      }

      assertRetailerScope(caller, branch.retailerId);

      return branch;
    }

    if (!scope.retailerId) {
      throw new ForbiddenException(
        'Specify a branch: this account acts for no single retailer.',
      );
    }

    const branch = await this.locationRepository.findOne({
      where: { retailerId: scope.retailerId, isActive: true },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });

    if (!branch) {
      throw new ForbiddenException('This retailer has no active branch yet.');
    }

    return branch;
  }

  /**
   * Counts lots at a branch inside the urgency window.
   * @param locationId The branch.
   * @returns A Promise that resolves with the count.
   */
  private async countUrgent(locationId: string): Promise<number> {
    return await this.inventoryItemRepository.count({
      where: {
        locationId,
        status: InventoryItemStatus.IN_INVENTORY,
        expiresAt: LessThanOrEqual(
          new Date(Date.now() + EXPIRING_HOURS_THRESHOLD * 60 * 60 * 1000),
        ),
      },
    });
  }

  /**
   * Finds the most pressing urgency present in a branch's stock.
   * @param locationId The branch.
   * @returns A Promise that resolves with the band, or null when nothing expires.
   */
  private async findHighestUrgency(
    locationId: string,
  ): Promise<SurplusUrgency | null> {
    const soonest = await this.inventoryItemRepository.findOne({
      where: { locationId, status: InventoryItemStatus.IN_INVENTORY },
      order: { expiresAt: 'ASC' },
    });

    if (!soonest?.expiresAt) {
      return null;
    }

    return urgencyOf(
      (soonest.expiresAt.getTime() - Date.now()) / (60 * 60 * 1000),
    );
  }

  /**
   * Picks the soonest staged collection and shapes it for the home card.
   * @param staged The branch's open donations, window-ordered.
   * @returns The next pickup, or null when none has a window.
   */
  private toNextPickup(staged: Donation[]): NextPickupDto | null {
    const next = staged.find((donation) => donation.pickupWindowStart !== null);

    if (!next) {
      return null;
    }

    const start = next.pickupWindowStart as Date;

    return new NextPickupDto({
      donationId: next.id,
      code: next.code,
      recipientName: next.recipient?.displayName ?? 'Unknown recipient',
      contactPerson: next.driverContact?.fullName ?? null,
      vehiclePlate: next.recipientVehicle?.plate ?? null,
      pickupWindowStart: start.toISOString(),
      pickupWindowEnd: next.pickupWindowEnd
        ? next.pickupWindowEnd.toISOString()
        : null,
      minutesUntilWindow: Math.round(
        (start.getTime() - Date.now()) / MS_PER_MINUTE,
      ),
    });
  }

  /**
   * Counts delivered donations from one branch, grouped by recipient.
   * @param locationId The branch.
   * @param recipientIds The recipients to count for.
   * @returns A Promise that resolves with a recipient-to-count map.
   */
  private async countDeliveredPerRecipient(
    locationId: string,
    recipientIds: string[],
  ): Promise<Map<string, number>> {
    const rows = await this.donationRepository
      .createQueryBuilder('donation')
      .select('donation.recipient_id', 'recipientId')
      .addSelect('COUNT(*)', 'count')
      .where('donation.deleted_at IS NULL')
      .andWhere('donation.location_id = :locationId', { locationId })
      .andWhere('donation.status = :status', {
        status: DonationStatus.DELIVERED,
      })
      .andWhere('donation.recipient_id IN (:...recipientIds)', { recipientIds })
      .groupBy('donation.recipient_id')
      .getRawMany<{ recipientId: string; count: string }>();

    return new Map(rows.map((row) => [row.recipientId, Number(row.count)]));
  }
}
