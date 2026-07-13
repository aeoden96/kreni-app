import type { RouteTimetable, Stop } from '../../../utils/gtfs';
import type { ParsedTripUpdate, ParsedVehiclePosition } from '../../../utils/realtime';
import type { VehiclePosition } from '../../../utils/vehicles';

import { useVehicleStopPreview } from '../../../hooks/useVehicleStopPreview';
import { VehicleStopTimeline } from './VehicleStopTimeline';

interface FocusedVehicleCardProps {
  activeTripId: string;
  clickedTripUpdate?: null | ParsedTripUpdate;
  clickedVehicle?: null | VehiclePosition;
  clickedVehiclePos?: null | ParsedVehiclePosition;
  color: string;
  routeTimetable?: null | RouteTimetable;
  stopsById?: Map<string, Stop>;
  timetableLoading?: boolean;
}

/** The focused vehicle's itinerary (next stops + delay/distance). */
export function FocusedVehicleCard({
  activeTripId,
  clickedTripUpdate,
  clickedVehicle,
  clickedVehiclePos,
  color,
  routeTimetable,
  stopsById,
  timetableLoading = false,
}: FocusedVehicleCardProps) {
  const preview = useVehicleStopPreview({
    activeTripId,
    clickedTripUpdate,
    clickedVehicle,
    clickedVehiclePos,
    routeTimetable,
    stopsById,
  });

  if (!preview) return null;

  return (
    <div className="mt-1 bg-base-200/50 rounded-xl p-3 border border-base-300 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
      <VehicleStopTimeline
        color={color}
        gpsActive={!!clickedVehiclePos}
        preview={preview}
        timetableLoading={timetableLoading}
      />
    </div>
  );
}
