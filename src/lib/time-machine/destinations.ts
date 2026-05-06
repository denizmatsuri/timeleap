export type EraTone =
  | "azure"
  | "champagne"
  | "chrome"
  | "cobalt"
  | "disco"
  | "electric"
  | "ember"
  | "fiesta"
  | "fog"
  | "indigo"
  | "mod"
  | "noir"
  | "pastel"
  | "punk"
  | "sepia";

type DestinationScene = {
  id: string;
  label: string;
  title: string;
  note: string;
};

export type DestinationEra = {
  id: string;
  year: string;
  title: string;
  city: string;
  headline: string;
  blurb: string;
  mood: string;
  soundtrack: string;
  wardrobe: string;
  texture: string;
  motifs: readonly string[];
  sceneCards: readonly DestinationScene[];
  tone: EraTone;
};

export type DestinationCountry = {
  code: "FR" | "GB" | "JP" | "KR" | "MX" | "US";
  flag: string;
  name: string;
  englishName: string;
  catchline: string;
  summary: string;
  whyItFits: string;
  yearRange: string;
  eras: readonly DestinationEra[];
};

export type TimeMachineRecommendation = {
  code: string;
  flag: string;
  name: string;
  strength: string;
  headline: string;
  recommendedEras: string;
  reason: string;
};

export const DESTINATION_COUNTRIES = [
  {
    code: "KR",
    flag: "🇰🇷",
    name: "대한민국",
    englishName: "Korea",
    catchline: "근대화의 속도감이 가장 선명하게 보이는 타임라인",
    summary:
      "서울 한 도시 안에서도 전차 시대, 명동 청춘 문화, 88 올림픽의 낙관이 완전히 다른 온도로 갈립니다.",
    whyItFits:
      "로컬 사용자가 바로 감정이입할 수 있고, 의상·간판·도시 밀도가 시대별로 크게 달라져 결과물 차이를 설계하기 좋습니다.",
    yearRange: "1936 → 1988",
    eras: [
      {
        id: "kr-gyeongseong",
        year: "1936",
        title: "경성 모던 라이트",
        city: "경성",
        headline: "전차와 재즈 다방 사이의 모던 보이 무드",
        blurb:
          "모자와 코트, 경성역 플랫폼의 증기, 미츠코시 백화점 쇼윈도가 같이 보이는 도시형 시네마 톤입니다.",
        mood: "Sepia Modern",
        soundtrack: "재즈 소편성 + 축음기 노이즈",
        wardrobe: "롱코트, 베레모, 가죽 구두",
        texture: "신문지, 황동, 비 오는 석재 거리",
        motifs: ["전차 선로", "백화점 쇼윈도", "재즈 다방", "경성역 플랫폼"],
        sceneCards: [
          {
            id: "arrival",
            label: "ARRIVAL",
            title: "경성역 새벽 플랫폼",
            note: "증기와 트렁크, 톤 다운된 황동 조명",
          },
          {
            id: "street",
            label: "STREET",
            title: "본정통 쇼윈도 산책",
            note: "모던 보이 실루엣과 세로 간판",
          },
          {
            id: "night",
            label: "NIGHT",
            title: "재즈 다방의 저녁",
            note: "짙은 우드 톤과 작은 무대 조명",
          },
        ],
        tone: "sepia",
      },
      {
        id: "kr-sewoon",
        year: "1969",
        title: "세운상가 일렉트릭",
        city: "서울",
        headline: "형광등 아래서 미래를 납땜하던 전자상가의 밤",
        blurb:
          "세운상가 특유의 전자 부품 상점, 네온 간판, 얇은 철제 프레임이 섞여 서울의 기술 낙관을 보여주는 좌표입니다.",
        mood: "Analog Electric",
        soundtrack: "오르간 팝 + 라디오 튜닝 노이즈",
        wardrobe: "짧은 재킷, 와이드 팬츠, 얇은 셔츠",
        texture: "형광등, 알루미늄 셔터, 전자 부품 상자",
        motifs: ["세운상가 간판", "전자 부품 진열대", "옥상 난간", "형광등 골목"],
        sceneCards: [
          {
            id: "arcade",
            label: "ARCADE",
            title: "전자상가 복도",
            note: "촘촘한 간판과 차가운 형광빛",
          },
          {
            id: "roof",
            label: "ROOF",
            title: "옥상에서 본 서울",
            note: "콘크리트와 전선이 만든 직선적 풍경",
          },
          {
            id: "bench",
            label: "WORK",
            title: "납땜 작업대의 순간",
            note: "금속 광택과 작은 불꽃이 튀는 장면",
          },
        ],
        tone: "electric",
      },
      {
        id: "kr-myeongdong",
        year: "1978",
        title: "청춘 명동",
        city: "서울",
        headline: "극장 간판과 다방 유리문이 반짝이는 저녁",
        blurb:
          "명동 거리에 모이는 청춘 문화, 필름 카메라 색 번짐, 카세트테이프와 재킷 스타일이 중심이 되는 좌표입니다.",
        mood: "Amber Youth",
        soundtrack: "포크 록 + 카세트 히스",
        wardrobe: "재킷, 와이드 칼라 셔츠, 데님",
        texture: "네온 간판, 카세트 플라스틱, 필름 번짐",
        motifs: ["명동 극장 간판", "다방 유리문", "카세트 플레이어", "번화가 횡단보도"],
        sceneCards: [
          {
            id: "marquee",
            label: "POSTER",
            title: "극장 앞 대형 간판",
            note: "수작업 타이포와 붉은 조명",
          },
          {
            id: "cafe",
            label: "CAFE",
            title: "다방 창가 테이블",
            note: "유리컵, 설탕통, 오후의 금빛 그림자",
          },
          {
            id: "walk",
            label: "WALK",
            title: "명동 밤거리 산책",
            note: "카메라 플래시와 습한 공기",
          },
        ],
        tone: "ember",
      },
      {
        id: "kr-olympic",
        year: "1988",
        title: "올림픽 서울",
        city: "서울",
        headline: "컬러 블록 스포츠웨어와 캠코더의 낙관",
        blurb:
          "잠실 경기장, 새 단장한 도시 인프라, 강한 원색 그래픽이 합쳐지는 밝고 직선적인 무드입니다.",
        mood: "Electric Optimism",
        soundtrack: "신스팝 + 응원가 브라스",
        wardrobe: "트랙수트, 볼캡, 컬러 블록 윈드브레이커",
        texture: "캠코더 화질, 플라스틱 배너, 깨끗한 콘크리트",
        motifs: ["잠실 스타디움", "오륜 그래픽", "휴대용 캠코더", "강변도로 야경"],
        sceneCards: [
          {
            id: "stadium",
            label: "ARENA",
            title: "잠실 경기장 입구",
            note: "깃발과 컬러 블록 유니폼",
          },
          {
            id: "bridge",
            label: "CITY",
            title: "한강변 드라이브",
            note: "선명한 푸른색과 도시 조명",
          },
          {
            id: "video",
            label: "MEMORY",
            title: "캠코더 프레임 속 웃음",
            note: "아날로그 비디오 노이즈를 남기는 장면",
          },
        ],
        tone: "electric",
      },
    ],
  },
  {
    code: "JP",
    flag: "🇯🇵",
    name: "일본",
    englishName: "Japan",
    catchline: "전통과 미래가 한 화면 안에서 충돌하는 국가",
    summary:
      "다이쇼 로망의 감성, 64년 도쿄의 미래주의, 버블기의 유리와 금속이 한 나라 안에서 완전히 다른 스타일을 만듭니다.",
    whyItFits:
      "건축, 타이포, 대중문화 기호가 분명해서 시대를 바꿨을 때 이미지 차이가 즉각 보입니다.",
    yearRange: "1915 → 1987",
    eras: [
      {
        id: "jp-taisho",
        year: "1915",
        title: "다이쇼 로망",
        city: "도쿄",
        headline: "기모노와 레더 부츠가 공존하는 낭만적 과도기",
        blurb:
          "종이 랜턴, 목조 카페, 서양식 복식이 한 프레임에 섞이는 시대라 인물 스타일링 차별화에 강합니다.",
        mood: "Indigo Romance",
        soundtrack: "피아노 살롱 + 빗소리",
        wardrobe: "하카마, 레이스 블라우스, 레더 부츠",
        texture: "와시지, 인디고 직물, 따뜻한 목재",
        motifs: ["종이 랜턴", "전차 정류장", "목조 카페", "우산 실루엣"],
        sceneCards: [
          {
            id: "tram",
            label: "TRAM",
            title: "비 오는 전차 정류장",
            note: "인디고 우산과 젖은 선로",
          },
          {
            id: "cafe",
            label: "SALON",
            title: "목조 카페 창가",
            note: "잡지와 잉크병, 부드러운 램프 빛",
          },
          {
            id: "night",
            label: "LANE",
            title: "종이 랜턴 골목",
            note: "따뜻한 주황빛과 깊은 남색 대비",
          },
        ],
        tone: "indigo",
      },
      {
        id: "jp-tokyo64",
        year: "1964",
        title: "신칸센 도쿄",
        city: "도쿄",
        headline: "올림픽 그래픽과 크롬 가전이 밀어붙이는 미래감",
        blurb:
          "도쿄 올림픽을 기점으로 생긴 깔끔한 그래픽 시스템과 기술 낙관을 전면으로 쓴 미드센추리 도시 무드입니다.",
        mood: "Electric Precision",
        soundtrack: "브라스 팝 + 역 안내 방송",
        wardrobe: "미니멀 재킷, 단정한 셔츠, 컬러 스카프",
        texture: "크롬, 인쇄 포스터, 신형 철도 차창",
        motifs: ["신칸센 플랫폼", "올림픽 포스터", "긴자 쇼윈도", "실버 가전"],
        sceneCards: [
          {
            id: "platform",
            label: "RAIL",
            title: "신칸센 출발 직전",
            note: "클린한 실버 라인과 그래픽 사인",
          },
          {
            id: "ginza",
            label: "CITY",
            title: "긴자 쇼윈도",
            note: "반사 유리와 선명한 안내 타이포",
          },
          {
            id: "poster",
            label: "GRAPHIC",
            title: "포스터가 깔린 거리",
            note: "레드와 아이보리 대비가 선명한 장면",
          },
        ],
        tone: "electric",
      },
      {
        id: "jp-bubble",
        year: "1987",
        title: "버블 도쿄",
        city: "도쿄",
        headline: "유리 타워와 샴페인 골드가 빛나는 밤",
        blurb:
          "금속성 빌딩, 검은 세단, 고급 라운지 조명처럼 반사면이 많은 시대라 화려한 프리미엄 연출에 유리합니다.",
        mood: "Chrome Luxury",
        soundtrack: "시티팝 + 라운지 신스",
        wardrobe: "더블 재킷, 실크 셔츠, 골드 액세서리",
        texture: "거울 유리, 샴페인 골드, 네온 반사",
        motifs: ["마루노우치 타워", "라운지 바", "검은 세단", "시티팝 네온"],
        sceneCards: [
          {
            id: "tower",
            label: "SKYLINE",
            title: "유리 타워 로비",
            note: "빛 반사가 겹치는 메탈릭 공간",
          },
          {
            id: "lounge",
            label: "LOUNGE",
            title: "샴페인 바의 저녁",
            note: "금속 펜던트 조명과 진한 그림자",
          },
          {
            id: "drive",
            label: "RIDE",
            title: "도쿄 야간 드라이브",
            note: "유리창에 네온이 길게 흐르는 장면",
          },
        ],
        tone: "chrome",
      },
    ],
  },
  {
    code: "FR",
    flag: "🇫🇷",
    name: "프랑스",
    englishName: "France",
    catchline: "예술성과 라이프스타일 변화가 아주 선명한 국가",
    summary:
      "벨 에포크의 화려함, 몽파르나스의 아틀리에, 리비에라의 햇빛이 모두 다른 방식으로 인물 사진을 빛나게 합니다.",
    whyItFits:
      "거리, 카페, 해변처럼 상징적 장면이 많고 의상 스타일 차이가 크기 때문에 시대별 브랜드 경험을 만들기 쉽습니다.",
    yearRange: "1898 → 1966",
    eras: [
      {
        id: "fr-belle-epoque",
        year: "1898",
        title: "벨 에포크 파리",
        city: "파리",
        headline: "가스등과 아르누보 포스터가 반짝이는 밤",
        blurb:
          "세느강 안개, 황금빛 카페, 포스터 아트가 강해서 고전적인 우아함을 가장 아름답게 보여주는 좌표입니다.",
        mood: "Champagne Glow",
        soundtrack: "왈츠 + 카페 소음",
        wardrobe: "하이넥 드레스, 장갑, 보터 햇",
        texture: "황동 난간, 포스터 종이, 샴페인 기포",
        motifs: ["아르누보 포스터", "세느강 가스등", "카페 테라스", "오페라 장식"],
        sceneCards: [
          {
            id: "bridge",
            label: "RIVER",
            title: "세느강 다리 위",
            note: "안개와 가스등이 겹치는 고전적 실루엣",
          },
          {
            id: "cafe",
            label: "CAFE",
            title: "샴페인 빛 카페",
            note: "황동 난간과 크림색 벽면",
          },
          {
            id: "poster",
            label: "POSTER",
            title: "아르누보 포스터 골목",
            note: "타이포와 곡선 장식이 중심인 프레임",
          },
        ],
        tone: "champagne",
      },
      {
        id: "fr-riviera",
        year: "1966",
        title: "리비에라 포스트카드",
        city: "니스",
        headline: "햇빛, 스트라이프 파라솔, 오픈카가 만드는 필름 컬러",
        blurb:
          "파리와 완전히 다른 프랑스의 얼굴을 보여줄 수 있는 좌표로, 휴양지 특유의 선명한 블루와 화이트가 강점입니다.",
        mood: "Azure Leisure",
        soundtrack: "예예 팝 + 해변 웨이브",
        wardrobe: "선글라스, 스카프, 스트라이프 셔츠",
        texture: "바닷물 반짝임, 크롬 차체, 리넨",
        motifs: ["푸른 해안선", "스트라이프 파라솔", "오픈카", "화이트 호텔 발코니"],
        sceneCards: [
          {
            id: "coast",
            label: "SEA",
            title: "코트다쥐르 드라이브",
            note: "선명한 하늘과 차체 반사광",
          },
          {
            id: "balcony",
            label: "HOTEL",
            title: "화이트 발코니 브런치",
            note: "밝은 리넨과 그림자 대비가 강한 장면",
          },
          {
            id: "beach",
            label: "POSTCARD",
            title: "해변 파라솔 아래",
            note: "파란 바다와 크림색 햇빛 톤",
          },
        ],
        tone: "azure",
      },
    ],
  },
  {
    code: "MX",
    flag: "🇲🇽",
    name: "멕시코",
    englishName: "Mexico",
    catchline: "색채 대비와 거리 에너지가 강해서 결과가 즉시 살아나는 국가",
    summary:
      "벽화의 코발트, 골든 에이지의 금빛, 86년 축제의 초록과 붉은색처럼 국가 내부에서도 색감 변화 폭이 큽니다.",
    whyItFits:
      "의상과 도시 오브제가 풍부하고, 밝은 햇빛 아래에서 찍은 듯한 결과가 많아 이미지 생성 결과물이 강하게 나옵니다.",
    yearRange: "1938 → 1986",
    eras: [
      {
        id: "mx-coyoacan",
        year: "1938",
        title: "코요아칸 컬러 스튜디오",
        city: "멕시코시티",
        headline: "벽화와 선인장, 강한 원색이 인물을 감싸는 장면",
        blurb:
          "예술가적 감성과 식물, 붉은 벽, 청색 타일이 강해서 한 컷만 봐도 국가 특성이 바로 읽히는 좌표입니다.",
        mood: "Cobalt Studio",
        soundtrack: "트리오 기타 + 낮은 실내 공명",
        wardrobe: "리본 블라우스, 자수 셔츠, 두꺼운 직물",
        texture: "코발트 타일, 선인장 가시, 석회 벽",
        motifs: ["선인장 정원", "벽화 스튜디오", "코발트 타일", "붉은 벽면"],
        sceneCards: [
          {
            id: "garden",
            label: "GARDEN",
            title: "선인장 안뜰",
            note: "짙은 녹색과 강한 그림자",
          },
          {
            id: "atelier",
            label: "ATELIER",
            title: "벽화가 그려진 작업실",
            note: "코발트와 코랄이 부딪히는 프레임",
          },
          {
            id: "market",
            label: "MARKET",
            title: "색채가 넘치는 골목",
            note: "천막 아래 원색과 식물 텍스처",
          },
        ],
        tone: "cobalt",
      },
      {
        id: "mx-golden-age",
        year: "1957",
        title: "골든 에이지 CDMX",
        city: "멕시코시티",
        headline: "아르데코 극장과 볼레로의 금빛 밤",
        blurb:
          "영화 황금기의 도시적 세련됨을 살릴 수 있는 시대라 정제된 인물 컷과 밤거리 결과를 동시에 설계하기 좋습니다.",
        mood: "Marigold Cinema",
        soundtrack: "볼레로 + 극장 로비 잔향",
        wardrobe: "슬림 수트, 새틴 드레스, 광택 구두",
        texture: "금색 극장 조명, 벨벳 커튼, 고급 타일",
        motifs: ["아르데코 극장", "볼레로 바", "택시 헤드라이트", "야간 플라자"],
        sceneCards: [
          {
            id: "theater",
            label: "THEATER",
            title: "아르데코 극장 입구",
            note: "금빛 마키와 짙은 밤공기",
          },
          {
            id: "plaza",
            label: "PLAZA",
            title: "플라자 심야 산책",
            note: "대리석과 가로등이 만드는 깊은 원근감",
          },
          {
            id: "cab",
            label: "CAB",
            title: "노란 헤드라이트의 택시",
            note: "영화 포스터 같은 도시 컷",
          },
        ],
        tone: "ember",
      },
      {
        id: "mx-acapulco",
        year: "1974",
        title: "아카풀코 선셋",
        city: "아카풀코",
        headline: "호텔 수영장과 태평양 노을이 부딪히는 휴양지의 밤",
        blurb:
          "멕시코시티와 다른 해안 도시의 얼굴을 보여줄 수 있는 좌표로, 물빛 반사와 리조트 조명이 강하게 남습니다.",
        mood: "Pacific Leisure",
        soundtrack: "라틴 재즈 + 풀사이드 웨이브",
        wardrobe: "오픈 칼라 셔츠, 선글라스, 리넨 드레스",
        texture: "수영장 타일, 크롬 난간, 젖은 콘크리트",
        motifs: ["호텔 수영장", "태평양 노을", "풀사이드 바", "야자수 실루엣"],
        sceneCards: [
          {
            id: "pool",
            label: "POOL",
            title: "수영장 가장자리",
            note: "청록 수면과 주황 노을의 대비",
          },
          {
            id: "balcony",
            label: "VIEW",
            title: "발코니에서 본 해안선",
            note: "먼 바다와 호텔 조명이 겹치는 프레임",
          },
          {
            id: "bar",
            label: "BAR",
            title: "풀사이드 칵테일 바",
            note: "유리잔 반사와 느린 밤공기",
          },
        ],
        tone: "azure",
      },
      {
        id: "mx-fiesta",
        year: "1986",
        title: "스트리트 페스타",
        city: "멕시코시티",
        headline: "광장 전체가 초록, 빨강, 함성으로 진동하는 날",
        blurb:
          "도시 전체가 축제처럼 느껴지는 좌표라 단체 장면, 광장 장면, 응원 소품 등 역동적인 비주얼을 만들기 좋습니다.",
        mood: "Fiesta Energy",
        soundtrack: "브라스 밴드 + 군중 함성",
        wardrobe: "스포츠 재킷, 깃발 스카프, 캡",
        texture: "현수막 천, 광장 석재, 뜨거운 햇빛",
        motifs: ["대형 깃발", "플라자 축제", "스트리트 포스터", "초록-빨강 응원 색"],
        sceneCards: [
          {
            id: "plaza",
            label: "PLAZA",
            title: "깃발로 가득한 광장",
            note: "원색 대비가 크게 터지는 장면",
          },
          {
            id: "street",
            label: "STREET",
            title: "포스터가 붙은 골목",
            note: "활기와 움직임이 앞서는 구도",
          },
          {
            id: "cheer",
            label: "CHEER",
            title: "함성이 퍼지는 밤거리",
            note: "강한 조명과 군중 리듬을 담는 컷",
          },
        ],
        tone: "fiesta",
      },
    ],
  },
  {
    code: "US",
    flag: "🇺🇸",
    name: "미국",
    englishName: "United States",
    catchline: "장르성이 가장 강해서 결과물의 차이를 극적으로 보여주는 국가",
    summary:
      "재즈, 드라이브인, 디스코처럼 시대별 아이콘이 너무 명확해서 사용자가 고른 시대가 결과 화면에서 즉시 읽힙니다.",
    whyItFits:
      "서비스의 첫 시그니처 국가로 적합하고, 타임머신 장르 문법과도 잘 맞아 랜딩과 결과 페이지 연계가 쉽습니다.",
    yearRange: "1925 → 1977",
    eras: [
      {
        id: "us-harlem",
        year: "1925",
        title: "할렘 미드나잇",
        city: "뉴욕",
        headline: "브라운스톤과 색소폰, 황동 조명이 흔들리는 밤",
        blurb:
          "타임머신 콘셉트와 가장 직관적으로 연결되는 시대 중 하나로, 패션과 재즈 클럽 무드가 분명합니다.",
        mood: "Brass Noir",
        soundtrack: "빅밴드 재즈 + 클럽 웅성임",
        wardrobe: "핀스트라이프 수트, 진주 장식, 플래퍼 드레스",
        texture: "황동, 벨벳, 비 오는 보도블록",
        motifs: ["브라운스톤", "색소폰", "비밀 클럽", "금주법 문패"],
        sceneCards: [
          {
            id: "club",
            label: "JAZZ",
            title: "비밀 클럽 입구",
            note: "짙은 자두빛 그림자와 황동 조명",
          },
          {
            id: "street",
            label: "CITY",
            title: "빗속 브라운스톤 거리",
            note: "젖은 보도블록 위 반사광",
          },
          {
            id: "dance",
            label: "DANCE",
            title: "댄스 플로어의 골드 톤",
            note: "벨벳과 금속 광택이 겹치는 프레임",
          },
        ],
        tone: "champagne",
      },
      {
        id: "us-drive-in",
        year: "1956",
        title: "캘리포니아 드라이브인",
        city: "로스앤젤레스",
        headline: "핑크 캐딜락과 밀크셰이크가 있는 파스텔의 오후",
        blurb:
          "선명한 하늘, 오픈카, 드라이브인 극장 같은 아이콘이 뚜렷해서 밝고 대중적인 타임머신 체험에 적합합니다.",
        mood: "Pastel Sun",
        soundtrack: "로큰롤 + 라디오 DJ",
        wardrobe: "폴카 도트 원피스, 스카프, 볼링 셔츠",
        texture: "파스텔 자동차 도장, 크롬, 햇빛 번짐",
        motifs: ["핑크 캐딜락", "드라이브인 극장", "주크박스", "해변 산책로"],
        sceneCards: [
          {
            id: "car",
            label: "RIDE",
            title: "말리부 해안 드라이브",
            note: "파스텔 바디와 강한 태양광",
          },
          {
            id: "diner",
            label: "DINER",
            title: "밀크셰이크 바 카운터",
            note: "민트와 핑크가 나뉘는 쾌활한 실내",
          },
          {
            id: "screen",
            label: "MOVIE",
            title: "드라이브인 저녁",
            note: "노을과 자동차 실루엣이 만나는 컷",
          },
        ],
        tone: "pastel",
      },
      {
        id: "us-disco",
        year: "1977",
        title: "디스코 맨해튼",
        city: "뉴욕",
        headline: "미러볼과 실버 플래시가 쏟아지는 자정",
        blurb:
          "화려한 밤, 반사면, 실버와 마젠타가 강한 시대라 프로토타입의 타임머신 감성을 가장 극대화할 수 있습니다.",
        mood: "Disco Chrome",
        soundtrack: "디스코 비트 + 클럽 환호",
        wardrobe: "메탈릭 셔츠, 와이드 칼라, 하이힐",
        texture: "미러볼, 크롬 난간, 플래시 광원",
        motifs: ["미러볼", "루프탑 파티", "클럽 입구 벨벳 로프", "실버 플래시"],
        sceneCards: [
          {
            id: "club",
            label: "CLUB",
            title: "벨벳 로프 뒤의 입장 순간",
            note: "실버와 마젠타 조명이 터지는 장면",
          },
          {
            id: "dance",
            label: "FLOOR",
            title: "미러볼 아래 댄스 플로어",
            note: "금속 반사광과 인물 윤곽이 강한 프레임",
          },
          {
            id: "rooftop",
            label: "ROOFTOP",
            title: "자정의 루프탑 바",
            note: "도시 야경과 보랏빛 조명이 교차",
          },
        ],
        tone: "disco",
      },
    ],
  },
  {
    code: "GB",
    flag: "🇬🇧",
    name: "영국",
    englishName: "United Kingdom",
    catchline: "안개, 모드, 펑크처럼 장르가 칼같이 나뉘는 국가",
    summary:
      "빅토리아 시대의 가스등, 60년대 카나비 스트리트, 70년대 캠든 펑크가 한 도시에서도 완전히 다른 언어를 씁니다.",
    whyItFits:
      "의상 코드가 강하고 거리 타이포가 특징적이라 결과물이 서브컬처 중심으로 선명하게 차별화됩니다.",
    yearRange: "1888 → 1979",
    eras: [
      {
        id: "gb-victorian",
        year: "1888",
        title: "빅토리아 런던 포그",
        city: "런던",
        headline: "안개와 가스등, 마차 바퀴 소리가 겹치는 새벽",
        blurb:
          "짙은 회색과 황동빛의 간극이 커서 고딕에 가까운 분위기와 고전적 초상 사진을 함께 가져갈 수 있습니다.",
        mood: "Fog & Brass",
        soundtrack: "낮게 울리는 종소리 + 마차 소리",
        wardrobe: "롱코트, 베스트, 보닛",
        texture: "안개, 젖은 석재, 가스등 유리",
        motifs: ["가스등", "빅벤 실루엣", "마차 바퀴", "안개 낀 골목"],
        sceneCards: [
          {
            id: "lane",
            label: "FOG",
            title: "안개 낀 골목 입구",
            note: "흐린 회색과 황동 조명의 대비",
          },
          {
            id: "bridge",
            label: "RIVER",
            title: "템스강 다리 위",
            note: "실루엣이 중심이 되는 고전적 컷",
          },
          {
            id: "cab",
            label: "CARRIAGE",
            title: "마차가 지나간 직후",
            note: "젖은 바닥에 빛이 길게 남는 장면",
          },
        ],
        tone: "fog",
      },
      {
        id: "gb-punk",
        year: "1979",
        title: "캠든 펑크",
        city: "런던",
        headline: "가죽 재킷과 찢긴 포스터가 만든 거친 에너지",
        blurb:
          "기존의 우아한 영국 이미지와 완전히 다른 방향이라, 국가 내부 대비를 보여주기 가장 좋은 시대 중 하나입니다.",
        mood: "Raw Punk",
        soundtrack: "펑크 기타 + 지하철 진동",
        wardrobe: "가죽 재킷, 체인, 체크 팬츠",
        texture: "낙서 벽, 찢긴 종이, 금속 체인",
        motifs: ["펑크 포스터", "캠든 간판", "가죽 재킷", "지하철 플랫폼"],
        sceneCards: [
          {
            id: "poster",
            label: "POSTER",
            title: "찢긴 공연 포스터 벽",
            note: "종이 질감과 거친 그림자 중심",
          },
          {
            id: "platform",
            label: "TUBE",
            title: "지하철 플랫폼 대기",
            note: "차가운 형광등과 검은 실루엣",
          },
          {
            id: "alley",
            label: "ALLEY",
            title: "캠든 뒷골목",
            note: "붉은 네온과 거친 금속성 텍스처",
          },
        ],
        tone: "punk",
      },
    ],
  },
] as const satisfies readonly DestinationCountry[];

export const TIME_MACHINE_RECOMMENDATIONS = [
  {
    code: "KR",
    flag: "🇰🇷",
    name: "대한민국",
    strength: "즉시 시그니처화 추천",
    headline: "로컬 감정 이입과 시대 변화가 모두 강함",
    recommendedEras: "1930s 경성 · 1970s 명동 · 1988 서울",
    reason:
      "서비스 정체성과 가장 잘 맞고, 사용자 입장에서 결과 해석이 쉬우며 지역 확장도 서울 중심으로 시작하기 좋습니다.",
  },
  {
    code: "JP",
    flag: "🇯🇵",
    name: "일본",
    strength: "즉시 추가 추천",
    headline: "전통과 미래가 공존해서 국가 내 대비가 큼",
    recommendedEras: "1910s 다이쇼 · 1964 도쿄 · 1980s 버블",
    reason:
      "패션, 간판, 건축이 시대마다 또렷하게 갈리고 아시아권 사용자가 직관적으로 이해하기 좋은 레퍼런스가 많습니다.",
  },
  {
    code: "FR",
    flag: "🇫🇷",
    name: "프랑스",
    strength: "즉시 추가 추천",
    headline: "예술가적 감성과 휴양지 감성을 모두 가져갈 수 있음",
    recommendedEras: "1890s 벨 에포크 · 1960s 리비에라",
    reason:
      "같은 나라 안에서도 우아함, 보헤미안, 햇빛 가득한 포스트카드 무드를 나눠 보여주기 좋습니다.",
  },
  {
    code: "MX",
    flag: "🇲🇽",
    name: "멕시코",
    strength: "강력 추천",
    headline: "원색과 광장의 에너지가 이미지 결과를 바로 살림",
    recommendedEras: "1930s 코요아칸 · 1950s CDMX · 1986 축제 거리",
    reason:
      "색채 밀도가 높고 거리 풍경이 분명해서 AI 이미지 결과 차이가 가장 눈에 잘 보이는 국가 중 하나입니다.",
  },
  {
    code: "GB",
    flag: "🇬🇧",
    name: "영국",
    strength: "강력 추천",
    headline: "고전, 모드, 펑크로 서브컬처 스펙트럼이 넓음",
    recommendedEras: "1880s 런던 포그 · 1970s 캠든",
    reason:
      "같은 런던이라도 안개, 팝 컬러, 거친 펑크가 완전히 다른 세계처럼 보이기 때문에 타임머신 설계에 적합합니다.",
  },
  {
    code: "US",
    flag: "🇺🇸",
    name: "미국",
    strength: "기본 축 추천",
    headline: "재즈, 드라이브인, 디스코처럼 장르 인지가 매우 쉬움",
    recommendedEras: "1920s 뉴욕 · 1950s 캘리포니아 · 1970s 맨해튼",
    reason:
      "프로토타입의 감성을 가장 자연스럽게 이어갈 수 있고, 첫 공개 데모에서 사용자가 바로 이해할 가능성이 높습니다.",
  },
  {
    code: "CU",
    flag: "🇨🇺",
    name: "쿠바",
    strength: "2차 확장 추천",
    headline: "클래식카, 해안선, 포스터 아트가 강한 국가",
    recommendedEras: "1950s 아바나 · 1960s 포스터 스튜디오 · 1990s 말레콘",
    reason:
      "색채와 자동차, 해안선이 강해 이미지적으로 매우 매력적이며 라틴권 확장 카드로 좋습니다.",
  },
  {
    code: "TR",
    flag: "🇹🇷",
    name: "튀르키예",
    strength: "2차 확장 추천",
    headline: "보스포루스와 시장, 호텔 로비 무드가 독특함",
    recommendedEras: "1930s 이스탄불 · 1950s 보스포루스 · 1970s 아나톨리안 록",
    reason:
      "유럽과 아시아 경계의 도시 미감이 강하고, 건축과 실내 장식의 개성이 분명해 신선한 확장 포인트가 됩니다.",
  },
] as const satisfies readonly TimeMachineRecommendation[];
