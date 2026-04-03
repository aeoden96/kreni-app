import type { ReactNode } from 'react';

import { firstNumberProp, firstStringProp } from '../../utils/geojsonPropertyPick';
import { extractMapFavouriteSourceId } from '../../utils/mapPlaceFavouriteKey';
import { acceptedMaterialsLine } from '../../utils/recyclingAcceptedMaterials';
import {
  CITY_CLUSTER_INTERNAL_LAYER_KEY,
  isMergedPointClusterLayerId,
  type MergedPointClusterLayerId,
} from './cityPointClusterConstants';
import { MapFavouriteStarButton } from './MapFavouriteStarButton';
import { MapTooltip } from './MapTooltip';
import { NextbikeClusterMapTooltip } from './modes/cycling/NextbikeClusterMapTooltip';

export function CityClusterLeafTooltip({
  lat,
  lng,
  properties,
}: {
  lat: number;
  lng: number;
  properties: Record<string, unknown>;
}) {
  const layerId = properties[CITY_CLUSTER_INTERNAL_LAYER_KEY];
  if (!isLayerId(layerId)) return null;

  if (layerId === 'nextbikeStations') {
    return <NextbikeClusterMapTooltip lat={lat} lng={lng} properties={properties} />;
  }

  const body = renderLeafTooltipBody(layerId, properties);
  if (!body) return null;

  return (
    <MapTooltip
      {...body}
      headerActions={
        <MapFavouriteStarButton
          lat={lat}
          layerId={layerId}
          lng={lng}
          sourceId={extractMapFavouriteSourceId(layerId, properties)}
          title={body.title}
        />
      }
    />
  );
}

function formatDate(ts: null | number | undefined): null | string {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString('hr-HR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function isLayerId(v: unknown): v is MergedPointClusterLayerId {
  return typeof v === 'string' && isMergedPointClusterLayerId(v);
}

function renderLeafTooltipBody(
  layerId: MergedPointClusterLayerId,
  p: Record<string, unknown>
): null | {
  className?: string;
  description?: ReactNode;
  keyValues?: Record<string, null | ReactNode | undefined>;
  offset?: [number, number];
  title: ReactNode;
} {
  switch (layerId) {
    case 'bikeParkings': {
      const stands = firstNumberProp(p, ['stands']);
      const capacity = firstNumberProp(p, ['capacity']);
      return {
        keyValues: {
          Stalaka: stands !== undefined ? String(stands) : '?',
          ...(capacity !== undefined && capacity > 0
            ? { 'Mjesta za bicikle': String(capacity) }
            : {}),
        },
        offset: [0, -12],
        title: firstStringProp(p, ['name']) || 'Biciklističko parkiralište',
      };
    }
    case 'cultural':
      return {
        description: firstStringProp(p, ['adresa', 'ADRESA']),
        keyValues: {
          Email: firstStringProp(p, ['email', 'Email']),
          'Energetski razred': firstStringProp(p, ['energetski_razred']),
          'Radno vrijeme': firstStringProp(p, ['radno_vrijeme', 'Radno_vrijeme']),
          Telefon: firstStringProp(p, ['telefon', 'Telefon']),
          Ustanove: firstStringProp(p, ['ustanove', 'Ustanove']),
          Web: firstStringProp(p, ['web', 'Web']),
        },
        title: firstStringProp(p, ['naziv', 'NAZIV']) || 'Kulturna ustanova',
      };
    case 'dogParks':
      return {
        description: (p.lokacija || p.Lokacija || p.adresa) as ReactNode,
        keyValues: {
          'Gradska četvrt': (p.GC || p.gc || p.G_cetvrt || p.g_cetvrt) as ReactNode,
        },
        title: (p.Vrsta || p.vrsta || p.naziv || 'Javna površina za pse') as ReactNode,
      };
    case 'electricCharging': {
      const broj = firstNumberProp(p, ['BROJ_UTICNICA', 'broj_uticnica']);
      const tip = firstStringProp(p, ['TIP_UTICNICE', 'tip_uticnice']);
      return {
        className: 'custom-tooltip shadow-lg',
        description: firstStringProp(p, ['ADRESA', 'adresa']),
        keyValues: {
          'Broj utičnica': broj !== undefined ? String(broj) : undefined,
          'Tip utičnice': tip,
        },
        offset: [0, -16],
        title: firstStringProp(p, ['NAZIV', 'naziv']) || 'Punionica',
      };
    }
    case 'evacuation': {
      const areaHaRaw = p.Povrsina_ha ?? p.povrsina_ha;
      const areaHaNum = typeof areaHaRaw === 'number' ? areaHaRaw : Number(areaHaRaw);
      const areaHa = Number.isFinite(areaHaNum) ? `${areaHaNum.toFixed(2)} ha` : undefined;
      return {
        description: firstStringProp(p, ['Tip', 'tip']),
        keyValues: {
          'Gradska četvrt': firstStringProp(p, ['G_cetvrt', 'g_cetvrt', 'grad_cetvrt']),
          Površina: areaHa,
        },
        title: firstStringProp(p, ['NAZIV', 'naziv']) || 'Evakuacijsko područje',
      };
    }
    case 'fountains': {
      const status: null | string = (p.status_odrz as null | string) || null;
      const datumTeren = formatDate(p.datum_teren as null | number);
      const napomenaTeren: null | string = (p.napomena_teren as string) || null;
      const lok = firstStringProp(p, ['lokacija', 'Lokacija']);
      return {
        description: (
          <>
            {lok && (
              <div className="text-[11px] sm:text-xs text-base-content/70 leading-snug break-words [overflow-wrap:anywhere]">
                {lok}
              </div>
            )}
            <div
              className={`text-[11px] sm:text-xs mt-0.5 font-semibold leading-snug ${statusClass(status)}`}
            >
              {status || 'Status nepoznat'}
            </div>
            {datumTeren && (
              <div className="text-[10px] text-base-content/60 mt-0.5 leading-snug">
                Održavanje: {datumTeren}
              </div>
            )}
            {napomenaTeren && (
              <div className="text-[10px] text-base-content/60 italic mt-0.5 leading-snug break-words [overflow-wrap:anywhere]">
                {napomenaTeren}
              </div>
            )}
          </>
        ),
        keyValues: {
          'Broj vodomjera': firstStringProp(p, ['broj_vodomjera']),
          'Gradska četvrt': firstStringProp(p, ['naziv_gc']),
          'Katastarska općina': firstStringProp(p, ['ko_naziv']),
          'Napomena (održavanje)': firstStringProp(p, ['napomena_odrzavanje']),
          'Teren (stanje)': firstStringProp(p, ['teren_dane', 'status_unos']),
        },
        offset: [0, -12],
        title: firstStringProp(p, ['tip_zdenca', 'Tip_zdenca']) || 'Javni zdenac',
      };
    }
    case 'fountainsExtra':
      return {
        description: firstStringProp(p, ['adresa', 'ADRESA']),
        title: firstStringProp(p, ['naziv', 'NAZIV']) || 'Pojilica',
      };
    case 'galleries':
      return {
        description: p.Description as ReactNode,
        keyValues: {
          Email: p['E-mail'] as ReactNode,
          Telefon: p.Tel as ReactNode,
          Web: p.Web as ReactNode,
        },
        title: (p.Name || 'Galerija') as ReactNode,
      };
    case 'gardens':
      return {
        description: p.adresa as ReactNode,
        keyValues: {
          'Gradska četvrt': (p.grad_cetvrt || p.G_cetvrt || p.g_cetvrt) as ReactNode,
          Korisnici: typeof p.br_korisnika === 'number' ? p.br_korisnika : undefined,
          Otvoren: p.godina_otvaranja as ReactNode,
          Parcele: typeof p.br_vr_parcela === 'number' ? p.br_vr_parcela : undefined,
        },
        title: (p.naziv || p.NAZIV || 'Gradski vrt') as ReactNode,
      };
    case 'gasStations':
      return {
        className: 'custom-tooltip shadow-lg',
        description: firstStringProp(p, ['ADRESA', 'adresa']),
        offset: [0, -14],
        title: firstStringProp(p, ['NAZIV', 'naziv']) || 'Benzinska postaja',
      };
    case 'graffiti':
      return {
        description: p.detaljni_opis_lokacije as ReactNode,
        keyValues: {
          'Broj naloga': p.broj_naloga as ReactNode,
          'Datum odobravanja': p.datum_odobravanja as ReactNode,
        },
        title: `Grafit #${(p.id as number | string | undefined) ?? '?'}`,
      };
    case 'healthHomes': {
      const webField = firstStringProp(p, ['Domovi_zdravlja_web', 'web', 'Web']);
      const telField = firstStringProp(p, ['Domovi_zdravlja_telefon', 'telefon', 'Telefon']);
      const telIsUrl = telField ? /^https?:\/\//i.test(telField) : false;
      return {
        description: firstStringProp(p, ['Domovi_zdravlja_adresa', 'adresa', 'ADRESA']),
        keyValues: {
          Telefon: telField && !telIsUrl ? telField : undefined,
          Web: webField || (telIsUrl ? telField : undefined),
        },
        title: firstStringProp(p, ['Domovi_zdravlja_naziv', 'naziv', 'NAZIV']) || 'Dom zdravlja',
      };
    }
    case 'healthInst':
      return {
        description: firstStringProp(p, ['adresa', 'ADRESA']),
        keyValues: {
          Email: firstStringProp(p, ['email', 'Email']),
          Fax: firstStringProp(p, ['fax', 'Fax']),
          Telefon: firstStringProp(p, ['telefon', 'Telefon']),
          Web: firstStringProp(p, ['web', 'Web']),
        },
        title: firstStringProp(p, ['naziv', 'NAZIV']) || 'Zdravstvena ustanova',
      };
    case 'markets': {
      const infoLink = firstStringProp(p, ['radno_vrijeme', 'Radno_vrijeme']);
      return {
        description: firstStringProp(p, ['adresa', 'ADRESA']),
        keyValues: {
          Email: firstStringProp(p, ['email', 'Email']),
          'Informacije (poveznica)':
            infoLink && /^https?:\/\//i.test(infoLink) ? infoLink : undefined,
          'Radno vrijeme': infoLink && !/^https?:\/\//i.test(infoLink) ? infoLink : undefined,
          Telefon: firstStringProp(p, ['telefon', 'Telefon']),
          Web: firstStringProp(p, ['web', 'Web']),
        },
        title: firstStringProp(p, ['naziv', 'NAZIV']) || 'Tržnica',
      };
    }
    case 'pharmacies':
      return {
        description: firstStringProp(p, ['adresa', 'ADRESA']),
        keyValues: {
          Email: firstStringProp(p, ['email', 'Email']),
          Telefon: firstStringProp(p, ['telefon', 'Telefon']),
          Web: firstStringProp(p, ['web', 'Web']),
        },
        title: firstStringProp(p, ['naziv', 'NAZIV']) || 'Ljekarna',
      };
    case 'playgrounds':
      return {
        description: (p.lokacija || p.Lokacija || p.adresa) as ReactNode,
        keyValues: {
          'Gradska četvrt': (p.Gradska_cetvrt || p.gradska_cetvrt) as ReactNode,
          'Mjesni odbor': (p.Mjesni_odbor || p.mjesni_odbor) as ReactNode,
        },
        title: (p.Vrsta_objekta ||
          p.vrsta_objekta ||
          p.naziv ||
          'Javno sportsko igralište') as ReactNode,
      };
    case 'publicGarages': {
      const fmtInt = (n: number | undefined) =>
        n === undefined ? undefined : String(Math.trunc(n));
      return {
        className: 'custom-tooltip shadow-lg',
        description: firstStringProp(p, ['adresa', 'ADRESA']),
        keyValues: {
          'Broj etaža': fmtInt(firstNumberProp(p, ['br_etaza'])),
          'Invalidska mjesta': fmtInt(firstNumberProp(p, ['invalidska_mj'])),
          Kapacitet: fmtInt(firstNumberProp(p, ['kapacitet', 'Kapacitet'])),
          Korisnici: firstStringProp(p, ['korisnici']),
          'Mjesta za hibrid': fmtInt(firstNumberProp(p, ['mj_za_hibrid_voz'])),
          'Obiteljska mjesta': fmtInt(firstNumberProp(p, ['obiteljska_mj'])),
          'Parkiralište za bicikle': fmtInt(firstNumberProp(p, ['parkiraliste_za_bic'])),
          'Površina (m²)': fmtInt(firstNumberProp(p, ['uk_povr_m2'])),
          'Punjači (EV)': fmtInt(firstNumberProp(p, ['punionica_za_EV'])),
          Telefon: firstStringProp(p, ['telefon', 'Telefon']),
          Vlasništvo: firstStringProp(p, ['vlasnistvo']),
        },
        offset: [0, -16],
        title: firstStringProp(p, ['naziv', 'NAZIV']) || 'Javna garaža',
      };
    }
    case 'recycling': {
      const napomena = firstStringProp(p, ['NAPOMENA', 'napomena']);
      return {
        description: firstStringProp(p, ['ADRESA_LOK', 'ADRESA', 'adresa']),
        keyValues: {
          'E-mail': firstStringProp(p, ['E_MAIL', 'e_mail', 'email']),
          Napomena: napomena && napomena.length > 280 ? `${napomena.slice(0, 277)}…` : napomena,
          Prihvata: acceptedMaterialsLine(p),
          'Radno vrijeme': firstStringProp(p, ['RADNO_VRIJ', 'radno_vrij']),
          Telefon: firstStringProp(p, ['TELEFON', 'telefon']),
          Vrsta: firstStringProp(p, ['VRSTA', 'vrsta']),
          Web: firstStringProp(p, ['WEB', 'web']),
        },
        title: firstStringProp(p, ['NAZIV', 'naziv', 'NAZIV_PUNI']) || 'Reciklažno dvorište',
      };
    }
    case 'restaurants': {
      const web = firstStringProp(p, ['web', 'Web']);
      return {
        description: firstStringProp(p, ['adresa', 'ADRESA']),
        keyValues: {
          Web: web,
        },
        offset: [0, -16],
        title: firstStringProp(p, ['naziv', 'NAZIV']) || 'Studentski restoran',
      };
    }
    case 'sportsFacilities':
      return {
        description: p.adresa as ReactNode,
        keyValues: {
          Kategorija: p.kategorija as ReactNode,
          Objekt: p.objekt as ReactNode,
          Opremljenost: p.opremljenost as ReactNode,
          Sportovi: p.sportovi as ReactNode,
          Telefon: p.telefon as ReactNode,
          Upravljač: p.upravljac as ReactNode,
          Web: p.web as ReactNode,
        },
        title: (p.naziv || 'Sportski objekt') as ReactNode,
      };
    case 'surveillanceCameras': {
      const naziv = firstStringProp(p, ['naziv', 'NAZIV']);
      const lokacija = firstStringProp(p, ['lokacija', 'Lokacija']);
      const adresa = firstStringProp(p, ['adresa', 'ADRESA']);
      const title = naziv || lokacija || 'Nadzorna kamera';
      const description = adresa || (lokacija && lokacija !== title ? lokacija : undefined);
      return {
        className: 'custom-tooltip shadow-lg',
        description,
        keyValues: {
          Email: firstStringProp(p, ['email', 'Email']),
          Fax: firstStringProp(p, ['fax', 'Fax']),
          Izradio: firstStringProp(p, ['izradio', 'Izradio']),
          Izvor: firstStringProp(p, ['izvor', 'Izvor']),
          'Nadležno tijelo': firstStringProp(p, ['nadlezan', 'Nadlezan']),
          Osnivač: firstStringProp(p, ['osnivac', 'Osnivac']),
          Telefon: firstStringProp(p, ['telefon', 'Telefon']),
          Web: firstStringProp(p, ['web', 'Web']),
        },
        offset: [0, -14],
        title,
      };
    }
    case 'taxiStands': {
      const lokacija = firstStringProp(p, ['lokacija', 'Lokacija']);
      const nadlezan = firstStringProp(p, ['nadlezan', 'Nadlezan']);
      return {
        description: lokacija,
        keyValues: {
          Nadležan: nadlezan,
        },
        title: 'Taxi stajalište',
      };
    }
    case 'toilets':
      return {
        description: firstStringProp(p, ['adresa', 'ADRESA']),
        keyValues: {
          Naplata: firstStringProp(p, ['naplata', 'Naplata']),
        },
        title: firstStringProp(p, ['naziv', 'NAZIV']) || 'Javni WC',
      };
    case 'wifi':
      return {
        description: firstStringProp(p, ['lokacija', 'Lokacija']),
        offset: [0, -12],
        title: 'Besplatna WiFi mreža',
      };
    default:
      return null;
  }
}

function statusClass(status: null | string | undefined): string {
  if (!status) return 'text-base-content/50';
  if (status === 'u funkciji') return 'text-success';
  if (status === 'nije u funkciji') return 'text-error';
  return 'text-warning';
}
