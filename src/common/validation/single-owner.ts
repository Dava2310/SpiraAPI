import { BadRequestException } from '@nestjs/common';

/**
 * Enforces the `num_nonnulls(retailer_id, recipient_id) = 1` check the database
 * applies to owned records, so a violation surfaces as a 400 rather than a
 * driver error.
 * @param entityName Name of the record being validated, used in the message.
 * @param retailerId The retailer link, if any.
 * @param recipientId The recipient link, if any.
 * @throws BadRequestException If zero or both owners are set.
 */
export function assertSingleOwner(
  entityName: string,
  retailerId?: string | null,
  recipientId?: string | null,
): void {
  const owners = [retailerId, recipientId].filter((id) => id != null).length;

  if (owners !== 1) {
    throw new BadRequestException(
      `A ${entityName} must belong to exactly one of retailerId or recipientId.`,
    );
  }
}
