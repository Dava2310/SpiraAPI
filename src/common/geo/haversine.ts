const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance between two points, in kilometres.
 *
 * Computed per request rather than stored: distance is a property of the viewer,
 * not of the store, and the demo's `distanceKm` column was wrong for everyone
 * but whoever seeded it.
 * @param fromLat Origin latitude in decimal degrees.
 * @param fromLng Origin longitude in decimal degrees.
 * @param toLat Destination latitude in decimal degrees.
 * @param toLng Destination longitude in decimal degrees.
 * @returns The distance in kilometres, to one decimal place.
 */
export function haversineKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(deltaLng / 2) ** 2;

  return (
    Math.round(
      EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10,
    ) / 10
  );
}

/**
 * Latitude and longitude deltas that bound a radius.
 *
 * Used to pre-filter in SQL before the exact haversine runs in memory: a
 * bounding box is indexable, a trigonometric expression is not.
 * @param latitude Origin latitude in decimal degrees.
 * @param radiusKm The radius to bound.
 * @returns The degree deltas to add and subtract.
 */
export function boundingBoxDeltas(
  latitude: number,
  radiusKm: number,
): { latDelta: number; lngDelta: number } {
  const latDelta = radiusKm / 111;
  const cosLat = Math.cos((latitude * Math.PI) / 180);

  return {
    latDelta,
    // Near the poles the longitude span explodes; clamping avoids dividing by
    // something indistinguishable from zero.
    lngDelta: radiusKm / (111 * Math.max(Math.abs(cosLat), 0.01)),
  };
}
