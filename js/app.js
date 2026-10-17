/**
 * APP — login (email + kata sandi), kerangka aplikasi, navigasi berbasis
 * peran, dan router hash (#/dashboard, #/mou, #/moa, ...).
 */
const APP = (() => {
  const { esc, icon, $ } = UI;

  const NAV = [
    { id: 'dashboard', label: 'Dashboard', short: 'Beranda', icon: 'layout-dashboard', allow: () => true },
    { id: 'mitra', label: 'Master Mitra', short: 'Mitra', icon: 'building-2', allow: () => DATA.can('ks', 'r') },
    { id: 'mou', label: 'MoU', short: 'MoU', icon: 'handshake', allow: () => DATA.can('ks', 'r') },
    { id: 'moa', label: 'MoA', short: 'MoA', icon: 'file-signature', allow: () => DATA.can('ks', 'r') },
    { id: 'ia', label: 'IA (Implementation)', short: 'IA', icon: 'file-check', allow: () => DATA.can('ia', 'r') },
    { id: 'promosi', label: 'Promosi Sekolah', short: 'Promosi', icon: 'megaphone', allow: () => DATA.can('promosi', 'r') },
    { id: 'kalender', label: 'Kalender', short: 'Kalender', icon: 'calendar-days', allow: () => DATA.can('promosi', 'r') || DATA.can('ks', 'r') },
    { id: 'laporan', label: 'Laporan', short: 'Laporan', icon: 'file-text', allow: () => DATA.can('laporan', 'r') },
    { id: 'impor', label: 'Impor Data Excel', short: 'Impor', icon: 'upload', allow: () => DATA.can('impor', 'w') },
    { id: 'pengguna', label: 'Pengguna', short: 'Pengguna', icon: 'users', allow: () => DATA.can('pengguna', 'r') }
  ];
  /** Alamat lama (v1) tetap berfungsi. */
  const ALIAS = { kerjasama: 'mou' };
  const FILTER_KEY = { mitra: 'mitra', mou: 'mou', moa: 'moa', ia: 'ia', promosi: 'promosi', kalender: 'kal' };
  const DEFAULT_F = JSON.parse(JSON.stringify(STATE.f));
  let current = null;
  let shellReady = false;

  const root = () => document.getElementById('app');
  const cfg = () => window.SIMPEKA_CONFIG || {};

  function brandMark() {
    const logo = cfg().LOGO_URL;
    return `<span class="brand-mark">${logo ? `<img src="${esc(logo)}" alt="Logo FTSP Universitas Trisakti">` : icon('landmark', 22)}</span>`;
  }
  const themeIcon = () => icon(UI.currentTheme() === 'dark' ? 'sun' : 'moon', 19);

  // =========================================================================
  // LAYAR AWAL / LOGIN / DITOLAK / KONFIGURASI
  // =========================================================================
  function renderSplash(text) {
    shellReady = false;
    root().innerHTML = `<div class="splash batik">${brandMark()}<div class="splash-t"><b>SIMPEKA</b><span>FTSP Universitas Trisakti</span></div><div class="spinner light"></div><p>${esc(text || 'Memuat data…')}</p></div>`;
  }

  function authLayout(panel) {
    shellReady = false;
    root().innerHTML = `<div class="auth">
      <section class="auth-art batik" aria-hidden="false">
        <div class="auth-brand">${brandMark()}<div><b>SIMPEKA</b><span>FTSP Universitas Trisakti</span></div></div>
        <div class="auth-copy">
          <h1>Kerja sama dan promosi FTSP, terpantau dalam satu tempat.</h1>
          <p>Masa berlaku MoU/MoA dipantau otomatis, pengingat dikirim lewat email sebelum berakhir, dan jadwal promosi sekolah tersusun di kalender.</p>
          <ul class="auth-feats">
            <li>${icon('shield-check', 18)} Status masa berlaku otomatis</li>
            <li>${icon('mail', 18)} Pengingat email sebelum berakhir</li>
            <li>${icon('printer', 18)} Laporan PDF satu klik</li>
          </ul>
        </div>
        <div class="auth-foot">Fakultas Teknik Sipil dan Perencanaan • Universitas Trisakti</div>
      </section>
      <section class="auth-panel">
        <button type="button" class="icon-btn auth-theme" id="auth-theme" aria-label="Ganti mode terang/gelap">${themeIcon()}</button>
        <div class="auth-card">
          <div class="auth-mbrand">${brandMark()}<div><b>SIMPEKA</b><span>FTSP Universitas Trisakti</span></div></div>
          ${panel}
        </div>
        <p class="auth-legal">Sistem Informasi Manajemen Promosi dan Kerja Sama</p>
      </section>
    </div>`;
    $('#auth-theme').onclick = () => { UI.toggleTheme(); $('#auth-theme').innerHTML = themeIcon(); };
  }

  function authMsg(text, type) {
    const el = $('#auth-msg');
    if (!el) return;
    el.innerHTML = text ? `<div class="note ${type === 'error' ? 'err' : type === 'warn' ? 'warn' : ''}">${icon(type === 'error' ? 'circle-x' : type === 'warn' ? 'triangle-alert' : 'info', 16)}<span>${esc(text)}</span></div>` : '';
  }

  const EMAIL_KEY = 'simpeka_email';
  const pwField = (id, name, label, ac, ph) => `<div class="field"><label for="${id}">${label}</label>
    <div class="pw-wrap"><input class="input" type="password" id="${id}" name="${name}" autocomplete="${ac}" placeholder="${ph || ''}" required>
    <button type="button" class="icon-btn sm pw-eye" data-eye="${id}" aria-label="Tampilkan kata sandi">${icon('eye', 18)}</button></div></div>`;
  function bindEyes(root) {
    UI.$$('[data-eye]', root).forEach((b) => {
      b.onclick = () => {
        const inp = document.getElementById(b.dataset.eye);
        const show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        b.innerHTML = icon(show ? 'eye-off' : 'eye', 18);
        b.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
      };
    });
  }

  function renderLogin(message) {
    let last = '';
    try { last = localStorage.getItem(EMAIL_KEY) || ''; } catch (e) { /* abaikan */ }
    authLayout(`
      <h2>Masuk ke SIMPEKA</h2>
      <p class="auth-sub">Gunakan email dan kata sandi yang diberikan Admin Sekretariat FTSP.</p>
      <div id="auth-msg"></div>
      <form id="f-login" class="form" novalidate>
        <div class="field"><label for="lg-email">Email</label>
          <input class="input" type="email" id="lg-email" name="email" autocomplete="username" placeholder="nama@trisakti.ac.id" value="${esc(last)}" required></div>
        ${pwField('lg-pw', 'password', 'Kata sandi', 'current-password')}
        <button type="submit" class="btn btn-primary btn-block btn-lg" id="lg-btn">${icon('lock', 18)} Masuk</button>
      </form>
      <p class="auth-note">${icon('info', 14)} Lupa kata sandi? Hubungi Admin Sekretariat FTSP untuk direset.</p>`);
    if (message) authMsg(message, 'warn');
    const form = $('#f-login');
    bindEyes(form);
    (last ? form.password : form.email).focus();
    form.onsubmit = async (e) => {
      e.preventDefault();
      const email = form.email.value.trim().toLowerCase(), password = form.password.value;
      if (!email || !password) return authMsg('Isi email dan kata sandi.', 'error');
      const btn = $('#lg-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner sm light"></span> Memeriksa…';
      authMsg('');
      try {
        const r = await API.call('login', { email: email, password: password });
        try { localStorage.setItem(EMAIL_KEY, email); } catch (er) { /* abaikan */ }
        API.setToken(r.token);
        if (r.wajibGanti) renderChangePassword(r.user);
        else await boot();
      } catch (err) {
        authMsg(err.message, 'error');
        form.password.value = '';
        form.password.focus();
        btn.disabled = false;
        btn.innerHTML = icon('lock', 18) + ' Masuk';
      }
    };
  }

  /** Aturan kata sandi, ditampilkan sebagai daftar periksa langsung. */
  const RULES = [
    ['len', 'Minimal 8 karakter', (v) => v.length >= 8],
    ['huruf', 'Mengandung huruf', (v) => /[A-Za-z]/.test(v)],
    ['angka', 'Mengandung angka', (v) => /\d/.test(v)]
  ];
  function rulesHtml() {
    return `<ul class="pw-rules" aria-live="polite">${RULES.concat([['sama', 'Konfirmasi sama']]).map(([k, l]) => `<li data-rule="${k}">${icon('check', 14)} ${l}</li>`).join('')}</ul>`;
  }
  function bindRules(form, baruName, konfName) {
    const upd = () => {
      const v = form[baruName].value, k = form[konfName].value;
      let ok = true;
      RULES.forEach(([key, , t]) => { const pass = t(v); ok = ok && pass; form.querySelector('[data-rule="' + key + '"]').classList.toggle('ok', pass); });
      const same = !!v && v === k;
      form.querySelector('[data-rule="sama"]').classList.toggle('ok', same);
      return ok && same;
    };
    form[baruName].addEventListener('input', upd);
    form[konfName].addEventListener('input', upd);
    return upd;
  }

  /** Layar wajib ganti kata sandi sementara (login pertama / setelah direset Admin). */
  function renderChangePassword(user) {
    authLayout(`
      <div class="denied-ic info">${icon('key-round', 28)}</div>
      <h2>Buat kata sandi baru</h2>
      <p class="auth-sub">${user && user.nama ? esc(user.nama) + ', Anda' : 'Anda'} masuk dengan kata sandi sementara. Buat kata sandi pribadi sebelum melanjutkan.</p>
      <div id="auth-msg"></div>
      <form id="f-new" class="form" novalidate>
        ${pwField('np-1', 'baru', 'Kata sandi baru', 'new-password')}
        ${pwField('np-2', 'konfirmasi', 'Ulangi kata sandi baru', 'new-password')}
        ${rulesHtml()}
        <button type="submit" class="btn btn-primary btn-block btn-lg" id="np-btn">${icon('check', 18)} Simpan & lanjutkan</button>
      </form>
      <button type="button" class="link-btn auth-alt" id="np-out">${icon('log-out', 16)} Keluar</button>`);
    const form = $('#f-new');
    bindEyes(form);
    const valid = bindRules(form, 'baru', 'konfirmasi');
    form.baru.focus();
    $('#np-out').onclick = () => { API.call('logout').catch(() => {}); API.setToken(null); renderLogin(); };
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!valid()) return authMsg('Kata sandi belum memenuhi semua syarat di bawah.', 'error');
      const btn = $('#np-btn');
      btn.disabled = true;
      try {
        const r = await API.call('akun.gantiSandi', { baru: form.baru.value });
        API.setToken(r.token);
        UI.toast('Kata sandi baru tersimpan');
        await boot();
      } catch (err) {
        authMsg(err.message, 'error');
        btn.disabled = false;
      }
    };
  }

  /** Ganti kata sandi dari menu akun (perlu kata sandi lama). */
  function changePasswordDrawer() {
    closePop();
    UI.openDrawer({
      title: 'Ganti kata sandi', subtitle: STATE.user.email, icon: 'key-round',
      body: `<form class="form" id="f-pw" novalidate>
        <div id="pw-msg"></div>
        ${pwField('pw-0', 'lama', 'Kata sandi saat ini', 'current-password')}
        ${pwField('pw-1', 'baru', 'Kata sandi baru', 'new-password')}
        ${pwField('pw-2', 'konfirmasi', 'Ulangi kata sandi baru', 'new-password')}
        ${rulesHtml()}
        <div class="note">${icon('info', 16)}<span>Setelah diganti, sesi di perangkat lain otomatis keluar.</span></div>
      </form>`,
      footer: `<button type="button" class="btn btn-outline" data-close-pw>Batal</button><span class="spacer"></span><button type="submit" form="f-pw" class="btn btn-primary">${icon('check', 16)} Simpan kata sandi</button>`,
      onMount(el) {
        const form = UI.$('#f-pw', el);
        bindEyes(el);
        const valid = bindRules(form, 'baru', 'konfirmasi');
        UI.$('[data-close-pw]', el).onclick = UI.closeDrawer;
        const msg = (t) => { UI.$('#pw-msg', el).innerHTML = t ? `<div class="note err">${icon('circle-x', 16)}<span>${esc(t)}</span></div>` : ''; };
        form.onsubmit = async (e) => {
          e.preventDefault();
          if (!form.lama.value) return msg('Isi kata sandi saat ini.');
          if (!valid()) return msg('Kata sandi baru belum memenuhi semua syarat.');
          UI.loading(true, 'Menyimpan kata sandi…');
          try {
            const r = await API.call('akun.gantiSandi', { lama: form.lama.value, baru: form.baru.value });
            API.setToken(r.token);
            UI.closeDrawer();
            UI.toast('Kata sandi berhasil diganti');
          } catch (err) { msg(err.message); }
          finally { UI.loading(false); }
        };
      }
    });
  }

  function renderDenied(email, message) {
    authLayout(`
      <div class="denied-ic">${icon('lock', 28)}</div>
      <h2>Akses ditolak</h2>
      <p class="auth-sub">${esc(message || 'Akun ini tidak memiliki akses ke SIMPEKA.')}</p>
      ${email ? `<div class="denied-email">${icon('mail', 16)} ${esc(email)}</div>` : ''}
      <p class="auth-sub">Hubungi Admin Sekretariat FTSP bila Anda merasa ini keliru.</p>
      <button type="button" class="btn btn-primary btn-block" id="other">${icon('user-round', 16)} Kembali ke halaman masuk</button>`);
    $('#other').onclick = () => renderLogin();
  }

  function renderConfigError(title, detail) {
    authLayout(`
      <div class="denied-ic warn">${icon('triangle-alert', 28)}</div>
      <h2>${esc(title)}</h2>
      <p class="auth-sub">${detail}</p>
      <button type="button" class="btn btn-outline btn-block" onclick="location.reload()">${icon('refresh-cw', 16)} Muat ulang</button>`);
  }

  // =========================================================================
  // BOOT & DATA
  // =========================================================================
  async function loadData() {
    const d = await API.call('bootstrap');
    Object.assign(STATE, {
      user: d.user, perms: d.perms, options: d.options,
      mitra: d.mitra || [], mou: d.mou || [], moa: d.moa || [], ia: d.ia || [], promosi: d.promosi || [], pengguna: d.pengguna || [],
      laporan: null, loadedAt: new Date()
    });
    DATA.derive();
  }

  async function boot() {
    renderSplash('Memuat data SIMPEKA…');
    try {
      await loadData();
      renderShell();
      route();
    } catch (e) {
      if (['AUTH', 'DENIED', 'MUST_CHANGE'].indexOf(e.code) >= 0) return; // sudah ditangani onAuthError
      renderConfigError('Gagal memuat data', esc(e.message) + '<br><br>Bila masalah berlanjut, hubungi Admin.');
    }
  }

  async function refresh(diam) {
    const b = $('#btn-refresh');
    b && b.classList.add('spinning');
    try {
      await loadData();
      renderView(true);
      updateChrome();
      if (diam !== true) UI.toast('Data dimuat ulang');
    } catch (e) {
      if (e.code !== 'AUTH' && e.code !== 'DENIED') UI.toast(e.message, 'error');
    } finally {
      b && b.classList.remove('spinning');
    }
  }

  async function logout() {
    const ok = await UI.confirmDlg({ title: 'Keluar dari SIMPEKA?', message: 'Anda perlu memasukkan email dan kata sandi lagi untuk membuka aplikasi.', okText: 'Keluar' });
    if (!ok) return;
    closePop();
    try { await API.call('logout'); } catch (e) { /* tetap keluar */ }
    API.setToken(null);
    renderLogin();
  }

  // =========================================================================
  // KERANGKA APLIKASI
  // =========================================================================
  function renderShell() {
    const u = STATE.user;
    const items = NAV.filter((n) => n.allow());
    const PRIO = ['dashboard', 'mou', 'moa', 'ia', 'promosi', 'kalender'];
    const utama = items.slice().sort((a, b) => (PRIO.indexOf(a.id) + 1 || 99) - (PRIO.indexOf(b.id) + 1 || 99));
    const bottom = items.length > 5 ? utama.slice(0, 4) : items;
    const more = items.length > 5 ? items.filter((n) => bottom.indexOf(n) < 0) : [];
    root().innerHTML = `
      <a href="#view" class="skip">Langsung ke konten</a>
      <div class="shell">
        <aside class="sidebar">
          <div class="sb-brand">${brandMark()}<div><b>SIMPEKA</b><span>FTSP Univ. Trisakti</span></div></div>
          <div class="sb-section">Menu navigasi</div>
          <nav class="sb-nav" aria-label="Menu utama">${items.map((n) => `<a href="#/${n.id}" class="sb-link" data-nav="${n.id}">${icon(n.icon, 20)}<span>${n.label}</span></a>`).join('')}</nav>
          <div class="sb-bottom" id="sb-alert"></div>
        </aside>
        <div class="main">
          <header class="topbar">
            <div class="tb-left">
              <div class="tb-desk"><b>Fakultas Teknik Sipil dan Perencanaan</b><span>Sistem Informasi Manajemen Promosi & Kerja Sama</span></div>
              <div class="tb-mob">${brandMark()}<div><span>SIMPEKA</span><b id="mob-title">Dashboard</b></div></div>
            </div>
            <div class="tb-right">
              <span class="sync" id="sync"></span>
              <button type="button" class="icon-btn" id="btn-refresh" title="Muat ulang data" aria-label="Muat ulang data">${icon('refresh-cw', 19)}</button>
              <button type="button" class="icon-btn" id="btn-theme" title="Mode terang/gelap" aria-label="Ganti mode terang/gelap">${themeIcon()}</button>
              <button type="button" class="user-chip" id="btn-user" aria-haspopup="menu" aria-expanded="false">
                <span class="uc-text"><b>${esc(u.nama)}</b><span>${esc(DATA.PERAN_LABEL[u.peran])}</span></span>
                <span class="avatar">${esc(UI.initials(u.nama))}</span>
              </button>
            </div>
          </header>
          <main class="content" id="view" tabindex="-1"></main>
          <footer class="foot"><span>FTSP Universitas Trisakti • SIMPEKA</span><span>Data tersimpan di Google Sheets & Google Drive fakultas</span></footer>
        </div>
        <nav class="bottom-nav" aria-label="Menu utama">
          ${bottom.map((n) => `<a href="#/${n.id}" class="bn-item" data-nav="${n.id}">${icon(n.icon, 22)}<span>${n.short}</span></a>`).join('')}
          ${more.length ? `<button type="button" class="bn-item" id="bn-more" data-more="${more.map((m) => m.id).join(',')}">${icon('menu', 22)}<span>Lainnya</span></button>` : ''}
        </nav>
      </div>
      <div class="popover" id="pop" hidden></div>`;

    $('#btn-refresh').onclick = refresh;
    $('#btn-theme').onclick = () => { UI.toggleTheme(); $('#btn-theme').innerHTML = themeIcon(); };
    $('#btn-user').onclick = (e) => { e.stopPropagation(); togglePop(userMenu(), $('#btn-user')); };
    const bm = $('#bn-more');
    if (bm) bm.onclick = (e) => { e.stopPropagation(); togglePop(moreMenu(more), bm, true); };
    shellReady = true;
    updateChrome();
  }

  function userMenu() {
    const u = STATE.user;
    return `<div class="pop-user"><span class="avatar lg">${esc(UI.initials(u.nama))}</span>
      <div><b>${esc(u.nama)}</b><span>${esc(u.email)}</span><span class="chip chip-blue">${esc(DATA.PERAN_LABEL[u.peran])}</span></div></div>
      <button type="button" class="pop-item" data-pop="pw">${icon('key-round', 19)} Ganti kata sandi</button>
      <button type="button" class="pop-item" data-pop="theme">${themeIcon()} Mode ${UI.currentTheme() === 'dark' ? 'terang' : 'gelap'}</button>
      <button type="button" class="pop-item danger" data-pop="logout">${icon('log-out', 19)} Keluar</button>`;
  }
  function moreMenu(more) {
    return more.map((n) => `<a href="#/${n.id}" class="pop-item ${current === n.id ? 'on' : ''}" data-pop="nav">${icon(n.icon, 19)} ${n.label}</a>`).join('') +
      `<hr><button type="button" class="pop-item" data-pop="pw">${icon('key-round', 19)} Ganti kata sandi</button>
       <button type="button" class="pop-item" data-pop="theme">${themeIcon()} Mode ${UI.currentTheme() === 'dark' ? 'terang' : 'gelap'}</button>
       <button type="button" class="pop-item danger" data-pop="logout">${icon('log-out', 19)} Keluar</button>`;
  }
  function togglePop(html, anchor, sheet) {
    const pop = $('#pop');
    if (!pop.hidden && pop._anchor === anchor) return closePop();
    pop.innerHTML = html;
    pop.className = 'popover' + (sheet ? ' sheet' : '');
    pop.hidden = false;
    pop._anchor = anchor;
    anchor.setAttribute('aria-expanded', 'true');
    if (!sheet) {
      const r = anchor.getBoundingClientRect();
      pop.style.top = (r.bottom + 8) + 'px';
      pop.style.right = Math.max(12, window.innerWidth - r.right) + 'px';
    } else { pop.style.top = ''; pop.style.right = ''; }
    pop.onclick = (e) => {
      const b = e.target.closest('[data-pop]'); if (!b) return;
      const a = b.dataset.pop;
      if (a === 'theme') { UI.toggleTheme(); $('#btn-theme').innerHTML = themeIcon(); closePop(); }
      if (a === 'logout') logout();
      if (a === 'pw') changePasswordDrawer();
      if (a === 'nav') closePop();
    };
  }
  function closePop() {
    const pop = $('#pop');
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    if (pop._anchor) pop._anchor.setAttribute('aria-expanded', 'false');
    pop._anchor = null;
  }
  document.addEventListener('click', (e) => { const pop = $('#pop'); if (pop && !pop.hidden && !pop.contains(e.target)) closePop(); });

  /** Bagian kerangka yang bergantung pada data: peringatan sidebar & jam sinkron. */
  function updateChrome() {
    if (!shellReady) return;
    const t = STATE.loadedAt;
    $('#sync').innerHTML = `<i></i>Dimuat ${String(t.getHours()).padStart(2, '0')}.${String(t.getMinutes()).padStart(2, '0')}`;
    const alert = $('#sb-alert');
    if (DATA.can('ks', 'r')) {
      const seg = DATA.allDocs().filter((r) => r.Status_Masa === 'Segera Berakhir');
      const n = seg.length;
      const tuju = (seg.find((r) => r._k === 'mou') || seg.find((r) => r._k === 'moa') || seg[0] || { _k: 'mou' })._k;
      alert.innerHTML = n ? `<div class="sb-alert"><div class="sba-t">${icon('triangle-alert', 16)} Peringatan masa aktif</div>
        <p>${n} dokumen MoU/MoA/IA berakhir kurang dari ${STATE.options.ambang.segera} bulan lagi.</p>
        <button type="button" class="btn btn-sm btn-block" id="sba-go">Tinjau dokumen</button></div>` : '';
      const g = $('#sba-go');
      if (g) g.onclick = () => go(tuju, { status: 'Segera Berakhir' });
    } else alert.innerHTML = '';
  }

  // =========================================================================
  // ROUTER
  // =========================================================================
  const parseHash = () => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard');

  function route() {
    if (!shellReady) return;
    let id = parseHash();
    if (ALIAS[id]) { id = ALIAS[id]; history.replaceState(null, '', '#/' + id); }
    const nav = NAV.find((n) => n.id === id);
    if (!nav || !nav.allow()) {
      if (nav) UI.toast('Halaman tersebut tidak tersedia untuk peran Anda.', 'warn');
      id = 'dashboard';
      history.replaceState(null, '', '#/dashboard');
    }
    current = id;
    UI.closeDrawer();
    UI.closeModal();
    closePop();
    renderView();
    window.scrollTo(0, 0);
  }

  function renderView(keepScroll) {
    if (!shellReady || !current) return;
    const y = window.scrollY;
    const view = $('#view');
    view.classList.remove('enter');
    PAGES[current].render(view);
    void view.offsetWidth;
    view.classList.add('enter');
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const on = a.dataset.nav === current;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const bm = $('#bn-more');
    if (bm) bm.classList.toggle('active', bm.dataset.more.split(',').indexOf(current) >= 0);
    const nav = NAV.find((n) => n.id === current);
    $('#mob-title').textContent = nav.short === 'Beranda' ? 'Beranda' : nav.label;
    document.title = PAGES[current].title + ' • SIMPEKA FTSP';
    if (keepScroll) window.scrollTo(0, y);
  }

  /** Pindah halaman; patch = filter awal halaman tujuan (filter lain di-reset). */
  function go(id, patch) {
    const k = FILTER_KEY[id];
    if (patch && k) STATE.f[k] = Object.assign(JSON.parse(JSON.stringify(DEFAULT_F[k])), patch);
    if (parseHash() === id) { renderView(); window.scrollTo(0, 0); }
    else location.hash = '#/' + id;
  }

  function refreshView() { renderView(true); updateChrome(); }

  // =========================================================================
  // START
  // =========================================================================
  function start() {
    UI.applyTheme();
    if (!window.SIMPEKA_CONFIG) {
      return renderConfigError('js/config.js berisi kesalahan penulisan',
        'Berkas <code>js/config.js</code> tidak bisa dibaca browser. Biasanya karena tanda kutip <code>\'</code> atau koma yang hilang. Bandingkan dengan contoh: <code>GAS_URL: \'https://script.google.com/macros/s/…/exec\',</code>');
    }
    const url = String(cfg().GAS_URL || '').trim();
    if (!url || /XXXX/.test(url) || !/^https:\/\/script\.google\.com\/.+\/exec$/.test(url)) {
      return renderConfigError('GAS_URL belum diatur',
        'Buka berkas <code>js/config.js</code> lalu isi <b>GAS_URL</b> dengan URL Web App Apps Script (berakhiran <code>/exec</code>).');
    }
    API.onAuthError = (e) => {
      if (e.code !== 'MUST_CHANGE') API.setToken(null);
      UI.loading(false);
      UI.closeDrawer();
      UI.closeModal();
      if (e.code === 'DENIED') renderDenied(e.extra && e.extra.email, e.message);
      else if (e.code === 'MUST_CHANGE') renderChangePassword();
      else renderLogin(e.message || 'Sesi Anda berakhir. Silakan masuk kembali.');
    };
    window.addEventListener('hashchange', route);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('row-click')) e.target.click();
    });
    if (API.token()) boot(); else renderLogin();
  }

  document.addEventListener('DOMContentLoaded', start);

  return { go, refreshView, refresh, can: DATA.can, _boot: boot };
})();
