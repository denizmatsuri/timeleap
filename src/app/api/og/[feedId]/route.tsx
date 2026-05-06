import { ImageResponse } from "next/og";
import { getDiaryById } from "@/lib/diaries/server";
import { createClient } from "@/lib/supabase/server";
import { resolveDestinationByDiary } from "@/lib/time-machine/destination";

const OG_SIZE = {
  height: 630,
  width: 1200,
};
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type OgRouteContext = {
  params: Promise<{
    feedId: string;
  }>;
};

function normalizeLabel(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, " ").trim().toUpperCase();
}

export async function GET(_request: Request, { params }: OgRouteContext) {
  const { feedId } = await params;

  if (!UUID_PATTERN.test(feedId)) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const diary = await getDiaryById(supabase, feedId);

  if (!diary || !diary.is_public) {
    return new Response("Not found", { status: 404 });
  }

  const { country, era } = resolveDestinationByDiary({
    countryCode: diary.country_code,
    eraId: diary.era_id,
  });
  const destinationLabel = `${country.englishName} / ${era.year}`;
  const eraLabel = normalizeLabel(era.id);

  return new ImageResponse(
    (
      <div
        style={{
          background: "#efe2c7",
          color: "#241914",
          display: "flex",
          height: "100%",
          padding: 58,
          width: "100%",
        }}
      >
        <div
          style={{
            border: "2px solid rgba(36, 25, 20, 0.2)",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
            padding: 54,
            position: "relative",
            width: "100%",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(177, 76, 47, 0.92), rgba(233, 174, 79, 0.9))",
              bottom: 52,
              height: 170,
              position: "absolute",
              right: 52,
              width: 170,
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 30,
              justifyContent: "space-between",
              letterSpacing: 5,
              textTransform: "uppercase",
            }}
          >
            <span>TIMELEAP</span>
            <span>PUBLIC DIARY</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div
              style={{
                color: "#9a432d",
                fontSize: 42,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {destinationLabel}
            </div>
            <div
              style={{
                fontSize: 88,
                fontWeight: 800,
                letterSpacing: 0,
                lineHeight: 0.98,
                maxWidth: 800,
                textTransform: "uppercase",
              }}
            >
              Archive of Impossible Days
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 30,
              justifyContent: "space-between",
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            <span>{eraLabel}</span>
            <span>timeleap diary</span>
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
