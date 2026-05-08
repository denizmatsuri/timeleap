import type { DestinationCountry } from "@/lib/time-machine/destinations";

export type DestinationCountryCoordinates = {
  lat: number;
  lng: number;
};

export const DESTINATION_COUNTRY_COORDINATES: Record<
  DestinationCountry["code"],
  DestinationCountryCoordinates
> = {
  EG: { lat: 27, lng: 30 },
  FR: { lat: 46, lng: 2 },
  GB: { lat: 54, lng: -2 },
  IN: { lat: 22, lng: 79 },
  JP: { lat: 36, lng: 138 },
  KR: { lat: 36, lng: 128 },
  MX: { lat: 23, lng: -102 },
  TR: { lat: 39, lng: 35 },
  US: { lat: 39, lng: -97 },
};

export function getDestinationCountryCoordinates(
  countryCode: DestinationCountry["code"],
) {
  return DESTINATION_COUNTRY_COORDINATES[countryCode];
}
