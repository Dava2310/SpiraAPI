import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { Location } from '../entities/location.entity.js';
import type { PickupWindow } from '../entities/pickup-window.interface.js';
import { LocationType } from '../enums/location-type.enum.js';
import { PickupWindowDto } from './pickup-window.dto.js';

/** API representation of a location. */
export class LocationResponseDto {
  @ApiProperty({ description: 'Unique location ID.', format: 'uuid' })
  id: string;

  @ApiPropertyOptional({
    description: 'Owning retailer. Exactly one owner is set.',
    format: 'uuid',
    nullable: true,
  })
  retailerId: string | null;

  @ApiPropertyOptional({
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

  @ApiProperty({
    description: 'What kind of site this is.',
    enum: LocationType,
    enumName: 'LocationType',
    example: LocationType.STORE,
  })
  type: LocationType;

  @ApiProperty({ description: 'Street address, first line.' })
  addressLine1: string;

  @ApiPropertyOptional({
    description: 'Street address, second line.',
    nullable: true,
  })
  addressLine2: string | null;

  @ApiProperty({ description: 'City.', example: 'Asunción' })
  city: string;

  @ApiPropertyOptional({
    description: 'State, region or department.',
    nullable: true,
  })
  state: string | null;

  @ApiPropertyOptional({ description: 'Postal code.', nullable: true })
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
    description: 'Recurring collection availability, by weekday.',
    type: [PickupWindowDto],
    nullable: true,
  })
  pickupWindows: PickupWindow[] | null;

  @ApiProperty({ description: 'Whether the site has refrigerated storage.' })
  hasColdStorage: boolean;

  @ApiProperty({ description: 'Whether the site has a freezer.' })
  hasFreezer: boolean;

  @ApiPropertyOptional({
    description: 'How much the site can hold, in kilograms.',
    type: Number,
    nullable: true,
  })
  storageCapacityKg: number | null;

  @ApiPropertyOptional({
    description: 'Direct line for the site, in E.164 format.',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({ description: 'Whether this is the main site.' })
  isPrimary: boolean;

  @ApiProperty({ description: 'Whether the site is accepting collections.' })
  isActive: boolean;

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
    this.type = data.type;
    this.addressLine1 = data.addressLine1;
    this.addressLine2 = data.addressLine2;
    this.city = data.city;
    this.state = data.state;
    this.postalCode = data.postalCode;
    this.countryCode = data.countryCode;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.timezone = data.timezone;
    this.pickupWindows = data.pickupWindows;
    this.hasColdStorage = data.hasColdStorage;
    this.hasFreezer = data.hasFreezer;
    this.storageCapacityKg = data.storageCapacityKg;
    this.phone = data.phone;
    this.isPrimary = data.isPrimary;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}
