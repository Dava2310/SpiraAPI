/** How a quantity is counted. `KG` is the only member where the quantity is itself a weight. */
export enum UnitOfMeasure {
  UNIT = 'UNIT',
  PACK = 'PACK',
  CRATE = 'CRATE',
  BOX = 'BOX',
  KG = 'KG',
}

export const UNIT_OF_MEASURE_ENUM_NAME = 'unit_of_measure';
