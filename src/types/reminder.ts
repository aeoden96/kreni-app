/**
 * A recurring departure reminder, anchored to a favourite stop. Fires an on-device
 * local notification at {hour}:{minute} on each selected weekday. Anchored to the
 * timetable clock time the user picks — never a live ETA (see the feed trust model).
 */
export interface DepartureReminder {
  /** True while OS notifications are scheduled for it. */
  enabled: boolean;
  hour: number;
  /** Stable unique id (uuid-ish). */
  id: string;
  minute: number;
  /** Specific route at the stop, or null = any route serving it. */
  routeId: null | string;
  /**
   * Small monotonic integer used to derive notification ids
   * (`slot * 10 + capacitorWeekday`). Assigned at creation, never reused.
   */
  slot: number;
  stopId: string;
  /** Days the reminder repeats, 0 = Sunday … 6 = Saturday (JS `Date.getDay()`). */
  weekdays: number[];
}
