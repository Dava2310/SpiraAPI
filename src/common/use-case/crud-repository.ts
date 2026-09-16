/**
 * @interface CrudRepository
 * Interfaz genérica que define un contrato básico para repositorios
 * que gestionan entidades, enfocándose en la operación de búsqueda
 * de una entidad válida por su identificador.
 *
 * @template T El tipo de entidad con el que trabaja el repositorio.
 */
export interface CrudRepository<T = unknown> {
  /**
   * Busca una entidad válida por su identificador.
   * La implementación específica de este método debe definir qué significa "válida"
   * (por ejemplo, no eliminada lógicamente, activa, etc.).
   *
   * @param id El identificador de la entidad a buscar (puede ser número o cadena).
   * @returns Una Promesa que se resuelve con la entidad encontrada si es válida.
   * @template T El tipo de la entidad que se espera encontrar.
   */
  findValid(id: number | string): Promise<T>;
}
