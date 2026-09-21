import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { AuthenticatedUser } from '../common/interfaces/index.js';
import { Contact } from '../contacts/entities/contact.entity.js';
import { ImpactService } from '../impact/impact.service.js';
import { LocationResponseDto } from '../locations/dto/index.js';
import { Location } from '../locations/entities/location.entity.js';
import { RecipientResponseDto } from '../recipients/dto/index.js';
import { Recipient } from '../recipients/entities/recipient.entity.js';
import { RetailerResponseDto } from '../retailers/dto/index.js';
import { Retailer } from '../retailers/entities/retailer.entity.js';
import { User } from '../users/entities/user.entity.js';
import { ImpactSummaryDto, MeResponseDto } from './dto/index.js';

/** Assembles the sign-in context for whichever organization the caller acts for. */
@Injectable()
export class MeService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Retailer)
    private readonly retailerRepository: Repository<Retailer>,
    @InjectRepository(Recipient)
    private readonly recipientRepository: Repository<Recipient>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    private readonly impactService: ImpactService,
  ) {}

  /**
   * Resolves the caller's user, organization, primary branch and impact.
   * @param caller The authenticated caller.
   * @returns A Promise that resolves with the full context.
   * @throws NotFoundException If the user row has disappeared mid-session.
   */
  async findContext(caller: AuthenticatedUser): Promise<MeResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: caller.id },
    });

    if (!user) {
      throw new NotFoundException('This account no longer exists.');
    }

    const retailer = user.retailerId
      ? await this.retailerRepository.findOne({
          where: { id: user.retailerId },
        })
      : null;

    const recipient = user.recipientId
      ? await this.recipientRepository.findOne({
          where: { id: user.recipientId },
        })
      : null;

    const primaryLocation = await this.findPrimaryLocation(user);
    const primaryContact = await this.findPrimaryContact(user);

    const totals = await this.impactService.totals({
      retailerId: user.retailerId ?? undefined,
      recipientId: user.recipientId ?? undefined,
    });

    return new MeResponseDto({
      id: user.id,
      email: user.email,
      role: user.role,
      retailer: retailer ? new RetailerResponseDto(retailer) : null,
      recipient: recipient ? new RecipientResponseDto(recipient) : null,
      primaryLocation: primaryLocation
        ? new LocationResponseDto(primaryLocation)
        : null,
      primaryContactName: primaryContact?.fullName ?? null,
      impact: new ImpactSummaryDto(totals),
    });
  }

  /**
   * Finds the branch the apps should treat as "the current store".
   *
   * Falls back to the oldest active branch: an organization that never flagged
   * a primary still has to land somewhere on sign-in.
   * @param user The signed-in user.
   * @returns A Promise that resolves with the branch, or null when there is none.
   */
  private async findPrimaryLocation(user: User): Promise<Location | null> {
    if (!user.retailerId && !user.recipientId) {
      return null;
    }

    const owner = user.retailerId
      ? { retailerId: user.retailerId }
      : { recipientId: user.recipientId as string };

    return await this.locationRepository.findOne({
      where: { ...owner, isActive: true },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * Finds the organization's primary contact, which both apps print by name.
   * @param user The signed-in user.
   * @returns A Promise that resolves with the contact, or null when there is none.
   */
  private async findPrimaryContact(user: User): Promise<Contact | null> {
    if (!user.retailerId && !user.recipientId) {
      return null;
    }

    const owner = user.retailerId
      ? { retailerId: user.retailerId }
      : { recipientId: user.recipientId as string };

    return await this.contactRepository.findOne({
      where: owner,
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }
}
