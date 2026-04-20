/* Timeleap — shared UI components (vanilla JS / SVG) */

/* ---- Procedural SVG placeholder photo ---- */
function placeholderPhoto(palette, seed = 1, kind) {
  const [c1, c2, c3] = palette;
  const s = seed;
  const kinds = ['horizon', 'portrait', 'window', 'citylights', 'interior'];
  const k = kind || kinds[s % kinds.length];
  const id = s + '_' + Math.random().toString(36).slice(2, 6);

  let inner = '';
  if (k === 'horizon') {
    inner = `
      <rect width="400" height="500" fill="url(#sky-${id})"/>
      <circle cx="${120 + (s*47%200)}" cy="${180 + (s*31%80)}" r="90" fill="url(#sun-${id})" opacity="0.9"/>
      <rect y="360" width="400" height="140" fill="${c1}" opacity="0.5"/>
      <path d="M0,390 L${60+s*7%40},360 L${120+s*13%40},380 L${200+s*11%60},340 L${280+s*17%40},370 L400,350 L400,500 L0,500 Z" fill="${c1}" opacity="0.85"/>
      <circle cx="180" cy="405" r="4" fill="${c1}"/>
      <rect x="178" y="407" width="4" height="14" fill="${c1}"/>`;
  } else if (k === 'portrait') {
    inner = `
      <rect width="400" height="500" fill="${c1}"/>
      <rect x="0" y="0" width="400" height="500" fill="url(#grain-${id})"/>
      <circle cx="200" cy="210" r="110" fill="${c2}" opacity="0.35"/>
      <circle cx="200" cy="205" r="70" fill="${c3}" opacity="0.5"/>
      <ellipse cx="200" cy="320" rx="130" ry="180" fill="${c2}" opacity="0.3"/>
      <rect x="70" y="460" width="260" height="4" fill="${c3}" opacity="0.6"/>`;
  } else if (k === 'window') {
    inner = `
      <rect width="400" height="500" fill="${c1}"/>
      <rect x="40" y="40" width="320" height="420" fill="${c2}" opacity="0.2"/>
      <rect x="60" y="60" width="130" height="180" fill="${c3}" opacity="0.5"/>
      <rect x="210" y="60" width="130" height="180" fill="${c3}" opacity="0.35"/>
      <rect x="60" y="260" width="130" height="180" fill="${c3}" opacity="0.4"/>
      <rect x="210" y="260" width="130" height="180" fill="${c3}" opacity="0.6"/>
      <line x1="200" y1="40" x2="200" y2="460" stroke="${c1}" stroke-width="3"/>
      <line x1="40" y1="250" x2="360" y2="250" stroke="${c1}" stroke-width="3"/>`;
  } else if (k === 'citylights') {
    const bars = Array.from({length: 14}, (_, i) =>
      `<rect x="${i*30+(s%10)}" y="${200+((i*37+s*11)%80)}" width="22" height="${120+((i*23+s*7)%80)}" fill="${c1}" stroke="${c2}" stroke-width="1" opacity="0.85"/>`
    ).join('');
    const wins = Array.from({length: 28}, (_, i) =>
      `<rect x="${i*14+4}" y="${240+((i*31+s)%60)}" width="3" height="4" fill="${c3}"/>`
    ).join('');
    inner = `
      <rect width="400" height="500" fill="${c1}"/>
      <rect y="280" width="400" height="60" fill="${c1}" opacity="0.6"/>
      ${bars}${wins}
      <path d="M0,220 L40,220 L50,180 L80,180 L90,210 L140,210 L160,160 L200,160 L215,200 L260,200 L275,170 L320,170 L335,210 L400,210 L400,500 L0,500 Z" fill="rgba(0,0,0,0.3)"/>`;
  } else {
    inner = `
      <rect width="400" height="500" fill="${c1}"/>
      <rect x="30" y="50" width="340" height="200" fill="${c2}" opacity="0.4"/>
      <rect x="30" y="280" width="160" height="180" fill="${c3}" opacity="0.35"/>
      <rect x="210" y="280" width="160" height="180" fill="${c2}" opacity="0.5"/>
      <circle cx="200" cy="150" r="40" fill="${c3}" opacity="0.7"/>`;
  }

  return `<div class="placeholder" style="background:${c1}">
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%">
      <defs>
        <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="70%" stop-color="${c2}" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="${c3}" stop-opacity="0.9"/>
        </linearGradient>
        <radialGradient id="sun-${id}">
          <stop offset="0%" stop-color="${c3}"/>
          <stop offset="60%" stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
        </radialGradient>
        <pattern id="grain-${id}" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r=".4" fill="rgba(0,0,0,0.15)"/>
        </pattern>
      </defs>
      ${inner}
    </svg>
  </div>`;
}

/* ---- Icons (inline SVG) ---- */
const ICONS = {
  sparkle: `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5z"/></svg>`,
  'arrow-right': `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>`,
  'arrow-left': `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 8H3M7 4L3 8l4 4"/></svg>`,
  heart: `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 13.5S2 9.5 2 5.5A3 3 0 0 1 8 4a3 3 0 0 1 6 1.5C14 9.5 8 13.5 8 13.5z"/></svg>`,
  heartFilled: `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor"><path d="M8 13.5S2 9.5 2 5.5A3 3 0 0 1 8 4a3 3 0 0 1 6 1.5C14 9.5 8 13.5 8 13.5z"/></svg>`,
  share: `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="3" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="12" cy="13" r="1.5"/><path d="M5.5 7L10.5 4M5.5 9l5 3"/></svg>`,
  check: `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l3.5 3.5L13 5"/></svg>`,
  x: `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>`,
  upload: `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10V3M5 6l3-3 3 3"/><path d="M3 12h10"/></svg>`,
  settings: `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"/></svg>`,
  book: `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 2h7a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a2 2 0 0 1 0-4h7"/></svg>`,
  camera: `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5h2l1.5-2h5L12 5h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><circle cx="8" cy="9" r="2"/></svg>`,
  compass: `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M8 4l1.5 3.5L8 12l-1.5-4.5z"/></svg>`,
  eye: `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>`,
  google: `<svg width="1em" height="1em" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/></svg>`,
  dice: `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="12" height="12" rx="2"/><circle cx="5.5" cy="5.5" r=".8" fill="currentColor"/><circle cx="10.5" cy="5.5" r=".8" fill="currentColor"/><circle cx="5.5" cy="10.5" r=".8" fill="currentColor"/><circle cx="10.5" cy="10.5" r=".8" fill="currentColor"/><circle cx="8" cy="8" r=".8" fill="currentColor"/></svg>`,
};

function icon(name, size = 16) {
  const svg = ICONS[name] || '';
  return `<span class="icon" style="font-size:${size}px;display:inline-flex;align-items:center">${svg}</span>`;
}

/* ---- Feed card HTML ---- */
function feedCard(feed, large = false) {
  const era = ERAS.find(e => e.id === feed.era) || {};
  const country = COUNTRIES.find(c => c.code === feed.country) || {};
  const photo = feed.photos[0] || {};
  const seed = (feed.id.charCodeAt(3) || 1);
  return `
  <article class="feed-card${large ? ' feed-card-large' : ''}" onclick="Router.go('detail',{id:'${feed.id}'})">
    <div class="feed-card-photo">
      ${placeholderPhoto(photo.palette || ['#2a1d3b','#c9944a','#f4b860'], seed, large ? 'citylights' : undefined)}
      <div class="feed-card-overlay">
        <div class="feed-card-date">${feed.date}</div>
        <div class="feed-card-place"><span>${country.flag || ''}</span> ${country.name || ''} · ${feed.city || ''}</div>
      </div>
    </div>
    <div class="feed-card-body">
      <div class="feed-card-chip"><span>${era.emoji || ''}</span> ${era.title || ''}</div>
      <h3 class="feed-card-title">${feed.title}</h3>
      <p class="feed-card-excerpt">${feed.excerpt}</p>
      <div class="feed-card-meta">
        <div class="feed-card-author">
          <div class="feed-avatar">${feed.authorInitial || feed.author.slice(0,1)}</div>
          <span>${feed.author}</span>
        </div>
        <div class="feed-card-likes">${icon('heart',14)} ${feed.likes.toLocaleString()}</div>
      </div>
    </div>
  </article>`;
}

/* ---- Navigation bar HTML ---- */
function renderNav(activePage) {
  const profile = State.getProfile();
  const isAuthed = profile.hasFace;
  const theme = document.querySelector('.app') ? document.querySelector('.app').dataset.theme : 'paper';
  return `
  <nav class="nav">
    <div class="nav-inner">
      <button class="brand" onclick="Router.go(${isAuthed ? "'profile'" : "'landing'"})">
        <div class="brand-mark"></div>
        <div>
          <div>Timeleap</div>
          <small>Archive of Impossible Days</small>
        </div>
      </button>
      <div class="nav-links">
        <button class="nav-link${activePage==='explore'?' active':''}" onclick="Router.go('explore')">공개 갤러리</button>
        ${isAuthed ? `
        <button class="nav-link${activePage==='timemachine'?' active':''}" onclick="Router.go('timemachine')">타임머신</button>
        <button class="nav-link${activePage==='profile'?' active':''}" onclick="Router.go('profile')">내 기록</button>
        ` : ''}
        <button class="nav-link" data-always="1" onclick="Router.go('landing')">랜딩</button>
        ${isAuthed ? `
        <button class="nav-link" data-always="1" onclick="doLogout()">로그아웃</button>
        <button class="nav-avatar" data-always="1" onclick="Router.go('profile')">${(profile.name||'나').slice(0,1)}</button>
        ` : `
        <button class="nav-cta" data-always="1" onclick="Router.go('login')">시작하기</button>
        `}
      </div>
    </div>
  </nav>`;
}

function doLogout() {
  if (!confirm('로그아웃 하시겠어요? 저장된 여행기는 유지됩니다.')) return;
  State.logout();
  Router.go('landing');
}
