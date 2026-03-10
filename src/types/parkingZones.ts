export interface ZonePrice {
    unit: string;
    price: string;
}

export interface ZoneEnforcement {
    weekday: string | null;
    saturday: string | null;
    sunday: string | null;
}

export interface SubzoneInfo {
    name: string;
    sms?: string;
    enforcement: ZoneEnforcement;
    maxTime: string | null;
    prices: ZonePrice[];
}

export interface ZoneInfo {
    sms: string | null;
    name: string;
    enforcement: ZoneEnforcement;
    maxTime: string | null;
    prices: ZonePrice[];
    subzones: Record<string, SubzoneInfo>;
}

export interface ParkingZoneProperties {
    id: string;
    zone: number;
    subzone: string | null;
    block: string;
    name: string;
    color: string;
    streets: string[];
}

export interface ParkingZonesData {
    type: 'FeatureCollection';
    features: GeoJSONParkingFeature[];
    zoneInfo: Record<string, ZoneInfo>;
}

export interface GeoJSONParkingFeature {
    type: 'Feature';
    geometry: {
        type: 'Polygon';
        coordinates: number[][][];
    };
    properties: ParkingZoneProperties;
}
