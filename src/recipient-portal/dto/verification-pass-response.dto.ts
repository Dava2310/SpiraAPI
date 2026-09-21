import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * The organization's permanent standby credential.
 *
 * Distinct from a pickup token: this identifies the organization and never
 * expires, whereas a pickup token releases one donation, once. A store can scan
 * this to confirm who is at the counter when no reservation exists yet.
 */
export class VerificationPassResponseDto {
  @ApiProperty({ description: 'The recipient.', format: 'uuid' })
  recipientId: string;

  @ApiProperty({ description: 'Public name.', example: 'Banc dels Aliments' })
  displayName: string;

  @ApiPropertyOptional({
    description: 'Charity registration number, shown as the organization ID.',
    nullable: true,
    example: 'G-12345678',
  })
  registrationCode: string | null;

  @ApiProperty({
    description:
      'What the QR encodes. Stable for the organization, so it can be printed once.',
    example: 'SPIRA-ORG:G-12345678',
  })
  passCode: string;

  @ApiProperty({ description: 'Whether an admin has verified them.' })
  isVerified: boolean;

  @ApiProperty({
    description: 'Initials, for the avatar placeholder.',
    example: 'BA',
  })
  initials: string;

  constructor(init: VerificationPassResponseDto) {
    Object.assign(this, init);
  }
}
