import type { Feature, FeatureCollection, Point } from 'geojson';

import Papa from 'papaparse';

export interface SportsFacilityProps {
  adresa?: string;
  email?: string;
  kategorija?: string;
  naziv?: string;
  objekt?: string;
  opremljenost?: string;
  sportovi?: string;
  telefon?: string;
  upravljac?: string;
  web?: string;
}

interface CsvPointProperties {
  [key: string]: string | undefined;
}

type CsvRow = Record<string, string>;

export function parseGalleriesCsv(rawCsv: string): FeatureCollection<Point, CsvPointProperties> {
  return parseCsvPoints(rawCsv, {
    delimiter: ';',
    latKeys: ['Latitude', 'LATITUDE', 'Y'],
    lonKeys: ['Longitude', 'LONGITUDE', 'X'],
  });
}

export function parseGraffitiCsv(rawCsv: string): FeatureCollection<Point, CsvPointProperties> {
  return parseCsvPoints(rawCsv, {
    delimiter: ';',
    latKeys: ['LATITUDE', 'Latitude', 'Y'],
    lonKeys: ['LONGITUDE', 'Longitude', 'X'],
  });
}

export function parsePublicArchitectureCompetitionsCsv(
  rawCsv: string
): FeatureCollection<Point, CsvPointProperties> {
  return parseCsvPoints(rawCsv, {
    latKeys: ['Y', 'Latitude', 'LATITUDE'],
    lonKeys: ['X', 'Longitude', 'LONGITUDE'],
  });
}

export function parseSportsFacilitiesCsv(
  rawCsv: string
): FeatureCollection<Point, SportsFacilityProps> {
  const parsed = Papa.parse<CsvRow>(rawCsv, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0]?.message ?? 'Unknown parse error'}`);
  }

  const features = parsed.data
    .map((row) => toFeature(row))
    .filter((feature): feature is Feature<Point, SportsFacilityProps> => feature !== null);

  return {
    features,
    type: 'FeatureCollection',
  };
}

function getRowValue(row: CsvRow, key: string): string | undefined {
  const value = row[key];
  return value?.trim() || undefined;
}

function parseCoordinate(value: string | undefined): null | number {
  if (!value) return null;
  const parsed = Number.parseFloat(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCsvPoints(
  rawCsv: string,
  options: {
    delimiter?: string;
    latKeys: string[];
    lonKeys: string[];
  }
): FeatureCollection<Point, CsvPointProperties> {
  const parsed = Papa.parse<CsvRow>(rawCsv, {
    delimiter: options.delimiter,
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0]?.message ?? 'Unknown parse error'}`);
  }

  const features = parsed.data
    .map((row) => toGenericFeature(row, options.latKeys, options.lonKeys))
    .filter((feature): feature is Feature<Point, CsvPointProperties> => feature !== null);

  return {
    features,
    type: 'FeatureCollection',
  };
}

function pickCoordinate(row: CsvRow, keys: string[]): null | number {
  for (const key of keys) {
    const parsed = parseCoordinate(getRowValue(row, key));
    if (parsed !== null) return parsed;
  }

  return null;
}

function toFeature(row: CsvRow): Feature<Point, SportsFacilityProps> | null {
  const lon = parseCoordinate(row.X);
  const lat = parseCoordinate(row.Y);

  if (lat === null || lon === null) return null;

  return {
    geometry: {
      coordinates: [lon, lat],
      type: 'Point',
    },
    properties: {
      adresa: row.adresa,
      email: row.email,
      kategorija: row.kategorija,
      naziv: row.naziv,
      objekt: row.objekt,
      opremljenost: row.opremljenost,
      sportovi: row.sportovi,
      telefon: row.telefon,
      upravljac: row.upravljac,
      web: row.web,
    },
    type: 'Feature',
  };
}

function toGenericFeature(
  row: CsvRow,
  latKeys: string[],
  lonKeys: string[]
): Feature<Point, CsvPointProperties> | null {
  const lat = pickCoordinate(row, latKeys);
  const lon = pickCoordinate(row, lonKeys);

  if (lat === null || lon === null) return null;

  const properties = Object.fromEntries(
    Object.entries(row)
      .map(([key, value]) => [key.trim(), value?.trim() || undefined])
      .filter(([, value]) => value !== undefined)
  ) as CsvPointProperties;

  return {
    geometry: {
      coordinates: [lon, lat],
      type: 'Point',
    },
    properties,
    type: 'Feature',
  };
}
