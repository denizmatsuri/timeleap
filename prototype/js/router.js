/* Timeleap — page navigation */

const Router = {
  /* Navigate to a page, optionally passing params via sessionStorage */
  go(page, params) {
    if (params) sessionStorage.setItem('tl_params', JSON.stringify(params));
    const base = location.pathname.includes('/pages/') ? '../' : '';
    const map = {
      landing:     base + 'index.html',
      login:       base + 'pages/login.html',
      onboarding:  base + 'pages/onboarding.html',
      timemachine: base + 'pages/timemachine.html',
      departure:   base + 'pages/departure.html',
      result:      base + 'pages/result.html',
      profile:     base + 'pages/profile.html',
      explore:     base + 'pages/explore.html',
      detail:      base + 'pages/detail.html',
      settings:    base + 'pages/settings.html',
    };
    location.href = map[page] || map.landing;
  },
  getParams() {
    try { return JSON.parse(sessionStorage.getItem('tl_params') || 'null') || {}; }
    catch { return {}; }
  },
  back() {
    history.back();
  },
};
