/* Timeleap — localStorage state helpers */

const State = {
  getProfile() {
    try { return JSON.parse(localStorage.getItem('tl_profile') || 'null') || { name: '', gender: '', ageRange: '', hasFace: false }; }
    catch { return { name: '', gender: '', ageRange: '', hasFace: false }; }
  },
  setProfile(p) {
    localStorage.setItem('tl_profile', JSON.stringify(p));
  },
  getDiaries() {
    try { return JSON.parse(localStorage.getItem('tl_diaries') || '[]'); }
    catch { return []; }
  },
  addDiary(d) {
    const list = this.getDiaries();
    list.unshift(d);
    localStorage.setItem('tl_diaries', JSON.stringify(list));
  },
  getPending() {
    try { return JSON.parse(sessionStorage.getItem('tl_pending') || 'null'); }
    catch { return null; }
  },
  setPending(data) {
    sessionStorage.setItem('tl_pending', JSON.stringify(data));
  },
  clearPending() {
    sessionStorage.removeItem('tl_pending');
  },
  logout() {
    this.setProfile({ name: '', gender: '', ageRange: '', hasFace: false });
  },
};
