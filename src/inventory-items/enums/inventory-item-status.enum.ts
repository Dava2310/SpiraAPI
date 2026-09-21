/** Lifecycle of a stock lot flagged for donation. Nothing is ever hard-deleted; a lot reaches a terminal state instead. */
export enum InventoryItemStatus {
  IN_INVENTORY = 'IN_INVENTORY',
  RESERVED = 'RESERVED',
  DONATED = 'DONATED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
}

export const INVENTORY_ITEM_STATUS_ENUM_NAME = 'inventory_item_status';
