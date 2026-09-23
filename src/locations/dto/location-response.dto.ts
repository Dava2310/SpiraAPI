import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { Location } from '../entities/location.entity.js';
import type { OpeningHours } from '../entities/opening-hours.interface.js';
import type { PickupWindow } from '../entities/pickup-window.interface.js';
import { LocationType } from '../enums/location-type.enum.js';
import { OpeningHoursDto } from './opening-hours.dto.js';
import { PickupWindowDto } from './pickup-window.dto.js';

/** API representation of a location. */
export class LocationResponseDto {
  @ApiProperty({ description: 'Unique location ID.', format: 'uuid' })
  id: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Owning retailer. Exactly one owner is set.',
    format: 'uuid',
    nullable: true,
  })
  retailerId: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Owning recipient. Exactly one owner is set.',
    format: 'uuid',
    nullable: true,
  })
  recipientId: string | null;

  @ApiProperty({
    description: 'Human-readable name for the site.',
    example: 'Sucursal Centro',
  })
  label: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Human-readable branch code.',
    nullable: true,
    example: 'WF-NYC-402',
  })
  code: string | null;

  @ApiProperty({
    description: 'What kind of site this is.',
    enum: LocationType,
    enumName: 'LocationType',
    example: LocationType.STORE,
  })
  type: LocationType;

  @ApiPropertyOptional({
    type: String,
    description: 'How this branch describes itself.',
    nullable: true,
    example: 'Organic Grocery & Fresh Market',
  })
  storeFormat: string | null;

  @ApiProperty({
    type: String,
    description: 'Street address, first line.',
  })
  addressLine1: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Street address, second line.',
    nullable: true,
  })
  addressLine2: string | null;

  @ApiProperty({ description: 'City.', example: 'Asunción' })
  city: string;

  @ApiPropertyOptional({
    type: String,
    description: 'District or neighbourhood.',
    nullable: true,
    example: 'Eixample',
  })
  neighborhood: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'State, region or department.',
    nullable: true,
  })
  state: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Postal code.',
    nullable: true,
  })
  postalCode: string | null;

  @ApiProperty({
    description: 'Country as an ISO 3166-1 alpha-2 code.',
    example: 'PY',
  })
  countryCode: string;

  @ApiPropertyOptional({
    description: 'Latitude in decimal degrees.',
    type: Number,
    nullable: true,
  })
  latitude: number | null;

  @ApiPropertyOptional({
    description: 'Longitude in decimal degrees.',
    type: Number,
    nullable: true,
  })
  longitude: number | null;

  @ApiProperty({
    description: 'IANA timezone of the site.',
    example: 'America/Asuncion',
  })
  timezone: string;

  @ApiPropertyOptional({
    description: 'Public opening hours, by weekday.',
    type: [OpeningHoursDto],
    nullable: true,
  })
  openingHours: OpeningHours[] | null;

  @ApiPropertyOptional({
    description: 'Recurring collection availability, by weekday.',
    type: [PickupWindowDto],
    nullable: true,
  })
  pickupWindows: PickupWindow[] | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Arrival notes for a collecting driver.',
    nullable: true,
  })
  accessInstructions: string | null;

  @ApiProperty({ description: 'Whether the site has refrigerated storage.' })
  hasColdStorage: boolean;

  @ApiProperty({ description: 'Whether the site has a freezer.' })
  hasFreezer: boolean;

  @ApiPropertyOptional({
    type: String,
    description: 'Direct line for the site, in E.164 format.',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({ description: 'Whether this is the main site.' })
  isPrimary: boolean;

  @ApiProperty({ description: 'Whether the site is accepting collections.' })
  isActive: boolean;

  @ApiPropertyOptional({
    type: String,
    description:
      'Owning organization name, present when the owner relation was loaded.',
    nullable: true,
    example: 'Mercadona',
  })
  ownerName: string | null;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Whether the owning organization is verified, when the owner was loaded.',
    nullable: true,
  })
  ownerIsVerified: boolean | null;

  @ApiPropertyOptional({
    type: String,
    description:
      'Name of the site-level contact to ask for, when the contacts were loaded.',
    nullable: true,
    example: 'Marta Ruiz',
  })
  managerName: string | null;

  @ApiProperty({
    description:
      'When the site joined the platform (ISO 8601). Same as creation, named for the profile screens.',
    type: String,
    format: 'date-time',
  })
  memberSince: string;

  @ApiProperty({
    description:
      "Today's collection windows, derived from the site's pickup slots when they were loaded.",
    type: [String],
    example: ['18:30 - 20:00'],
  })
  pickupHoursToday: string[];

  @ApiProperty({
    description: 'When the location was created (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the location was last modified (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;

  /**
   * Maps a Location entity onto its API representation.
   * @param data The Location entity loaded from the database.
   */
  constructor(data: Location) {
    this.id = data.id;
    this.retailerId = data.retailerId;
    this.recipientId = data.recipientId;
    this.label = data.label;
    this.code = data.code;
    this.type = data.type;
    this.addressLine1 = data.addressLine1;
    this.addressLine2 = data.addressLine2;
    this.storeFormat = data.storeFormat;
    this.neighborhood = data.neighborhood;
    this.accessInstructions = data.accessInstructions;
    this.city = data.city;
    this.state = data.state;
    this.postalCode = data.postalCode;
    this.countryCode = data.countryCode;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.timezone = data.timezone;
    this.openingHours = data.openingHours;
    this.pickupWindows = data.pickupWindows;
    this.hasColdStorage = data.hasColdStorage;
    this.hasFreezer = data.hasFreezer;
    this.phone = data.phone;
    this.isPrimary = data.isPrimary;
    this.isActive = data.isActive;
    this.ownerName =
      data.retailer?.tradeName ??
      data.retailer?.legalName ??
      data.recipient?.displayName ??
      null;
    this.ownerIsVerified =
      data.retailer || data.recipient
        ? ((data.retailer ?? data.recipient)?.verifiedAt ?? null) !== null
        : null;
    this.managerName =
      data.contacts?.find((contact) => contact.isPrimary)?.fullName ??
      data.contacts?.[0]?.fullName ??
      null;
    this.memberSince = data.createdAt.toISOString();
    this.pickupHoursToday = LocationResponseDto.todaysWindows(data);
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }

  /**
   * Renders the collection windows that apply today, as labels.
   *
   * Derived rather than stored: the demo carried a `pickupHours` string that no
   * longer matched the slots it was written from.
   * @param data The location, with its pickup slots loaded or not.
   * @returns The labels for today, empty when nothing applies or none were loaded.
   */
  private static todaysWindows(data: Location): string[] {
    if (!data.pickupSlots) {
      return [];
    }

    const isoWeekday = ((new Date().getUTCDay() + 6) % 7) + 1;

    return data.pickupSlots
      .filter(
        (slot) =>
          slot.isActive &&
          (slot.weekday === null || slot.weekday === isoWeekday),
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map(
        (slot) => `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`,
      );
  }
}
