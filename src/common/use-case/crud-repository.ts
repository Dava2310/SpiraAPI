/**
 * @interface CrudRepository
 * Generic contract for repositories that manage entities, narrowed to a single
 * concern: looking up a valid entity by its identifier.
 *
 * @template T The entity type this repository works with.
 */
export interface CrudRepository<T = unknown> {
  /**
   * Finds a valid entity by its identifier.
   * Each implementation defines what "valid" means for it (for example: not
   * soft-deleted, active, etc.).
   *
   * @param id The identifier of the entity to look up (number or string).
   * @returns A Promise that resolves with the entity, if it is valid.
   * @template T The entity type expected to be found.
   */
  findValid(id: number | string): Promise<T>;
}
