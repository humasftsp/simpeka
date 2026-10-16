/**
 * UI — helper tampilan: ikon, tanggal, status, toast, drawer, modal,
 * penampil berkas, unggah berkas, dan grafik sederhana (SVG/CSS).
 */
const UI = (() => {
  // ---------- dasar ----------
  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const icon = (n, s, cls) => `<svg class="ic ${cls || ''}" width="${s || 18}" height="${s || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(window.ICONS || {})[n] || ''}</svg>`;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms || 200); }; };

  // ---------- tanggal (semua dihitung dalam WIB) ----------
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  function todayStr() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  function pd(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 5)) : null;
  }
  function addMonths(d, n) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate(), 5)); }
  function tgl(s, panjang) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    if (!m) return '-';
    return (+m[3]) + ' ' + (panjang ? BULAN : BLN)[+m[2] - 1] + ' ' + m[1];
  }
  function sisaHari(akhir) {
    const a = pd(akhir), t = pd(todayStr());
    return a ? Math.round((a - t) / 864e5) : null;
  }
  function sisaTeks(akhir) {
    const h = sisaHari(akhir);
    if (h === null) return '-';
    if (h < 0) return 'Lewat ' + (-h) + ' hari';
    if (h === 0) return 'Berakhir hari ini';
    if (h >= 365) return h + ' hari lagi (±' + (h / 365).toFixed(1).replace('.', ',') + ' thn)';
    if (h >= 60) return h + ' hari lagi (±' + Math.round(h / 30.4) + ' bln)';
    return h + ' hari lagi';
  }

  /** PRD 4.3 — sama persis dengan logika server. */
  function statusMasa(akhir, ambang) {
    const a = pd(akhir);
    if (!a) return '';
    const t = pd(todayStr());
    const am = ambang || { akan: 6, segera: 3 };
    if (a < t) return 'Kadaluarsa';
    if (a < addMonths(t, am.segera)) return 'Segera Berakhir';
    if (a <= addMonths(t, am.akan)) return 'Akan Berakhir';
    return 'Aktif';
  }

  const STATUS_META = {
    'Aktif': { cls: 'st-aktif', icon: 'circle-check', color: 'var(--st-aktif)' },
    'Akan Berakhir': { cls: 'st-akan', icon: 'clock', color: 'var(--st-akan)' },
    'Segera Berakhir': { cls: 'st-segera', icon: 'triangle-alert', color: 'var(--st-segera)' },
    'Kadaluarsa': { cls: 'st-kadaluarsa', icon: 'circle-x', color: 'var(--st-kadaluarsa)' },
    'Rencana': { cls: 'pr-rencana', icon: 'clock', color: 'var(--pr-rencana)' },
    'Terlaksana': { cls: 'pr-terlaksana', icon: 'circle-check', color: 'var(--pr-terlaksana)' },
    'Batal': { cls: 'pr-batal', icon: 'circle-x', color: 'var(--pr-batal)' }
  };
  function badge(status, extra) {
    const m = STATUS_META[status] || { cls: '', icon: 'info' };
    return `<span class="badge ${m.cls}">${icon(m.icon, 13)}${esc(status || '-')}${extra ? ' • ' + esc(extra) : ''}</span>`;
  }
  const color = (status) => (STATUS_META[status] || {}).color || 'var(--muted)';
  /** warna teks berkontras cukup (mis. kuning gelap untuk teks di atas putih) */
  const tcolor = (status) => STATUS_META[status] ? color(status).replace(')', '-t)') : 'var(--muted)';

  function fmtSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
  }

  // ---------- toast ----------
  function toast(msg, type) {
    const root = $('#toast-root');
    const el = document.createElement('div');
    const ic = type === 'error' ? 'circle-x' : type === 'warn' ? 'triangle-alert' : 'circle-check';
    el.className = 'toast ' + (type || 'ok');
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = icon(ic, 18) + '<span>' + esc(msg) + '</span>';
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, type === 'error' ? 6000 : 3500);
  }

  // ---------- loading overlay ----------
  function loading(on, text) {
    let el = $('#loading-overlay');
    if (!on) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'loading-overlay';
      el.className = 'loading-overlay';
      document.body.appendChild(el);
    }
    el.innerHTML = '<div class="loading-box"><div class="spinner"></div><span>' + esc(text || 'Memproses…') + '</span></div>';
  }

  // ---------- drawer (panel geser kanan) ----------
  let drawerClose = null;
  function openDrawer(o) {
    const root = $('#drawer-root');
    root.innerHTML = `<div class="scrim" data-close></div>
      <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="dw-title">
        <header class="drawer-head">
          <div class="drawer-ic">${icon(o.icon || 'file', 20)}</div>
          <div class="drawer-titles"><h2 id="dw-title">${esc(o.title)}</h2>${o.subtitle ? '<p>' + esc(o.subtitle) + '</p>' : ''}</div>
          <button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button>
        </header>
        <div class="drawer-body">${o.body || ''}</div>
        ${o.footer ? '<footer class="drawer-foot">' + o.footer + '</footer>' : ''}
      </aside>`;
    root.classList.add('open');
    document.body.classList.add('no-scroll');
    $$('[data-close]', root).forEach((b) => { b.onclick = closeDrawer; });
    drawerClose = o.onClose || null;
    const el = $('.drawer', root);
    if (o.onMount) o.onMount(el);
    return el;
  }
  function closeDrawer() {
    const root = $('#drawer-root');
    root.classList.remove('open');
    root.innerHTML = '';
    if (!$('#modal-root').classList.contains('open')) document.body.classList.remove('no-scroll');
    if (drawerClose) { const f = drawerClose; drawerClose = null; f(); }
  }

  // ---------- modal ----------
  function openModal(html, cls) {
    const root = $('#modal-root');
    root.innerHTML = `<div class="scrim" data-mclose></div><div class="modal ${cls || ''}" role="dialog" aria-modal="true">${html}</div>`;
    root.classList.add('open');
    document.body.classList.add('no-scroll');
    $$('[data-mclose]', root).forEach((b) => { b.onclick = closeModal; });
    return $('.modal', root);
  }
  function closeModal() {
    const root = $('#modal-root');
    root.classList.remove('open');
    root.innerHTML = '';
    if (!$('#drawer-root').classList.contains('open')) document.body.classList.remove('no-scroll');
    if (root._onClose) { const f = root._onClose; root._onClose = null; f(); }
  }

  function confirmDlg(o) {
    return new Promise((resolve) => {
      const m = openModal(`
        <div class="modal-body center">
          <div class="modal-ic ${o.danger ? 'danger' : ''}">${icon(o.danger ? 'trash-2' : 'info', 24)}</div>
          <h3>${esc(o.title)}</h3><p>${o.message || ''}</p>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" data-no>Batal</button>
          <button class="btn ${o.danger ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(o.okText || 'Ya, lanjutkan')}</button>
        </div>`, 'modal-sm');
      let done = false;
      const fin = (v) => { if (done) return; done = true; closeModal(); resolve(v); };
      $('[data-yes]', m).onclick = () => fin(true);
      $('[data-no]', m).onclick = () => fin(false);
      $('#modal-root')._onClose = () => { if (!done) { done = true; resolve(false); } };
      setTimeout(() => $('[data-yes]', m).focus(), 30);
    });
  }

  // ---------- berkas ----------
  function b64ToBlob(b64, mime) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  function downloadB64(f) {
    const url = URL.createObjectURL(b64ToBlob(f.base64, f.mimeType));
    const a = document.createElement('a');
    a.href = url; a.download = f.nama || 'berkas';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  /** Tampilkan berkas (PDF/JPG) dalam jendela pratinjau, dengan tombol unduh. */
  function viewFile(f) {
    const url = URL.createObjectURL(b64ToBlob(f.base64, f.mimeType));
    const isImg = /^image\//.test(f.mimeType);
    const m = openModal(`
      <div class="viewer-head">
        <div class="viewer-name">${icon(isImg ? 'file' : 'file-text', 18)}<span>${esc(f.nama)}</span></div>
        <div class="viewer-acts">
          <a class="btn btn-outline btn-sm" href="${url}" download="${esc(f.nama)}">${icon('download', 16)} Unduh</a>
          <a class="btn btn-ghost btn-sm" href="${url}" target="_blank" rel="noopener">Buka di tab baru</a>
          <button class="icon-btn" data-mclose aria-label="Tutup">${icon('x')}</button>
        </div>
      </div>
      <div class="viewer-body">${isImg ? `<img src="${url}" alt="${esc(f.nama)}">` : `<iframe src="${url}" title="${esc(f.nama)}"></iframe>`}</div>`, 'modal-viewer');
    $$('[data-mclose]', m).forEach((b) => { b.onclick = closeModal; });
    $('#modal-root')._onClose = () => setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = () => reject(new Error('Gagal membaca berkas.'));
      r.readAsDataURL(file);
    });
  }

  /** Kolom unggah berkas (PDF/JPG) dengan seret-lepas. */
  function fileField(id, opt) {
    const o = opt || {};
    return `<div class="field">
      <label>${esc(o.label || 'Unggah berkas')}</label>
      <label class="drop" for="${id}" data-drop="${id}">
        <span class="drop-ic">${icon('cloud-upload', 22)}</span>
        <span class="drop-t">Klik untuk memilih berkas atau seret ke sini</span>
        <span class="drop-s">PDF atau JPG • maks. ${o.maksMB || 10} MB${o.namaOtomatis ? ' • disimpan sebagai <code>' + esc(o.namaOtomatis) + '</code>' : ''}</span>
      </label>
      <input type="file" id="${id}" accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg" hidden>
      <div class="drop-file" id="${id}-info" hidden></div>
      ${o.ada ? `<p class="hint">${icon('check', 14)} Berkas sudah tersimpan. Unggah berkas baru hanya bila ingin menggantinya.</p>` : ''}
      <p class="err" id="${id}-err" hidden></p>
    </div>`;
  }
  function bindFileField(root, id, maksMB) {
    const input = $('#' + id, root), info = $('#' + id + '-info', root), err = $('#' + id + '-err', root), drop = $('[data-drop="' + id + '"]', root);
    let file = null;
    const set = (f) => {
      err.hidden = true;
      if (!f) { file = null; info.hidden = true; drop.hidden = false; input.value = ''; return; }
      const okType = /pdf|jpe?g/i.test(f.type) || /\.(pdf|jpe?g)$/i.test(f.name);
      if (!okType) { err.textContent = 'Format harus PDF atau JPG.'; err.hidden = false; input.value = ''; return; }
      if (f.size > (maksMB || 10) * 1048576) { err.textContent = 'Ukuran ' + fmtSize(f.size) + ' melebihi batas ' + (maksMB || 10) + ' MB. Kompres PDF terlebih dahulu.'; err.hidden = false; input.value = ''; return; }
      file = f;
      info.innerHTML = `${icon(/pdf/i.test(f.type) ? 'file-text' : 'file', 18)}<span class="df-name">${esc(f.name)}</span><span class="df-size">${fmtSize(f.size)}</span><button type="button" class="icon-btn sm" aria-label="Hapus berkas">${icon('x', 16)}</button>`;
      info.hidden = false; drop.hidden = true;
      $('button', info).onclick = () => set(null);
    };
    input.onchange = () => set(input.files[0]);
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => { if (e.dataTransfer.files[0]) set(e.dataTransfer.files[0]); });
    return () => file;
  }

  // ---------- validasi form ----------
  function fieldError(root, name, msg) {
    const inp = root.querySelector('[name="' + name + '"]');
    if (!inp) return;
    const f = inp.closest('.field');
    f.classList.toggle('invalid', !!msg);
    let e = f.querySelector('.err');
    if (!e) { e = document.createElement('p'); e.className = 'err'; f.appendChild(e); }
    e.textContent = msg || '';
    e.hidden = !msg;
  }
  function formData(root) {
    const o = {};
    $$('[name]', root).forEach((el) => {
      if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else if (el.type === 'checkbox') o[el.name] = el.checked;
      else o[el.name] = el.value.trim();
    });
    return o;
  }

  // ---------- grafik ----------
  function donut(items, sub) {
    const total = items.reduce((a, b) => a + b.value, 0);
    const r = 60, C = 2 * Math.PI * r;
    let off = 0;
    const shown = items.filter((i) => i.value > 0);
    const gap = shown.length > 1 ? 2 : 0;
    const segs = shown.map((i) => {
      const len = (i.value / total) * C;
      const s = `<circle r="${r}" cx="80" cy="80" fill="none" stroke="${i.color}" stroke-width="20" stroke-dasharray="${Math.max(len - gap, 0.5)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 80 80)"><title>${esc(i.label)}: ${i.value}</title></circle>`;
      off += len;
      return s;
    }).join('');
    return `<div class="donut">
      <svg viewBox="0 0 160 160" role="img" aria-label="${esc(sub)}: ${items.map((i) => i.label + ' ' + i.value).join(', ')}">
        <circle r="${r}" cx="80" cy="80" fill="none" stroke="var(--track)" stroke-width="20"/>${segs}
        <text x="80" y="80" text-anchor="middle" class="donut-num">${total}</text>
        <text x="80" y="99" text-anchor="middle" class="donut-sub">${esc(sub)}</text>
      </svg>
      <ul class="legend">${items.map((i) => `<li><span class="dot" style="background:${i.color}"></span><span class="lg-l">${esc(i.label)}</span><b>${i.value}</b><span class="lg-p">${total ? Math.round(i.value / total * 100) : 0}%</span></li>`).join('')}</ul>
    </div>`;
  }

  /** Grafik batang berkelompok. items: [{label, values:[]}], series: [{name,color}] */
  function bars(items, series) {
    const max = Math.max(1, ...items.map((i) => Math.max(...i.values)));
    const legend = series.length > 1 ? `<div class="bars-legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
    return `${legend}<div class="bars" role="img" aria-label="${items.map((i) => i.label + ': ' + i.values.join('/')).join(', ')}">
      ${items.map((it) => `<div class="bcol">
        <div class="bstack">${it.values.map((v, k) => `<div class="bar" style="height:${(v / max) * 100}%;background:${series[k].color}" title="${esc(it.label)} • ${esc(series[k].name)}: ${v}">${v ? '<span>' + v + '</span>' : ''}</div>`).join('')}</div>
        <div class="blabel">${esc(it.label)}</div></div>`).join('')}
    </div>`;
  }

  function progress(pct, col) {
    return `<div class="progress"><i style="width:${Math.max(0, Math.min(100, pct))}%;background:${col || 'var(--primary)'}"></i></div>`;
  }

  function empty(title, text, actionHtml) {
    return `<div class="empty batik-soft"><div class="empty-ic">${icon('inbox', 26)}</div><h3>${esc(title)}</h3><p>${esc(text || '')}</p>${actionHtml || ''}</div>`;
  }

  function initials(nama) {
    return String(nama || '?').replace(/^(Dr|Ir|Prof)\.?\s*/gi, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  }

  // ---------- tema ----------
  const THEME_KEY = 'simpeka_theme';
  const sysDark = () => !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  function storedTheme() { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } }
  /** Pilihan tersimpan per perangkat; bila belum ada, ikuti pengaturan sistem. */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t || storedTheme() || (sysDark() ? 'dark' : 'light'));
  }
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSys = () => { if (!storedTheme()) applyTheme(); };
    mq.addEventListener ? mq.addEventListener('change', onSys) : mq.addListener(onSys);
  }
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || (sysDark() ? 'dark' : 'light');
  }
  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* abaikan */ }
    applyTheme(next);
    return next;
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('#modal-root').classList.contains('open')) closeModal();
    else if ($('#drawer-root').classList.contains('open')) closeDrawer();
  });

  return {
    esc, icon, $, $$, debounce,
    BULAN, BLN, todayStr, pd, addMonths, tgl, sisaHari, sisaTeks, statusMasa, badge, color, tcolor, fmtSize,
    toast, loading, openDrawer, closeDrawer, openModal, closeModal, confirmDlg,
    viewFile, downloadB64, fileToBase64, fileField, bindFileField, fieldError, formData,
    donut, bars, progress, empty, initials,
    applyTheme, currentTheme, toggleTheme
  };
})();
