export interface GeoJSONParkingFeature {
  geometry: {
    coordinates: number[][][];
    type: 'Polygon';
  };
  properties: ParkingZoneProperties;
  type: 'Feature';
}

export interface ParkingZoneProperties {
  block: string;
  color: string;
  id: string;
  name: string;
  streets: string[];
  subzone: null | string;
  zone: number;
}

export interface ParkingZonesData {
  features: GeoJSONParkingFeature[];
  type: 'FeatureCollection';
  zoneInfo: Record<string, ZoneInfo>;
}

export interface SubzoneInfo {
  enforcement: ZoneEnforcement;
  maxTime: null | string;
  name: string;
  prices: ZonePrice[];
  sms?: string;
}

export interface ZoneEnforcement {
  saturday: null | string;
  sunday: null | string;
  weekday: null | string;
}

export interface ZoneInfo {
  enforcement: ZoneEnforcement;
  maxTime: null | string;
  name: string;
  prices: ZonePrice[];
  sms: null | string;
  subzones: Record<string, SubzoneInfo>;
}

export interface ZonePrice {
  price: string;
  unit: string;
}
