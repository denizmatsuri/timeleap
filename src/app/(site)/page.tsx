import Link from "next/link";

const ERAS = [
  {
    id: "wildwest",
    label: "1880s",
    title: "개척 시대",
    emoji: "🤠",
    blurb: "먼지 날리는 서부, 총잡이와 철도",
  },
  {
    id: "gilded",
    label: "1890s",
    title: "길디드 에이지",
    emoji: "🎩",
    blurb: "석유 왕과 철강 재벌의 황금기",
  },
  {
    id: "roaring",
    label: "1920s",
    title: "광란의 20년대",
    emoji: "🥂",
    blurb: "재즈와 플래퍼, 금주법의 뉴욕",
  },
  {
    id: "noir",
    label: "1940s",
    title: "느와르 시대",
    emoji: "🎞️",
    blurb: "트렌치코트와 담배 연기, 필름 누아르",
  },
  {
    id: "fifties",
    label: "1950s",
    title: "로큰롤 캘리포니아",
    emoji: "🚗",
    blurb: "엘비스와 드라이브인, 핑크 캐딜락",
  },
  {
    id: "sixties",
    label: "1960s",
    title: "히피 샌프란시스코",
    emoji: "🌻",
    blurb: "사랑과 평화, 헤이트-애쉬베리",
  },
  {
    id: "disco",
    label: "1970s",
    title: "디스코 뉴욕",
    emoji: "🪩",
    blurb: "스튜디오 54, 반짝이와 비트",
  },
  {
    id: "eighties",
    label: "1980s",
    title: "네온 마이애미",
    emoji: "📻",
    blurb: "파스텔 수트, 네온 사인, 신스팝",
  },
  {
    id: "nineties",
    label: "1990s",
    title: "그런지 시애틀",
    emoji: "🎸",
    blurb: "플란넬, 커피 문화, 얼터너티브",
  },
];

const FEED = [
  {
    id: "f001",
    author: "지민",
    initial: "J",
    eraLabel: "1920s",
    city: "뉴욕",
    date: "1925.04.18",
    title: "재즈가 흐르는 비밀 클럽의 밤",
    excerpt:
      '브라운스톤 지하에 숨겨진 문을 두드렸다. 암호는 "sparrow." 문이 열리자 색소폰이 쏟아져 나왔다—',
    ph: "ph-roaring",
    likes: 1284,
    large: true,
  },
  {
    id: "f002",
    author: "서연",
    initial: "S",
    eraLabel: "1950s",
    city: "로스앤젤레스",
    date: "1956.07.22",
    title: "핑크 캐딜락을 타고 해변으로",
    excerpt:
      "머리에 스카프를 묶고 선글라스를 썼다. 라디오에선 엘비스가 흘러나오고—",
    ph: "ph-fifties",
    likes: 2103,
    large: false,
  },
  {
    id: "f003",
    author: "현우",
    initial: "H",
    eraLabel: "1960s",
    city: "샌프란시스코",
    date: "1968.08.03",
    title: "헤이트-애쉬베리, 기타와 꽃",
    excerpt:
      "골든게이트 파크에서 누군가 기타를 치고 있었다. 머리에 꽃을 꽂은 사람들이 모여들었다—",
    ph: "ph-sixties",
    likes: 892,
    large: false,
  },
  {
    id: "f004",
    author: "민지",
    initial: "M",
    eraLabel: "1970s",
    city: "뉴욕",
    date: "1977.11.12",
    title: "스튜디오 54, 자정의 반짝임",
    excerpt:
      "문 앞 줄은 끝이 없었지만, 빨간 벨벳 로프가 걷혔다. 안쪽은 다른 행성이었다—",
    ph: "ph-disco",
    likes: 3421,
    large: false,
  },
  {
    id: "f005",
    author: "태훈",
    initial: "T",
    eraLabel: "1880s",
    city: "텍사스",
    date: "1882.03.15",
    title: "먼지와 말발굽, 국경의 바람",
    excerpt:
      "살룬 문을 밀고 들어갔을 때, 피아노 소리가 멈췄다. 바텐더가 위스키 한 잔을 따르며—",
    ph: "ph-wildwest",
    likes: 654,
    large: false,
  },
  {
    id: "f006",
    author: "수아",
    initial: "S",
    eraLabel: "1980s",
    city: "마이애미",
    date: "1985.06.28",
    title: "네온 사인 아래 롤러스케이트",
    excerpt:
      "오션 드라이브의 파스텔 빌딩들이 해질녘 분홍으로 물들었다. 워크맨에서 신스팝이—",
    ph: "ph-eighties",
    likes: 1876,
    large: false,
  },
] as const;

const HOW = [
  {
    n: "01",
    t: "얼굴을 올린다",
    d: "1~3장의 셀카면 충분합니다. 한 번만 등록하면 끝.",
  },
  {
    n: "02",
    t: "시대와 나라를 고른다",
    d: "지구본을 돌리고 타임라인을 당겨 좌표를 정합니다.",
  },
  {
    n: "03",
    t: '"출발" 버튼을 누른다',
    d: "타임머신이 가동되고, 눈앞에서 사진과 일기가 완성됩니다.",
  },
  {
    n: "04",
    t: "기록이 남는다",
    d: "나의 여행 일지에 차곡차곡. 원하면 세상과 공유합니다.",
  },
];

export default function Home() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="overflow-hidden py-16 md:py-15 md:pb-25">
        <div className="mx-auto grid max-w-300 items-center gap-16 px-8 md:grid-cols-[1.1fr_1fr]">
          {/* Left */}
          <div>
            <div className="mb-5">
              <span className="stamp">
                Since 2026 · Archive of Impossible Days
              </span>
            </div>
            <h1 className="hero-title font-display mb-7 text-[clamp(44px,7vw,92px)] leading-[0.95] font-light tracking-[-0.035em]">
              만약 내가
              <br />
              <em>1925년</em>의<br />
              뉴욕에
              <br />
              있었다면?
            </h1>
            <p className="mb-9 max-w-120 text-[17px] leading-[1.55] opacity-80">
              얼굴 사진 한 장이면, 당신은 어느 시대·어느 나라의 하루를 사진 몇
              장과 일기로 되돌려 받습니다.
            </p>
            <div className="mb-11 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="bg-ink text-paper font-display inline-flex items-center gap-2 rounded-full px-7 py-4 text-[15px] font-medium tracking-[-0.01em] whitespace-nowrap shadow-[0_2px_0_rgba(0,0,0,.1),0_10px_30px_-10px_rgba(0,0,0,.4)] transition-transform hover:-translate-y-0.5"
              >
                ✦ 타임머신 타러 가기
              </Link>
              <Link
                href="/diaries"
                className="bg-ink/8 hover:bg-ink/14 font-display inline-flex items-center gap-2 rounded-full px-7 py-4 text-[15px] font-medium tracking-[-0.01em] whitespace-nowrap transition-all hover:-translate-y-0.5"
              >
                공개 여행기 보기 →
              </Link>
            </div>
            <div className="border-ink/12 flex flex-wrap gap-9 border-t pt-5">
              {[
                { v: "12,482", l: "발행된 여행기" },
                { v: "89", l: "시대 · 나라" },
                { v: "Google 로그인", l: "1분 안에 시작" },
              ].map(({ v, l }) => (
                <div key={l} className="flex flex-col gap-0.5">
                  <strong className="font-display text-[22px] font-medium tracking-[-0.02em]">
                    {v}
                  </strong>
                  <span className="font-mono text-[10px] tracking-widest uppercase opacity-55">
                    {l}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Ticket */}
          {/* TODO: 스와이핑 기능 추가 */}
          <div className="relative flex justify-center">
            <div className="bg-paper text-ink ticket-notch relative w-full max-w-105 -rotate-3 rounded-md shadow-[0_20px_50px_-20px_rgba(0,0,0,.5),0_4px_12px_rgba(0,0,0,.15)]">
              {/* Top bar */}
              <div className="border-ink-3 flex items-center gap-3.5 border-b border-dashed px-5.5 py-4">
                <div className="flex flex-1 items-center gap-2.5">
                  {/* <div className="brand-mark w-6.5 h-6.5" /> */}
                  <div>
                    <div className="font-display text-sm font-medium">
                      TIMELEAP
                    </div>
                    <div className="font-mono text-[9px] tracking-[.15em] opacity-60">
                      BOARDING PASS
                    </div>
                  </div>
                </div>
                <div className="flex-1" />
                <div className="font-mono text-[10px] tracking-[.15em] opacity-55">
                  NO. 00412
                </div>
              </div>

              {/* Body */}
              <div className="p-5.5">
                {/* FROM → TO */}
                <div className="flex items-end justify-between gap-3.5">
                  <div>
                    <div className="mb-1 font-mono text-[9px] tracking-[.15em] uppercase opacity-55">
                      FROM
                    </div>
                    <div className="font-display flex flex-col text-[28px] leading-none font-medium tracking-tight">
                      2026
                      <span className="text-ember-2 mt-0.5 font-mono text-[10px] font-medium tracking-[.12em]">
                        SEOUL
                      </span>
                    </div>
                  </div>
                  <div className="text-ember pb-1 text-2xl">→</div>
                  <div>
                    <div className="mb-1 font-mono text-[9px] tracking-[.15em] uppercase opacity-55">
                      TO
                    </div>
                    <div className="font-display flex flex-col text-[28px] leading-none font-medium tracking-tight">
                      1925
                      <span className="text-ember-2 mt-0.5 font-mono text-[10px] font-medium tracking-[.12em]">
                        NEW YORK
                      </span>
                    </div>
                  </div>
                </div>

                {/* Photo strip */}
                <div className="ph-ticket relative my-4 aspect-2/1 overflow-hidden rounded-sm" />

                {/* Passenger info */}
                <div className="flex justify-between gap-5">
                  {[
                    ["PASSENGER", "JIMIN · P"],
                    ["ERA", "ROARING · 20s"],
                    ["GATE", "04"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="mb-1 font-mono text-[9px] tracking-[.15em] uppercase opacity-55">
                        {label}
                      </div>
                      <div className="font-display text-sm font-medium">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Barcode */}
              <div className="border-ink-3 border-t border-dashed px-5.5 pt-3 pb-4">
                <div className="barcode-bg h-5 rounded-sm opacity-75" />
              </div>
            </div>

            {/* Floating stamps */}
            <div className="pointer-events-none absolute top-0 -right-2 rotate-12">
              <span className="stamp">DEPARTED</span>
            </div>
            <div className="pointer-events-none absolute bottom-5 -left-2 -rotate-[8deg]">
              <span className="stamp stamp-sage">ARRIVED · 1925</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20">
        <div className="mx-auto max-w-300 px-6">
          <div className="mb-10 font-mono text-[11px] tracking-[.15em] uppercase opacity-55">
            HOW IT WORKS
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW.map(({ n, t, d }) => (
              <div
                key={n}
                className="border-ink/15 bg-ink/3 hover:bg-ink/5 cursor-default rounded-xl border p-7 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="mb-4 font-mono text-[11px] tracking-[.15em] opacity-45">
                  {n}
                </div>
                <div className="font-display mb-2 text-[20px] font-medium tracking-[-0.01em]">
                  {t}
                </div>
                <div className="text-sm leading-normal opacity-70">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gallery Peek ── */}
      <section className="py-20">
        <div className="mx-auto max-w-300 px-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="mb-2.5 font-mono text-[11px] tracking-[.15em] uppercase opacity-55">
                PUBLIC ARCHIVE
              </div>
              <h2 className="font-display m-0 text-[clamp(32px,4vw,52px)] leading-[1.05] font-normal tracking-[-0.02em]">
                다른 사람들의 불가능한 하루
              </h2>
            </div>
            <Link
              href="/diaries"
              className="bg-ink/8 hover:bg-ink/14 rounded-full px-3 py-1.5 font-mono text-xs tracking-[.06em] whitespace-nowrap uppercase transition-colors"
            >
              전체 보기 →
            </Link>
          </div>

          <div className="grid auto-rows-auto grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEED.map((f, i) => (
              <Link
                key={f.id}
                href={`/diaries/${f.id}`}
                className={[
                  "group bg-ink/4 border-ink/12 overflow-hidden rounded-[10px] border",
                  "flex flex-col transition-all duration-300",
                  "hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-15px_rgba(0,0,0,.4)]",
                  i === 0 ? "lg:col-span-2 lg:row-span-2" : "",
                ].join(" ")}
              >
                {/* Photo area */}
                <div
                  className={`relative overflow-hidden ${i === 0 ? "aspect-16/11" : "aspect-4/3"}`}
                >
                  <div className={`absolute inset-0 ${f.ph}`} />
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
                  <div className="absolute right-0 bottom-0 left-0 p-4 text-[#fdf6e3]">
                    <div className="font-mono text-[10px] tracking-widest opacity-70">
                      {f.date}
                    </div>
                    <div
                      className={`font-display mt-0.5 flex items-center gap-1.5 font-medium ${i === 0 ? "text-[15px]" : "text-sm"}`}
                    >
                      📍 {f.city}
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div className="flex flex-1 flex-col gap-2.5 p-5">
                  <span className="bg-ember/15 text-ember-2 self-start rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[.08em] uppercase">
                    {f.eraLabel}
                  </span>
                  <p
                    className={`font-display m-0 leading-tight font-medium tracking-[-0.01em] ${i === 0 ? "text-[26px]" : "text-[19px]"}`}
                  >
                    {f.title}
                  </p>
                  <p
                    className={`m-0 text-sm leading-[1.55] opacity-70 ${i === 0 ? "line-clamp-3" : "line-clamp-2"}`}
                  >
                    {f.excerpt}
                  </p>
                  <div className="border-ink/10 mt-auto flex items-center justify-between border-t pt-2.5 font-mono text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className="from-ember to-coral font-display text-paper grid h-6 w-6 shrink-0 place-items-center rounded-full bg-linear-to-br text-xs font-semibold">
                        {f.initial}
                      </div>
                      <span>{f.author}</span>
                    </div>
                    <span className="opacity-70">
                      ♡ {f.likes.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Era Strip ── */}
      <section className="py-20">
        <div className="mx-auto max-w-300 px-6">
          <div className="mb-2.5 font-mono text-[11px] tracking-[.15em] uppercase opacity-55">
            DESTINATIONS
          </div>
          <h2 className="font-display mb-11 text-[clamp(32px,4vw,52px)] leading-[1.05] font-normal tracking-[-0.02em]">
            어느 시대로 떠나 볼까요
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {ERAS.map((e) => (
              <Link
                key={e.id}
                href="/login"
                className="border-ink/14 bg-ink/3 hover:bg-ember/8 hover:border-ember/30 rounded-xl border p-5 text-left transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="mb-2.5 text-[26px]">{e.emoji}</div>
                <div className="mb-0.5 font-mono text-[11px] tracking-[.12em] opacity-60">
                  {e.label}
                </div>
                <div className="font-display mb-1.5 text-[19px] font-medium tracking-[-0.01em]">
                  {e.title}
                </div>
                <div className="text-xs leading-[1.4] opacity-70">
                  {e.blurb}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="py-20 pb-16">
        <div className="mx-auto flex max-w-300 flex-col items-center gap-6 px-6 text-center">
          <h2 className="font-display m-0 text-[clamp(32px,4.5vw,56px)] font-normal tracking-[-0.02em] italic">
            당신의 첫 여행이 기다립니다.
          </h2>
          <Link
            href="/login"
            className="bg-ink text-paper font-display inline-flex items-center gap-2 rounded-full px-7 py-4 text-[15px] font-medium tracking-[-0.01em] whitespace-nowrap shadow-[0_2px_0_rgba(0,0,0,.1),0_10px_30px_-10px_rgba(0,0,0,.4)] transition-transform hover:-translate-y-0.5"
          >
            ✦ 무료로 시작하기
          </Link>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 font-mono text-[11px] opacity-50">
            <span>© 2026 Timeleap</span>
            <span>·</span>
            <a href="#" className="underline underline-offset-[3px]">
              이용약관
            </a>
            <span>·</span>
            <a href="#" className="underline underline-offset-[3px]">
              개인정보처리방침
            </a>
            <span>·</span>
            <a href="#" className="underline underline-offset-[3px]">
              문의
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
