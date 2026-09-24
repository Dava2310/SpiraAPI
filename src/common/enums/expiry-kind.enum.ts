/**
 * Which kind of date a lot's `expiresAt` is.
 *
 * The distinction is legal, not cosmetic. Under EU food information law a
 * *best before* date is about quality: food past it may still be given away, and
 * redistributing it is most of what surplus recovery is for. A *use by* date is
 * about safety: food past it is deemed unsafe and must not be distributed at all,
 * by the shop, by the organization collecting it, or by us in between.
 *
 * So the two cannot share one rule. A lot past its use-by leaves the shelf and
 * cannot be claimed; a lot past its best-before stays available and is simply
 * labelled.
 */
export enum ExpiryKind {
  /** Quality date. Still donatable afterwards. */
  BEST_BEFORE = 'BEST_BEFORE',

  /** Safety date. Not donatable afterwards. */
  USE_BY = 'USE_BY',
}

/** Postgres enum type name, so the entity and the migration agree. */
export const EXPIRY_KIND_ENUM_NAME = 'expiry_kind';
