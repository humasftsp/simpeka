/**
 * API — komunikasi dengan backend Google Apps Script (REST/JSON).
 * Semua permintaan bertoken lewat POST dengan Content-Type text/plain
 * (menghindari CORS preflight yang tidak didukung GAS).
 */
const API = (() => {
  const KEY = 'simpeka_token';
  const url = () => (window.SIMPEKA_CONFIG || {}).GAS_URL || '';

  function token() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setToken(t) {
    try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch (e) { /* mode privat */ }
  }

  function makeErr(message, code, extra) {
    const e = new Error(message);
    e.code = code || 'ERROR';
    e.extra = extra || null;
    return e;
  }

  async function parse(res) {
    try { return await res.json(); } catch (e) {
      throw makeErr('Respons server tidak valid. Pastikan GAS_URL benar dan Web App di-deploy dengan akses "Anyone".', 'BADRESPONSE');
    }
  }

  /** GET untuk data publik (mis. Client ID). */
  async function getPublic(action) {
    let res;
    try { res = await fetch(url() + '?action=' + encodeURIComponent(action)); }
    catch (e) { throw makeErr('Tidak dapat terhubung ke server. Periksa koneksi internet dan GAS_URL.', 'NETWORK'); }
    const j = await parse(res);
    if (!j.success) throw makeErr(j.message, j.code, j.extra);
    return j.data;
  }

  /** POST bertoken: { action, token, data } */
  async function call(action, data) {
    let res;
    try {
      res = await fetch(url(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, token: token(), data: data || {} }),
        redirect: 'follow'
      });
    } catch (e) {
      throw makeErr('Tidak dapat terhubung ke server. Periksa koneksi internet.', 'NETWORK');
    }
    const j = await parse(res);
    if (!j.success) {
      const err = makeErr(j.message, j.code, j.extra);
      if (['AUTH', 'DENIED', 'MUST_CHANGE'].indexOf(err.code) >= 0 && action !== 'login' && API.onAuthError) API.onAuthError(err);
      throw err;
    }
    return j.data;
  }

  return { call: call, getPublic: getPublic, token: token, setToken: setToken, onAuthError: null };
})();
