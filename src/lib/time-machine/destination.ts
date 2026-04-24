import {
  DESTINATION_COUNTRIES,
  type DestinationCountry,
  type DestinationEra,
} from "@/app/time-machine/_data/time-machine-destinations";

export const DEFAULT_DESTINATION_COUNTRY =
  DESTINATION_COUNTRIES.find((country) => country.code === "US") ??
  DESTINATION_COUNTRIES[0];

export function isDestinationCountryCode(
  value: string | undefined,
): value is DestinationCountry["code"] {
  if (!value) {
    return false;
  }

  return DESTINATION_COUNTRIES.some((country) => country.code === value);
}

export function resolveDestinationSelection({
  countryCode,
  eraId,
}: {
  countryCode?: string;
  eraId?: string;
}) {
  if (eraId) {
    const matchedCountry = DESTINATION_COUNTRIES.find((country) =>
      country.eras.some((era) => era.id === eraId),
    );

    if (matchedCountry) {
      const matchedEra = matchedCountry.eras.find((era) => era.id === eraId);

      if (matchedEra) {
        return {
          country: matchedCountry,
          era: matchedEra,
        };
      }
    }
  }

  if (isDestinationCountryCode(countryCode)) {
    const matchedCountry = DESTINATION_COUNTRIES.find(
      (country) => country.code === countryCode,
    );

    if (matchedCountry) {
      return {
        country: matchedCountry,
        era: matchedCountry.eras[0],
      };
    }
  }

  return {
    country: DEFAULT_DESTINATION_COUNTRY,
    era: DEFAULT_DESTINATION_COUNTRY.eras[0],
  };
}

export function readQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveDestinationByDiary({
  countryCode,
  eraId,
}: {
  countryCode: string;
  eraId: string;
}): {
  country: DestinationCountry;
  era: DestinationEra;
} {
  return resolveDestinationSelection({
    countryCode,
    eraId,
  });
}
