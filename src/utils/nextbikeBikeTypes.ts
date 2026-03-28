/**
 * Nextbike `bike_types` keys for Zagreb Bajs (domain hd). Not in API docs;
 * IDs observed in live feed (classic vs child-seat cargo).
 */
export function bajsZagrebBikeTypeI18nKey(typeId: string): null | string {
  switch (typeId) {
    case '196':
      return 'cyclingMode.nextbikeBikeType196';
    case '409':
      return 'cyclingMode.nextbikeBikeType409';
    default:
      return null;
  }
}
