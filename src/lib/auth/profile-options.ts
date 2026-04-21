export const GENDER_OPTIONS = [
  { value: "female", label: "여성" },
  { value: "male", label: "남성" },
  { value: "non_binary", label: "논바이너리" },
  { value: "prefer_not_to_say", label: "밝히지 않음" },
] as const;

export const AGE_RANGE_OPTIONS = [
  { value: "under_18", label: "18세 미만" },
  { value: "18_24", label: "18-24세" },
  { value: "25_34", label: "25-34세" },
  { value: "35_44", label: "35-44세" },
  { value: "45_54", label: "45-54세" },
  { value: "55_plus", label: "55세 이상" },
] as const;

export type GenderOptionValue = (typeof GENDER_OPTIONS)[number]["value"];
export type AgeRangeOptionValue = (typeof AGE_RANGE_OPTIONS)[number]["value"];
