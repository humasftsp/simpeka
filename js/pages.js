/**
 * PAGES — render setiap halaman SPA.
 * Setiap halaman: render(el) membangun kerangka + filter, lalu results()
 * hanya menggambar ulang daftar sehingga fokus input pencarian tidak hilang.
 */
const PAGES = (() => {
  const { esc, icon } = UI;
  const ST_KS = ['Aktif', 'Akan Berakhir', 'Segera Berakhir', 'Kadaluarsa'];
  const ST_PR = ['Rencana', 'Terlaksana', 'Batal'];
  const count = (arr, fn) => arr.filter(fn).length;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const pad = (n) => String(n).padStart(2, '0');

  function bindPager(root, f, rerender) {
    root.addEventListener('click', (e) => {
      const p = e.target.closest('[data-page]');
      if (p && !p.disabled) { f.page = Number(p.dataset.page); rerender(); root.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
      const s = e.target.closest('[data-sort]');
      if (s) { const k = s.dataset.sort; f.dir = f.sort === k ? -f.dir : 1; f.sort = k; f.page = 1; rerender(); }
    });
  }

  function hariIni() {
    return new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(new Date()) + ', ' + UI.tgl(UI.todayStr(), true);
  }

  function hero(sub) {
    const u = STATE.user;
    return `<section class="hero batik">
      <div class="hero-in">
        <div class="hero-chip">${icon('shield-check', 14)} ${esc(DATA.PERAN_LABEL[u.peran])}</div>
        <h1>Selamat datang, ${esc(u.nama)}</h1>
        <p>${sub}</p>
        <div class="hero-date">${icon('calendar', 15)} ${esc(hariIni())}</div>
      </div>
    </section>`;
  }

  function upcomingPromosi(n) {
    const t = UI.todayStr();
    return STATE.promosi.filter((r) => r.Status === 'Rencana' && r.Tanggal_Rencana >= t)
      .sort((a, b) => a.Tanggal_Rencana.localeCompare(b.Tanggal_Rencana)).slice(0, n);
  }
  function agendaList(rows) {
    if (!rows.length) return `<div class="mini-empty">${icon('calendar', 20)}<span>Belum ada jadwal promosi mendatang.</span></div>`;
    return `<ul class="agenda-list">${rows.map((r) => {
      const d = r.Tanggal_Rencana;
      return `<li><button type="button" data-pr="${esc(r.ID_Promosi)}">
        <span class="date-tile"><b>${+d.slice(8, 10)}</b><small>${UI.BLN[+d.slice(5, 7) - 1]}</small></span>
        <span class="ag-text"><span class="t-strong">${esc(r.Nama_Sekolah)}</span><span class="t-sub">${icon('map-pin', 12)} ${esc(r.Kota_Alamat || '-')}${r.PIC ? ' • ' + esc(r.PIC) : ''}</span></span>
        <span class="ag-when">${UI.sisaHari(d) === 0 ? 'Hari ini' : UI.sisaHari(d) + ' hari lagi'}</span></button></li>`;
    }).join('')}</ul>`;
  }

  function promosiPerBulan(n) {
    const t = UI.todayStr();
    let y = +t.slice(0, 4), m = +t.slice(5, 7) - 1;
    const items = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(y, m - i, 1);
      const key = d.getFullYear() + '-' + pad(d.getMonth() + 1);
      const rows = STATE.promosi.filter((r) => (r._tgl || '').slice(0, 7) === key);
      items.push({
        label: UI.BLN[d.getMonth()],
        values: [count(rows, (r) => r.Status === 'Terlaksana'), count(rows, (r) => r.Status === 'Rencana')]
      });
    }
    return UI.bars(items, [{ name: 'Terlaksana', color: 'var(--pr-terlaksana)' }, { name: 'Rencana', color: 'var(--pr-rencana)' }]);
  }

  function bindDashClicks(el) {
    el.addEventListener('click', (e) => {
      const ks = e.target.closest('[data-ks]'); if (ks) return FORMS.ksDetail(ks.dataset.ks);
      const pr = e.target.closest('[data-pr]'); if (pr) return FORMS.promosiDetail(pr.dataset.pr);
      const g = e.target.closest('[data-go]');
      if (g) {
        const patch = g.dataset.patch ? JSON.parse(g.dataset.patch) : {};
        APP.go(g.dataset.go, patch);
      }
    });
  }

  // =========================================================================
  // DASHBOARD (F2, F9)
  // =========================================================================
  const dashboard = {
    title: 'Dashboard',
    render(el) {
      if (!DATA.can('ks', 'r')) return this.promosiOnly(el);
      const ks = STATE.ks, am = STATE.options.ambang;
      const total = ks.length;
      const desc = { 'Aktif': 'Sisa masa > ' + am.akan + ' bulan', 'Akan Berakhir': 'Sisa ' + am.segera + '–' + am.akan + ' bulan', 'Segera Berakhir': 'Sisa < ' + am.segera + ' bulan', 'Kadaluarsa': 'Masa perjanjian sudah lewat' };
      const ics = { 'Aktif': 'circle-check', 'Akan Berakhir': 'clock', 'Segera Berakhir': 'triangle-alert', 'Kadaluarsa': 'circle-x' };

      const berlaku = ks.filter((r) => r.Status_Masa !== 'Kadaluarsa');
      const berlakuIA = count(berlaku, (r) => r._ia > 0);
      const belumIA = count(ks, (r) => !r._ia);

      const attn = ks.filter((r) => r.Status_Masa === 'Segera Berakhir' || r.Status_Masa === 'Akan Berakhir').sort((a, b) => a.Akhir.localeCompare(b.Akhir))
        .concat(ks.filter((r) => r.Status_Masa === 'Kadaluarsa').sort((a, b) => b.Akhir.localeCompare(a.Akhir)));

      const jm = STATE.options.jenisMitra.map((j, i) => ({ label: j, value: count(ks, (r) => r.Jenis_Mitra === j), color: DATA.MITRA_COLORS[i % 6] }));
      const tahun = [...new Set(ks.map((r) => r.Tahun).filter(Boolean))].sort().slice(-7);

      el.innerHTML = `
        ${hero('Pantau masa berlaku kerja sama, keterhubungan IA, dan jadwal promosi sekolah FTSP Universitas Trisakti dari satu tempat.')}
        <div class="grid g-4">${ST_KS.map((s) => {
          const n = count(ks, (r) => r.Status_Masa === s);
          return `<button type="button" class="kpi" style="--accent:${UI.color(s)}" data-go="kerjasama" data-patch='${JSON.stringify({ status: s })}' aria-label="${s}: ${n} kerja sama">
            <span class="kpi-top"><span class="kpi-label">${s}</span><span class="kpi-ic">${icon(ics[s], 18)}</span></span>
            <span class="kpi-num">${n}</span>
            <span class="kpi-desc">${desc[s]}</span>
            <span class="kpi-foot">${UI.progress(pct(n, total), UI.color(s))}<span>${pct(n, total)}% dari ${total}</span></span>
          </button>`;
        }).join('')}</div>

        <div class="grid g-2">
          <div class="card stat-card">
            <div class="stat-ic">${icon('file-check', 22)}</div>
            <div class="stat-body">
              <div class="card-title">Keterhubungan IA</div>
              <p class="card-sub">${berlakuIA} dari ${berlaku.length} kerja sama yang masih berlaku sudah memiliki IA</p>
              ${UI.progress(pct(berlakuIA, berlaku.length))}
            </div>
            <div class="stat-num"><b>${pct(berlakuIA, berlaku.length)}%</b>${belumIA ? `<button type="button" class="link-btn warn" data-go="kerjasama" data-patch='${JSON.stringify({ ia: 'Belum Ada' })}'>${belumIA} belum ber-IA ${icon('arrow-right', 14)}</button>` : '<span class="muted">Semua lengkap</span>'}</div>
          </div>
          <div class="card stat-card">
            <div class="stat-ic violet">${icon('megaphone', 22)}</div>
            <div class="stat-body">
              <div class="card-title">Promosi sekolah</div>
              <p class="card-sub">${STATE.promosi.length} kegiatan tercatat</p>
              <div class="mini-stats">${ST_PR.map((s) => `<span style="--c:${UI.color(s)}"><b>${count(STATE.promosi, (r) => r.Status === s)}</b>${s}</span>`).join('')}</div>
            </div>
            <div class="stat-num"><button type="button" class="link-btn" data-go="promosi">Lihat promosi ${icon('arrow-right', 14)}</button></div>
          </div>
        </div>

        <div class="grid g-main">
          <section class="card">
            <div class="card-head"><div><h2 class="card-title">${icon('triangle-alert', 18)} Perlu perhatian</h2><p class="card-sub">Kerja sama yang mendekati atau melewati masa berakhir, terdekat lebih dulu</p></div>
              <button type="button" class="btn btn-ghost btn-sm" data-go="kerjasama">Semua ${icon('arrow-right', 14)}</button></div>
            ${attn.length ? `<ul class="attn-list">${attn.slice(0, 6).map((r) => `<li><button type="button" data-ks="${esc(r.ID_Kerja_Sama)}" style="--accent:${UI.color(r.Status_Masa)}">
              <span class="attn-main"><span class="attn-id">${DATA.chipMoU(r.Jenis_MoU)} <span class="mono muted">${esc(r.ID_Kerja_Sama)}</span></span>
              <span class="t-strong">${esc(r.Mitra)}</span><span class="t-sub clamp1">${esc(r.Judul_Kerja_Sama)}</span></span>
              <span class="attn-side">${UI.badge(r.Status_Masa)}<span class="t-sub">${UI.tgl(r.Akhir)} • ${esc(UI.sisaTeks(r.Akhir).replace(/ \(.*\)/, ''))}</span></span>
            </button></li>`).join('')}</ul>${attn.length > 6 ? `<p class="more-note">+${attn.length - 6} kerja sama lain perlu ditinjau</p>` : ''}`
              : `<div class="mini-empty">${icon('circle-check', 20)}<span>Semua kerja sama berstatus Aktif. Tidak ada yang perlu ditindaklanjuti.</span></div>`}
          </section>
          <section class="card">
            <div class="card-head"><div><h2 class="card-title">${icon('calendar-days', 18)} Jadwal promosi terdekat</h2><p class="card-sub">Kunjungan sekolah berstatus Rencana</p></div></div>
            ${agendaList(upcomingPromosi(5))}
            <button type="button" class="btn btn-outline btn-block" data-go="kalender">${icon('calendar-days', 16)} Buka kalender</button>
          </section>
        </div>

        <div class="grid g-2">
          <section class="card"><div class="card-head"><div><h2 class="card-title">Kerja sama per jenis mitra</h2><p class="card-sub">Seluruh MoU/MoA tercatat</p></div></div>${UI.donut(jm, 'kerja sama')}</section>
          <section class="card"><div class="card-head"><div><h2 class="card-title">Komposisi status masa berlaku</h2><p class="card-sub">Dihitung otomatis per hari ini</p></div></div>
            ${UI.donut(ST_KS.map((s) => ({ label: s, value: count(ks, (r) => r.Status_Masa === s), color: UI.color(s) })), 'dokumen')}</section>
          <section class="card"><div class="card-head"><div><h2 class="card-title">Kerja sama per tahun</h2><p class="card-sub">Berdasarkan tahun mulai berlaku</p></div></div>
            ${tahun.length ? UI.bars(tahun.map((t) => ({ label: String(t), values: [count(ks, (r) => r.Tahun === t && r.Jenis_MoU === 'MoU'), count(ks, (r) => r.Tahun === t && r.Jenis_MoU === 'MoA')] })), [{ name: 'MoU', color: 'var(--c1)' }, { name: 'MoA', color: 'var(--c4)' }]) : UI.empty('Belum ada data', '')}</section>
          <section class="card"><div class="card-head"><div><h2 class="card-title">Promosi per bulan</h2><p class="card-sub">12 bulan terakhir</p></div></div>${promosiPerBulan(12)}</section>
        </div>`;
      bindDashClicks(el);
    },

    /** Dashboard Tim Promosi — hanya data promosi */
    promosiOnly(el) {
      const pr = STATE.promosi;
      el.innerHTML = `
        ${hero('Pantau jadwal dan realisasi kunjungan promosi sekolah FTSP Universitas Trisakti.')}
        <div class="grid g-4">
          <button type="button" class="kpi" style="--accent:var(--primary)" data-go="promosi"><span class="kpi-top"><span class="kpi-label">Total kegiatan</span><span class="kpi-ic">${icon('school', 18)}</span></span><span class="kpi-num">${pr.length}</span><span class="kpi-desc">Seluruh promosi tercatat</span></button>
          ${ST_PR.map((s) => `<button type="button" class="kpi" style="--accent:${UI.color(s)}" data-go="promosi" data-patch='${JSON.stringify({ status: s })}'><span class="kpi-top"><span class="kpi-label">${s}</span><span class="kpi-ic">${icon(s === 'Rencana' ? 'clock' : s === 'Batal' ? 'circle-x' : 'circle-check', 18)}</span></span><span class="kpi-num">${count(pr, (r) => r.Status === s)}</span><span class="kpi-desc">${pct(count(pr, (r) => r.Status === s), pr.length)}% dari total</span></button>`).join('')}
        </div>
        <div class="grid g-main">
          <section class="card"><div class="card-head"><div><h2 class="card-title">Promosi per bulan</h2><p class="card-sub">12 bulan terakhir</p></div></div>${promosiPerBulan(12)}</section>
          <section class="card"><div class="card-head"><div><h2 class="card-title">${icon('calendar-days', 18)} Jadwal terdekat</h2></div></div>${agendaList(upcomingPromosi(6))}
            <button type="button" class="btn btn-outline btn-block" data-go="kalender">${icon('calendar-days', 16)} Buka kalender</button></section>
        </div>`;
      bindDashClicks(el);
    }
  };

  // =========================================================================
  // KERJA SAMA (F3, F8)
  // =========================================================================
  const kerjasama = {
    title: 'Kerja Sama (MoU/MoA)',
    render(el) {
      const f = STATE.f.ks, ks = STATE.ks;
      const tahun = [...new Set(ks.map((r) => String(r.Tahun)).filter(Boolean))].sort().reverse();
      el.innerHTML = `
        ${DATA.head({
          eyebrow: icon('handshake', 14) + ' Arsip kerja sama FTSP',
          title: 'Kerja Sama (MoU/MoA)',
          lead: 'Seluruh nota kesepahaman dan perjanjian kerja sama. Status masa berlaku dihitung otomatis dari tanggal berakhir.',
          actions: DATA.can('ks', 'w') ? `<button type="button" class="btn btn-primary" id="ks-add">${icon('plus', 18)} Tambah kerja sama</button>` : ''
        })}
        <div class="seg-scroll"><div class="seg" id="ks-seg" role="tablist">${[''].concat(ST_KS).map((s) =>
          `<button type="button" role="tab" data-st="${s}" class="${f.status === s ? 'on' : ''}" aria-selected="${f.status === s}">${s ? `<i class="sdot" style="background:${UI.color(s)}"></i>` : ''}${s || 'Semua'} <span class="cnt">${s ? count(ks, (r) => r.Status_Masa === s) : ks.length}</span></button>`).join('')}</div></div>
        <div class="card filter-card"><div class="filters">
          <label class="search">${icon('search', 18)}<input id="ks-q" type="search" placeholder="Cari ID, mitra, atau judul…" value="${esc(f.q)}" aria-label="Cari kerja sama"></label>
          ${DATA.select('ks-jm', 'Semua jenis mitra', STATE.options.jenisMitra, f.jenisMitra)}
          ${DATA.select('ks-jenis', 'MoU & MoA', ['MoU', 'MoA'], f.jenisMoU, 'Jenis dokumen')}
          ${DATA.select('ks-thn', 'Semua tahun', tahun, f.tahun, 'Tahun')}
          ${DATA.select('ks-ia', 'Status IA', [{ value: 'Ada', label: 'Sudah ada IA' }, { value: 'Belum Ada', label: 'Belum ada IA' }], f.ia)}
          <button type="button" class="btn btn-ghost btn-sm" id="ks-reset">${icon('refresh-cw', 15)} Reset</button>
        </div></div>
        <section class="card list-card" id="ks-res"></section>`;

      const res = UI.$('#ks-res', el);
      const go = () => this.results(res);
      UI.$('#ks-add', el) && (UI.$('#ks-add', el).onclick = () => FORMS.ksForm());
      UI.$('#ks-seg', el).onclick = (e) => {
        const b = e.target.closest('[data-st]'); if (!b) return;
        f.status = b.dataset.st; f.page = 1;
        UI.$$('#ks-seg button', el).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
        go();
      };
      UI.$('#ks-q', el).oninput = UI.debounce((e) => { f.q = e.target.value.trim(); f.page = 1; go(); }, 150);
      [['ks-jm', 'jenisMitra'], ['ks-jenis', 'jenisMoU'], ['ks-thn', 'tahun'], ['ks-ia', 'ia']].forEach(([id, k]) => {
        UI.$('#' + id, el).onchange = (e) => { f[k] = e.target.value; f.page = 1; go(); };
      });
      UI.$('#ks-reset', el).onclick = () => { Object.assign(f, { q: '', status: '', jenisMitra: '', jenisMoU: '', tahun: '', ia: '', page: 1 }); this.render(el); };
      bindPager(res, f, go);
      res.addEventListener('click', (e) => {
        if (e.target.closest('[data-page],[data-sort]')) return;
        const act = e.target.closest('[data-act]');
        const row = e.target.closest('[data-id]');
        if (!row) return;
        const id = row.dataset.id;
        if (act) {
          e.stopPropagation();
          const a = act.dataset.act;
          if (a === 'berkas') DATA.berkas('ks', id);
          if (a === 'edit') FORMS.ksForm(id);
          if (a === 'del') DATA.del('ks', id).then((ok) => ok && this.render(el));
          return;
        }
        FORMS.ksDetail(id);
      });
      go();
    },

    results(res) {
      const f = STATE.f.ks;
      let rows = STATE.ks.filter((r) =>
        (!f.status || r.Status_Masa === f.status) && (!f.jenisMitra || r.Jenis_Mitra === f.jenisMitra) &&
        (!f.jenisMoU || r.Jenis_MoU === f.jenisMoU) && (!f.tahun || String(r.Tahun) === f.tahun) &&
        (!f.ia || r.Ceklis_IA === f.ia) && (!f.q || DATA.matchQ(f.q, [r.ID_Kerja_Sama, r.Mitra, r.Judul_Kerja_Sama])));
      rows = DATA.sortRows(rows, f);
      if (!rows.length) {
        res.innerHTML = STATE.ks.length ? UI.empty('Tidak ada yang cocok', 'Coba ubah kata kunci atau filter.')
          : UI.empty('Belum ada kerja sama', 'Mulai dengan menambahkan MoU/MoA pertama.', DATA.can('ks', 'w') ? `<button type="button" class="btn btn-primary" onclick="FORMS.ksForm()">${icon('plus', 16)} Tambah kerja sama</button>` : '');
        return;
      }
      const p = DATA.paginate(rows, f);
      const acts = (r) => `<span class="row-acts">
        ${r.Link_Bukti ? `<button type="button" class="icon-btn sm" data-act="berkas" title="Lihat berkas" aria-label="Lihat berkas ${esc(r.ID_Kerja_Sama)}">${icon('eye', 17)}</button>` : ''}
        ${DATA.can('ks', 'w') ? `<button type="button" class="icon-btn sm" data-act="edit" title="Ubah" aria-label="Ubah ${esc(r.ID_Kerja_Sama)}">${icon('pencil', 17)}</button>` : ''}
        ${DATA.can('ks', 'd') ? `<button type="button" class="icon-btn sm danger" data-act="del" title="Hapus" aria-label="Hapus ${esc(r.ID_Kerja_Sama)}">${icon('trash-2', 17)}</button>` : ''}</span>`;
      res.innerHTML = `
        <div class="list-head"><h2 class="card-title">Daftar dokumen</h2><span class="chip">${rows.length} hasil</span></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr>${DATA.sortTh('ID', 'ID_Kerja_Sama', f)}<th>Jenis</th>${DATA.sortTh('Mitra & judul', 'Mitra', f)}${DATA.sortTh('Jenis mitra', 'Jenis_Mitra', f)}${DATA.sortTh('Masa berlaku', 'Akhir', f)}<th>Status & sisa</th><th>IA</th><th class="ta-r">Aksi</th></tr></thead>
          <tbody>${p.rows.map((r) => `<tr data-id="${esc(r.ID_Kerja_Sama)}" class="row-click" tabindex="0">
            <td class="mono">${esc(r.ID_Kerja_Sama)}</td><td>${DATA.chipMoU(r.Jenis_MoU)}</td>
            <td class="w-wide"><div class="t-strong">${esc(r.Mitra)}</div><div class="t-sub clamp2">${esc(r.Judul_Kerja_Sama)}</div></td>
            <td><span class="chip">${esc(r.Jenis_Mitra)}</span></td>
            <td class="nowrap"><div>${UI.tgl(r.Awal)}</div><div class="t-sub">s.d. <b ${r.Status_Masa !== 'Aktif' ? `style="color:${UI.tcolor(r.Status_Masa)}"` : ''}>${UI.tgl(r.Akhir)}</b></div></td>
            <td>${UI.badge(r.Status_Masa)}<div class="t-sub">${esc(UI.sisaTeks(r.Akhir))}</div></td>
            <td>${DATA.iaChip(r)}</td><td class="ta-r">${acts(r)}</td></tr>`).join('')}</tbody>
        </table></div>
        <ul class="mlist">${p.rows.map((r) => `<li class="mcard" data-id="${esc(r.ID_Kerja_Sama)}" style="--accent:${UI.color(r.Status_Masa)}">
          <div class="mcard-top"><span class="avatar sq">${esc(UI.initials(r.Mitra))}</span><div class="mcard-title"><span class="t-strong">${esc(r.Mitra)}</span><span class="t-sub">${esc(r.ID_Kerja_Sama)} • ${UI.tgl(r.Awal)} – ${UI.tgl(r.Akhir)}</span></div></div>
          <p class="t-sub clamp2">${esc(r.Judul_Kerja_Sama)}</p>
          <div class="chips">${DATA.chipMoU(r.Jenis_MoU)}<span class="chip">${esc(r.Jenis_Mitra)}</span>${DATA.iaChip(r)}</div>
          <div class="mcard-foot">${UI.badge(r.Status_Masa, UI.sisaTeks(r.Akhir).replace(/ \(.*\)/, ''))}${acts(r)}</div></li>`).join('')}</ul>
        ${DATA.pager(rows.length, f, p.pages, p.start)}`;
    }
  };

  // =========================================================================
  // IA (F4)
  // =========================================================================
  const ia = {
    title: 'Implementation Agreement',
    render(el) {
      const f = STATE.f.ia, rows = STATE.ia;
      const terhubung = count(rows, (r) => r.ID_Kerja_Sama), mandiri = rows.length - terhubung, lengkap = count(rows, (r) => r.Ceklis_IA === 'Sudah');
      const tabs = [['', 'Semua', rows.length], ['link', 'Terhubung MoU/MoA', terhubung], ['mandiri', 'IA mandiri', mandiri], ['belum', 'Berkas belum lengkap', rows.length - lengkap]];
      const tahun = [...new Set(rows.map((r) => (r.Tanggal_IA || '').slice(0, 4)).filter(Boolean))].sort().reverse();
      el.innerHTML = `
        ${DATA.head({
          eyebrow: icon('file-check', 14) + ' Implementation Agreement',
          title: 'Manajemen IA',
          lead: 'Setiap kegiatan wajib memiliki IA, baik turunan MoU/MoA maupun kegiatan mandiri tanpa MoU/MoA.',
          actions: DATA.can('ia', 'w') ? `<button type="button" class="btn btn-primary" id="ia-add">${icon('plus', 18)} Rekam IA baru</button>` : ''
        })}
        <div class="grid g-4">
          ${kpiMini('Total IA', rows.length, 'file-text', 'var(--primary)', 'Seluruh IA tercatat')}
          ${kpiMini('Terhubung MoU/MoA', terhubung, 'link', 'var(--c3)', pct(terhubung, rows.length) + '% dari total')}
          ${kpiMini('IA mandiri', mandiri, 'layers-2', 'var(--pr-rencana)', pct(mandiri, rows.length) + '% dari total')}
          ${kpiMini('Berkas lengkap', lengkap, 'circle-check', 'var(--st-aktif)', (rows.length - lengkap) + ' belum lengkap')}
        </div>
        <div class="card filter-card"><div class="filters">
          <div class="seg" id="ia-tabs">${tabs.map(([v, l, n]) => `<button type="button" data-tab="${v}" class="${f.tab === v ? 'on' : ''}">${l} <span class="cnt">${n}</span></button>`).join('')}</div>
          <label class="search">${icon('search', 18)}<input id="ia-q" type="search" placeholder="Cari ID, kegiatan, mitra…" value="${esc(f.q)}" aria-label="Cari IA"></label>
          ${DATA.select('ia-thn', 'Semua tahun', tahun, f.tahun, 'Tahun')}
        </div></div>
        <section class="card list-card" id="ia-res"></section>`;
      const res = UI.$('#ia-res', el);
      const go = () => this.results(res);
      UI.$('#ia-add', el) && (UI.$('#ia-add', el).onclick = () => FORMS.iaForm());
      UI.$('#ia-tabs', el).onclick = (e) => {
        const b = e.target.closest('[data-tab]'); if (!b) return;
        f.tab = b.dataset.tab; f.page = 1;
        UI.$$('#ia-tabs button', el).forEach((x) => x.classList.toggle('on', x === b));
        go();
      };
      UI.$('#ia-q', el).oninput = UI.debounce((e) => { f.q = e.target.value.trim(); f.page = 1; go(); }, 150);
      UI.$('#ia-thn', el).onchange = (e) => { f.tahun = e.target.value; f.page = 1; go(); };
      bindPager(res, f, go);
      res.addEventListener('click', (e) => {
        if (e.target.closest('[data-page],[data-sort]')) return;
        const row = e.target.closest('[data-id]'); if (!row) return;
        const id = row.dataset.id, act = e.target.closest('[data-act]');
        if (act) {
          const a = act.dataset.act;
          if (a === 'berkas') DATA.berkas('ia', id);
          if (a === 'edit') FORMS.iaForm(id);
          if (a === 'del') DATA.del('ia', id).then((ok) => ok && this.render(el));
          if (a === 'ks') FORMS.ksDetail(act.dataset.ks);
          return;
        }
        FORMS.iaDetail(id);
      });
      go();
    },
    results(res) {
      const f = STATE.f.ia;
      let rows = STATE.ia.filter((r) =>
        (!f.tab || (f.tab === 'link' ? r.ID_Kerja_Sama : f.tab === 'mandiri' ? !r.ID_Kerja_Sama : r.Ceklis_IA !== 'Sudah')) &&
        (!f.tahun || (r.Tanggal_IA || '').slice(0, 4) === f.tahun) &&
        (!f.q || DATA.matchQ(f.q, [r.ID_IA, r.Nama_Kegiatan, r.Mitra, r.ID_Kerja_Sama])));
      rows = DATA.sortRows(rows, f);
      if (!rows.length) {
        res.innerHTML = STATE.ia.length ? UI.empty('Tidak ada yang cocok', 'Coba ubah kata kunci atau filter.') : UI.empty('Belum ada IA', 'Rekam IA pertama untuk kegiatan kerja sama.');
        return;
      }
      const p = DATA.paginate(rows, f);
      const rel = (r) => r.ID_Kerja_Sama ? `<button type="button" class="chip chip-blue chip-btn" data-act="ks" data-ks="${esc(r.ID_Kerja_Sama)}">${icon('link', 12)} ${esc(r.ID_Kerja_Sama)}</button>` : '<span class="chip chip-violet">IA mandiri</span>';
      const cek = (r) => r.Ceklis_IA === 'Sudah' ? `<span class="badge st-aktif">${icon('circle-check', 13)}Lengkap</span>` : `<span class="badge st-akan">${icon('clock', 13)}Belum lengkap</span>`;
      const acts = (r) => `<span class="row-acts">
        ${r.Link_Berkas ? `<button type="button" class="icon-btn sm" data-act="berkas" title="Lihat berkas" aria-label="Lihat berkas">${icon('eye', 17)}</button>` : ''}
        ${DATA.can('ia', 'w') ? `<button type="button" class="icon-btn sm" data-act="edit" title="Ubah" aria-label="Ubah">${icon('pencil', 17)}</button>` : ''}
        ${DATA.can('ia', 'd') ? `<button type="button" class="icon-btn sm danger" data-act="del" title="Hapus" aria-label="Hapus">${icon('trash-2', 17)}</button>` : ''}</span>`;
      res.innerHTML = `
        <div class="list-head"><h2 class="card-title">Daftar IA</h2><span class="chip">${rows.length} hasil</span></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr>${DATA.sortTh('ID', 'ID_IA', f)}<th>Hubungan</th>${DATA.sortTh('Nama kegiatan', 'Nama_Kegiatan', f)}${DATA.sortTh('Mitra', 'Mitra', f)}${DATA.sortTh('Tanggal', 'Tanggal_IA', f)}<th>Berkas</th><th class="ta-r">Aksi</th></tr></thead>
          <tbody>${p.rows.map((r) => `<tr data-id="${esc(r.ID_IA)}" class="row-click" tabindex="0">
            <td class="mono">${esc(r.ID_IA)}</td><td>${rel(r)}</td>
            <td class="w-wide"><div class="t-strong">${esc(r.Nama_Kegiatan)}</div></td>
            <td>${esc(r.Mitra)}</td><td class="nowrap">${UI.tgl(r.Tanggal_IA)}</td><td>${cek(r)}</td><td class="ta-r">${acts(r)}</td></tr>`).join('')}</tbody>
        </table></div>
        <ul class="mlist">${p.rows.map((r) => `<li class="mcard" data-id="${esc(r.ID_IA)}" style="--accent:${r.Ceklis_IA === 'Sudah' ? 'var(--st-aktif)' : 'var(--st-akan)'}">
          <div class="chips"><span class="mono muted">${esc(r.ID_IA)}</span>${rel(r)}<span class="spacer"></span>${cek(r)}</div>
          <div class="t-strong lg">${esc(r.Nama_Kegiatan)}</div>
          <div class="meta">${icon('building-2', 14)} ${esc(r.Mitra)}</div>
          <div class="meta">${icon('calendar', 14)} ${UI.tgl(r.Tanggal_IA, true)}</div>
          <div class="mcard-foot"><span></span>${acts(r)}</div></li>`).join('')}</ul>
        ${DATA.pager(rows.length, f, p.pages, p.start)}`;
    }
  };

  function kpiMini(label, n, ic, col, sub) {
    return `<div class="kpi static" style="--accent:${col}"><span class="kpi-top"><span class="kpi-label">${esc(label)}</span><span class="kpi-ic">${icon(ic, 18)}</span></span><span class="kpi-num">${n}</span><span class="kpi-desc">${esc(sub)}</span></div>`;
  }

  // =========================================================================
  // PROMOSI (F5)
  // =========================================================================
  const promosi = {
    title: 'Promosi Sekolah',
    render(el) {
      const f = STATE.f.promosi, rows = STATE.promosi;
      const bulanOpts = [...new Set(rows.map((r) => (r._tgl || '').slice(0, 7)).filter(Boolean))].sort().reverse()
        .map((b) => ({ value: b, label: UI.BULAN[+b.slice(5, 7) - 1] + ' ' + b.slice(0, 4) }));
      el.innerHTML = `
        ${DATA.head({
          eyebrow: icon('megaphone', 14) + ' Promosi & sosialisasi PMB',
          title: 'Promosi Sekolah',
          lead: 'Jadwal kunjungan promosi ke sekolah beserta bukti kegiatannya. Setiap jadwal otomatis tampil di kalender promosi.',
          actions: (DATA.can('promosi', 'w') ? `<button type="button" class="btn btn-primary" id="pr-add">${icon('plus', 18)} Jadwalkan kunjungan</button>` : '') +
            `<button type="button" class="btn btn-outline" data-go="kalender">${icon('calendar-days', 18)} Kalender</button>`
        })}
        <div class="grid g-4">
          ${kpiMini('Total kegiatan', rows.length, 'school', 'var(--primary)', 'Seluruh promosi tercatat')}
          ${ST_PR.map((s) => kpiMini(s, count(rows, (r) => r.Status === s), s === 'Rencana' ? 'clock' : s === 'Batal' ? 'circle-x' : 'circle-check', UI.color(s), pct(count(rows, (r) => r.Status === s), rows.length) + '% dari total')).join('')}
        </div>
        <div class="card filter-card"><div class="filters">
          <div class="seg" id="pr-seg">${[''].concat(ST_PR).map((s) => `<button type="button" data-st="${s}" class="${f.status === s ? 'on' : ''}">${s ? `<i class="sdot" style="background:${UI.color(s)}"></i>` : ''}${s || 'Semua'} <span class="cnt">${s ? count(rows, (r) => r.Status === s) : rows.length}</span></button>`).join('')}</div>
          <label class="search">${icon('search', 18)}<input id="pr-q" type="search" placeholder="Cari sekolah, kota, atau PIC…" value="${esc(f.q)}" aria-label="Cari promosi"></label>
          ${DATA.select('pr-bln', 'Semua bulan', bulanOpts, f.bulan, 'Bulan')}
        </div></div>
        <section class="card list-card" id="pr-res"></section>`;
      const res = UI.$('#pr-res', el);
      const go = () => this.results(res);
      UI.$('#pr-add', el) && (UI.$('#pr-add', el).onclick = () => FORMS.promosiForm());
      UI.$('[data-go]', el).onclick = () => APP.go('kalender', { mode: 'promosi' });
      UI.$('#pr-seg', el).onclick = (e) => {
        const b = e.target.closest('[data-st]'); if (!b) return;
        f.status = b.dataset.st; f.page = 1;
        UI.$$('#pr-seg button', el).forEach((x) => x.classList.toggle('on', x === b));
        go();
      };
      UI.$('#pr-q', el).oninput = UI.debounce((e) => { f.q = e.target.value.trim(); f.page = 1; go(); }, 150);
      UI.$('#pr-bln', el).onchange = (e) => { f.bulan = e.target.value; f.page = 1; go(); };
      bindPager(res, f, go);
      res.addEventListener('click', (e) => {
        if (e.target.closest('[data-page],[data-sort]')) return;
        const row = e.target.closest('[data-id]'); if (!row) return;
        const id = row.dataset.id, act = e.target.closest('[data-act]');
        if (act) {
          const a = act.dataset.act;
          if (a === 'berkas') DATA.berkas('promosi', id);
          if (a === 'edit') FORMS.promosiForm(id);
          if (a === 'del') DATA.del('promosi', id).then((ok) => ok && this.render(el));
          return;
        }
        FORMS.promosiDetail(id);
      });
      go();
    },
    results(res) {
      const f = STATE.f.promosi;
      let rows = STATE.promosi.filter((r) => (!f.status || r.Status === f.status) &&
        (!f.bulan || (r._tgl || '').slice(0, 7) === f.bulan) &&
        (!f.q || DATA.matchQ(f.q, [r.ID_Promosi, r.Nama_Sekolah, r.Kota_Alamat, r.PIC])));
      rows = DATA.sortRows(rows, f);
      if (!rows.length) {
        res.innerHTML = STATE.promosi.length ? UI.empty('Tidak ada yang cocok', 'Coba ubah kata kunci atau filter.') : UI.empty('Belum ada jadwal promosi', DATA.can('promosi', 'w') ? 'Jadwalkan kunjungan sekolah pertama.' : 'Jadwal akan tampil di sini setelah diinput Admin atau WD IV.');
        return;
      }
      const p = DATA.paginate(rows, f);
      const bukti = (r) => r.Link_Bukti ? `<button type="button" class="chip chip-blue chip-btn" data-act="berkas">${icon('eye', 12)} Lihat bukti</button>` : '<span class="muted sm">Belum diunggah</span>';
      const acts = (r) => (DATA.can('promosi', 'w') || DATA.can('promosi', 'd')) ? `<span class="row-acts">
        ${DATA.can('promosi', 'w') ? `<button type="button" class="icon-btn sm" data-act="edit" title="Ubah" aria-label="Ubah">${icon('pencil', 17)}</button>` : ''}
        ${DATA.can('promosi', 'd') ? `<button type="button" class="icon-btn sm danger" data-act="del" title="Hapus" aria-label="Hapus">${icon('trash-2', 17)}</button>` : ''}</span>` : '';
      const tglCell = (r) => r.Tanggal_Realisasi && r.Tanggal_Realisasi !== r.Tanggal_Rencana
        ? `<div>${UI.tgl(r.Tanggal_Realisasi)}</div><div class="t-sub">Rencana ${UI.tgl(r.Tanggal_Rencana)}</div>`
        : `<div>${UI.tgl(r.Tanggal_Rencana)}</div><div class="t-sub">${r.Status === 'Rencana' ? (UI.sisaHari(r.Tanggal_Rencana) >= 0 ? (UI.sisaHari(r.Tanggal_Rencana) === 0 ? 'Hari ini' : UI.sisaHari(r.Tanggal_Rencana) + ' hari lagi') : 'Lewat jadwal — perbarui status') : r.Status === 'Terlaksana' ? 'Sesuai rencana' : ''}</div>`;
      res.innerHTML = `
        <div class="list-head"><h2 class="card-title">Daftar kegiatan</h2><span class="chip">${rows.length} hasil</span></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr>${DATA.sortTh('ID', 'ID_Promosi', f)}${DATA.sortTh('Sekolah & lokasi', 'Nama_Sekolah', f)}${DATA.sortTh('PIC', 'PIC', f)}${DATA.sortTh('Tanggal', '_tgl', f)}<th>Status</th><th>Bukti</th>${DATA.can('promosi', 'w') ? '<th class="ta-r">Aksi</th>' : ''}</tr></thead>
          <tbody>${p.rows.map((r) => `<tr data-id="${esc(r.ID_Promosi)}" class="row-click ${r.Status === 'Batal' ? 'is-batal' : ''}" tabindex="0">
            <td class="mono">${esc(r.ID_Promosi)}</td>
            <td class="w-wide"><div class="t-strong">${esc(r.Nama_Sekolah)}</div><div class="t-sub">${icon('map-pin', 12)} ${esc(r.Kota_Alamat || '-')}</div></td>
            <td>${esc(r.PIC || '-')}</td><td class="nowrap">${tglCell(r)}</td><td>${UI.badge(r.Status)}</td><td>${bukti(r)}</td>${DATA.can('promosi', 'w') ? `<td class="ta-r">${acts(r)}</td>` : ''}</tr>`).join('')}</tbody>
        </table></div>
        <ul class="mlist">${p.rows.map((r) => `<li class="mcard" data-id="${esc(r.ID_Promosi)}" style="--accent:${UI.color(r.Status)}">
          <div class="mcard-top"><span class="avatar sq" style="--av:${UI.color(r.Status)}">${icon(r.Status === 'Terlaksana' ? 'circle-check' : r.Status === 'Batal' ? 'circle-x' : 'clock', 20)}</span>
            <div class="mcard-title"><span class="t-strong ${r.Status === 'Batal' ? 'strike' : ''}">${esc(r.Nama_Sekolah)}</span><span class="t-sub">${esc(r.Kota_Alamat || '-')}</span></div>${UI.badge(r.Status)}</div>
          <div class="chips"><span class="chip">${icon('user-round', 12)} ${esc(r.PIC || '-')}</span><span class="chip">${icon('calendar', 12)} ${UI.tgl(r._tgl)}</span></div>
          <div class="mcard-foot">${bukti(r)}${acts(r)}</div></li>`).join('')}</ul>
        ${DATA.pager(rows.length, f, p.pages, p.start)}`;
    }
  };

  // =========================================================================
  // KALENDER (F6, F7)
  // =========================================================================
  const kalender = {
    title: 'Kalender',
    events(mode) {
      const f = STATE.f.kal, out = [];
      if (mode !== 'promosi' && DATA.can('ks', 'r')) STATE.ks.forEach((r) => {
        if (f.jenisMitra && r.Jenis_Mitra !== f.jenisMitra) return;
        out.push({ date: r.Akhir, type: 'ks', id: r.ID_Kerja_Sama, status: r.Status_Masa, title: r.Mitra, kind: r.Jenis_MoU + ' berakhir', sub: r.ID_Kerja_Sama + ' • ' + r.Jenis_Mitra });
      });
      if (mode !== 'ks') STATE.promosi.forEach((r) => {
        if (f.status && r.Status !== f.status) return;
        out.push({ date: r._tgl, type: 'promosi', id: r.ID_Promosi, status: r.Status, title: r.Nama_Sekolah, kind: 'Promosi sekolah', sub: [r.Kota_Alamat, r.PIC].filter(Boolean).join(' • ') });
      });
      return out.filter((e) => e.date);
    },
    render(el) {
      const f = STATE.f.kal;
      const canKS = DATA.can('ks', 'r');
      const modes = canKS ? [['semua', 'Semua agenda'], ['ks', 'Masa berlaku MoU/MoA'], ['promosi', 'Promosi sekolah']] : [['promosi', 'Promosi sekolah']];
      if (!modes.some((m) => m[0] === f.mode)) f.mode = modes[0][0];
      const t = UI.todayStr();
      if (f.y === null) { f.y = +t.slice(0, 4); f.m = +t.slice(5, 7) - 1; }
      const ym = f.y + '-' + pad(f.m + 1);
      if (!f.sel || f.sel.slice(0, 7) !== ym) f.sel = t.slice(0, 7) === ym ? t : null;

      const all = this.events(f.mode);
      const byDate = {};
      all.forEach((e) => { (byDate[e.date] = byDate[e.date] || []).push(e); });
      const monthEvs = all.filter((e) => e.date.slice(0, 7) === ym).sort((a, b) => a.date.localeCompare(b.date));
      if (!f.sel && monthEvs.length) f.sel = monthEvs[0].date;

      const first = new Date(f.y, f.m, 1);
      const lead = (first.getDay() + 6) % 7;
      const dim = new Date(f.y, f.m + 1, 0).getDate();
      const cells = [];
      for (let i = 0; i < Math.ceil((lead + dim) / 7) * 7; i++) {
        const d = new Date(f.y, f.m, 1 - lead + i);
        cells.push({ ds: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), day: d.getDate(), out: d.getMonth() !== f.m, wk: d.getDay() === 0 });
      }
      const evCls = (e) => (UI.color(e.status).match(/--([\w-]+)/) || [])[1] || '';
      const showKS = f.mode !== 'promosi', showPR = f.mode !== 'ks';
      const legend = (showKS ? ST_KS.map((s) => [s === 'Kadaluarsa' ? 'Kadaluarsa' : 'Berakhir: ' + s, s]) : []).concat(showPR ? ST_PR.map((s) => ['Promosi ' + s.toLowerCase(), s]) : []);
      const selEvs = f.sel ? (byDate[f.sel] || []) : [];

      el.innerHTML = `
        ${DATA.head({
          eyebrow: icon('calendar-days', 14) + ' Kalender terpadu',
          title: 'Kalender Kegiatan & Tenggat',
          lead: canKS ? 'Tanggal berakhirnya MoU/MoA dan jadwal promosi sekolah, otomatis dari data yang diinput.' : 'Jadwal promosi sekolah, otomatis dari data yang diinput.',
          actions: DATA.can('promosi', 'w') ? `<button type="button" class="btn btn-primary" id="cal-add">${icon('plus', 18)} Jadwalkan promosi</button>` : ''
        })}
        <div class="card filter-card cal-toolbar">
          ${modes.length > 1 ? `<div class="seg" id="cal-mode">${modes.map(([v, l]) => `<button type="button" data-mode="${v}" class="${f.mode === v ? 'on' : ''}">${l} <span class="cnt">${this.events(v).filter((e) => e.date.slice(0, 7) === ym).length}</span></button>`).join('')}</div>` : ''}
          <div class="cal-filters">
            ${showKS ? DATA.select('cal-jm', 'Semua jenis mitra', STATE.options.jenisMitra, f.jenisMitra) : ''}
            ${showPR ? DATA.select('cal-st', 'Semua status promosi', ST_PR, f.status) : ''}
          </div>
          <div class="cal-nav">
            <button type="button" class="icon-btn" data-nav="-1" aria-label="Bulan sebelumnya">${icon('chevron-left')}</button>
            <h2 class="cal-month">${UI.BULAN[f.m]} ${f.y}</h2>
            <button type="button" class="icon-btn" data-nav="1" aria-label="Bulan berikutnya">${icon('chevron-right')}</button>
            <button type="button" class="btn btn-outline btn-sm" data-nav="0">Hari ini</button>
          </div>
        </div>
        <div class="cal-wrap">
          <section class="card cal">
            <div class="cal-dow">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d, i) => `<span class="${i === 6 ? 'wk' : ''}">${d}</span>`).join('')}</div>
            <div class="cal-grid">${cells.map((c) => {
              const evs = byDate[c.ds] || [];
              return `<button type="button" class="cal-cell ${c.out ? 'out' : ''} ${c.ds === t ? 'today' : ''} ${c.ds === f.sel ? 'sel' : ''} ${c.wk ? 'wk' : ''} ${evs.length ? 'has' : ''}" data-date="${c.ds}" aria-label="${c.day} ${UI.BULAN[+c.ds.slice(5, 7) - 1]}: ${evs.length} agenda" aria-pressed="${c.ds === f.sel}">
                <span class="cal-num">${c.day}</span>
                <span class="cal-evs">${evs.slice(0, 2).map((e) => `<span class="cal-ev ev-${evCls(e)}">${e.type === 'ks' ? icon('handshake', 11) : icon('megaphone', 11)}<span class="ev-t">${esc(e.title)}</span></span>`).join('')}${evs.length > 2 ? `<span class="cal-more">+${evs.length - 2} lagi</span>` : ''}</span>
                <span class="cal-dots">${evs.slice(0, 4).map((e) => `<i style="background:${UI.color(e.status)}"></i>`).join('')}</span>
              </button>`;
            }).join('')}</div>
            <div class="cal-legend">${legend.map(([l, s]) => `<span><i style="background:${UI.color(s)}"></i>${esc(l)}</span>`).join('')}</div>
          </section>
          <aside class="card cal-side">
            <div class="card-head"><div><div class="eyebrow">Agenda terpilih</div><h2 class="card-title">${f.sel ? UI.tgl(f.sel, true) : 'Pilih tanggal'}</h2></div>${selEvs.length ? `<span class="chip">${selEvs.length} agenda</span>` : ''}</div>
            ${f.sel ? (selEvs.length ? `<ul class="agenda">${selEvs.map((e) => `<li><button type="button" class="ag-item" data-ev="${e.type}:${esc(e.id)}" style="--accent:${UI.color(e.status)}">
                <span class="ag-kind">${esc(e.kind)}</span><span class="t-strong">${esc(e.title)}</span><span class="t-sub">${esc(e.sub)}</span>
                <span class="ag-foot">${UI.badge(e.status)}${e.type === 'ks' ? `<span class="t-sub">${esc(UI.sisaTeks(e.date).replace(/ \(.*\)/, ''))}</span>` : ''}</span></button></li>`).join('')}</ul>`
              : `<div class="mini-empty">${icon('calendar', 20)}<span>Tidak ada agenda pada tanggal ini.</span></div>`) : `<div class="mini-empty">${icon('calendar', 20)}<span>Ketuk tanggal untuk melihat agendanya.</span></div>`}
            <div class="month-sum"><div class="eyebrow">Ringkasan ${UI.BULAN[f.m]}</div>
              ${monthEvs.length ? `<ul>${(showKS ? [['ks', 'Tenggat MoU/MoA']] : []).concat(showPR ? [['promosi', 'Kegiatan promosi']] : []).map(([k, l]) => `<li><span>${l}</span><b>${monthEvs.filter((e) => e.type === k).length}</b></li>`).join('')}</ul>` : '<p class="t-sub">Tidak ada agenda bulan ini.</p>'}
            </div>
          </aside>
        </div>`;

      const rr = () => this.render(el);
      UI.$('#cal-add', el) && (UI.$('#cal-add', el).onclick = () => FORMS.promosiForm(null, f.sel && f.sel >= t ? { Tanggal_Rencana: f.sel } : {}));
      UI.$('#cal-mode', el) && (UI.$('#cal-mode', el).onclick = (e) => { const b = e.target.closest('[data-mode]'); if (b) { f.mode = b.dataset.mode; f.sel = null; rr(); } });
      UI.$('#cal-jm', el) && (UI.$('#cal-jm', el).onchange = (e) => { f.jenisMitra = e.target.value; rr(); });
      UI.$('#cal-st', el) && (UI.$('#cal-st', el).onchange = (e) => { f.status = e.target.value; rr(); });
      UI.$$('[data-nav]', el).forEach((b) => {
        b.onclick = () => {
          const n = +b.dataset.nav;
          if (!n) { f.y = +t.slice(0, 4); f.m = +t.slice(5, 7) - 1; f.sel = t; }
          else { const d = new Date(f.y, f.m + n, 1); f.y = d.getFullYear(); f.m = d.getMonth(); f.sel = null; }
          rr();
        };
      });
      UI.$('.cal-grid', el).onclick = (e) => {
        const c = e.target.closest('[data-date]'); if (!c) return;
        const ds = c.dataset.date;
        if (ds.slice(0, 7) !== ym) { f.y = +ds.slice(0, 4); f.m = +ds.slice(5, 7) - 1; }
        f.sel = ds;
        rr();
        if (window.innerWidth < 1024) { const side = UI.$('.cal-side', el); side && side.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      };
      UI.$('.cal-side', el).onclick = (e) => {
        const b = e.target.closest('[data-ev]'); if (!b) return;
        const [type, id] = b.dataset.ev.split(':');
        type === 'ks' ? FORMS.ksDetail(id) : FORMS.promosiDetail(id);
      };
    }
  };

  // =========================================================================
  // LAPORAN (F11)
  // =========================================================================
  const REPORTS = [
    { id: 'aktif', title: 'Rekap kerja sama aktif', desc: 'MoU/MoA yang masih berlaku: Aktif, Akan Berakhir, dan Segera Berakhir.', icon: 'handshake', accent: 'var(--primary)', tag: 'Rekap', filters: ['jenisMitra', 'tahun'] },
    { id: 'berakhir', title: 'Kerja sama akan & sudah berakhir', desc: 'Daftar prioritas perpanjangan atau penutupan kerja sama.', icon: 'triangle-alert', accent: 'var(--st-segera)', tag: 'Prioritas', filters: ['jenisMitra', 'statusBerakhir'] },
    { id: 'promosi', title: 'Rekap kegiatan promosi', desc: 'Kunjungan promosi sekolah pada periode tertentu.', icon: 'megaphone', accent: 'var(--pr-terlaksana)', tag: 'Promosi', filters: ['dari', 'sampai', 'statusPromosi'] },
    { id: 'belumIA', title: 'Kerja sama belum memiliki IA', desc: 'MoU/MoA yang belum punya Implementation Agreement.', icon: 'file-check', accent: 'var(--pr-rencana)', tag: 'IA', filters: ['jenisMitra', 'kadaluarsa'] }
  ];

  const laporan = {
    title: 'Laporan',
    previewCount(id, f) {
      if (id === 'promosi') return STATE.promosi.filter((r) => (!f.dari || r._tgl >= f.dari) && (!f.sampai || r._tgl <= f.sampai) && (!f.status || r.Status === f.status)).length;
      return STATE.ks.filter((r) => {
        if (f.jenisMitra && r.Jenis_Mitra !== f.jenisMitra) return false;
        if (f.tahun && String(r.Tahun) !== String(f.tahun)) return false;
        if (id === 'aktif') return r.Status_Masa !== 'Kadaluarsa';
        if (id === 'berakhir') return r.Status_Masa !== 'Aktif' && (!f.status || r.Status_Masa === f.status);
        return !r._ia && (f.termasukKadaluarsa || r.Status_Masa !== 'Kadaluarsa');
      }).length;
    },
    render(el) {
      const tahun = [...new Set(STATE.ks.map((r) => String(r.Tahun)).filter(Boolean))].sort().reverse();
      const t = UI.todayStr();
      const awalTahun = t.slice(0, 4) + '-01-01';
      const ctl = {
        jenisMitra: (id) => `<div class="field sm"><label for="${id}-jm">Jenis mitra</label>${DATA.select(id + '-jm', 'Semua jenis mitra', STATE.options.jenisMitra, '').replace('<select', '<select data-k="jenisMitra"')}</div>`,
        tahun: (id) => `<div class="field sm"><label for="${id}-th">Tahun mulai</label>${DATA.select(id + '-th', 'Semua tahun', tahun, '').replace('<select', '<select data-k="tahun"')}</div>`,
        statusBerakhir: (id) => `<div class="field sm"><label for="${id}-st">Status</label>${DATA.select(id + '-st', 'Akan, segera & sudah berakhir', ['Akan Berakhir', 'Segera Berakhir', 'Kadaluarsa'], '').replace('<select', '<select data-k="status"')}</div>`,
        statusPromosi: (id) => `<div class="field sm"><label for="${id}-st">Status</label>${DATA.select(id + '-st', 'Semua status', ST_PR, '').replace('<select', '<select data-k="status"')}</div>`,
        dari: (id) => `<div class="field sm"><label for="${id}-dari">Dari tanggal</label><input type="date" class="input" id="${id}-dari" data-k="dari" value="${awalTahun}"></div>`,
        sampai: (id) => `<div class="field sm"><label for="${id}-sampai">Sampai tanggal</label><input type="date" class="input" id="${id}-sampai" data-k="sampai" value="${t}"></div>`,
        kadaluarsa: (id) => `<div class="field sm"><label class="toggle sm"><input type="checkbox" data-k="termasukKadaluarsa"><span class="tg"></span><span><b>Sertakan yang kadaluarsa</b></span></label></div>`
      };
      el.innerHTML = `
        ${DATA.head({
          eyebrow: icon('file-text', 14) + ' Laporan & arsip',
          title: 'Laporan PDF',
          lead: 'Pilih filter lalu cetak. PDF langsung terunduh dan otomatis tersimpan di folder Laporan Google Drive.',
          actions: `<button type="button" class="btn btn-outline" id="lap-up">${icon('upload', 18)} Unggah laporan</button><input type="file" id="lap-file" accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg" hidden>`
        })}
        <div class="grid g-2 rep-grid">${REPORTS.map((r) => `<section class="card rep" data-rep="${r.id}" style="--accent:${r.accent}">
          <div class="rep-head"><span class="rep-ic">${icon(r.icon, 20)}</span><div><h2 class="card-title">${esc(r.title)}</h2><p class="card-sub">${esc(r.desc)}</p></div><span class="chip">${r.tag}</span></div>
          <div class="rep-filters">${r.filters.map((k) => ctl[k](r.id)).join('')}</div>
          <div class="rep-foot"><span class="rep-count" aria-live="polite"></span><button type="button" class="btn btn-navy" data-gen>${icon('printer', 16)} Cetak PDF</button></div>
        </section>`).join('')}</div>
        <section class="card" id="arsip">
          <div class="card-head"><div><h2 class="card-title">${icon('folder-open', 18)} Arsip laporan</h2><p class="card-sub">Isi folder SIMPEKA / Laporan di Google Drive</p></div>
            <button type="button" class="btn btn-ghost btn-sm" id="lap-ref">${icon('refresh-cw', 15)} Muat ulang</button></div>
          <div id="arsip-list"><div class="sk-list">${'<div class="sk"></div>'.repeat(3)}</div></div>
        </section>`;

      const readF = (card) => {
        const f = {};
        UI.$$('[data-k]', card).forEach((i) => { f[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value; });
        return f;
      };
      UI.$$('.rep', el).forEach((card) => {
        const id = card.dataset.rep;
        const upd = () => {
          const n = this.previewCount(id, readF(card));
          UI.$('.rep-count', card).innerHTML = `<b>${n}</b> ${id === 'promosi' ? 'kegiatan' : 'kerja sama'} akan dicetak`;
        };
        UI.$$('[data-k]', card).forEach((i) => i.addEventListener('change', upd));
        upd();
        UI.$('[data-gen]', card).onclick = async () => {
          const f = readF(card);
          if (f.dari && f.sampai && f.sampai < f.dari) return UI.toast('Tanggal "sampai" tidak boleh sebelum "dari".', 'error');
          UI.loading(true, 'Menyusun laporan PDF…');
          try {
            const r = await API.call('laporan.generate', { jenis: id, filter: f });
            UI.downloadB64(r);
            UI.toast('Laporan diunduh dan disimpan di Drive • ' + r.jumlah + ' baris');
            this.loadArsip(el, true);
          } catch (e) { UI.toast(e.message, 'error'); }
          finally { UI.loading(false); }
        };
      });

      const fileIn = UI.$('#lap-file', el);
      UI.$('#lap-up', el).onclick = () => fileIn.click();
      fileIn.onchange = async () => {
        const file = fileIn.files[0]; fileIn.value = '';
        if (!file) return;
        if (!/\.(pdf|jpe?g)$/i.test(file.name)) return UI.toast('Format harus PDF atau JPG.', 'error');
        if (file.size > STATE.options.maksMB * 1048576) return UI.toast('Ukuran melebihi ' + STATE.options.maksMB + ' MB.', 'error');
        UI.loading(true, 'Mengunggah ' + file.name + '…');
        try {
          await API.call('laporan.upload', { namaBerkas: file.name, mimeType: /\.pdf$/i.test(file.name) ? 'application/pdf' : 'image/jpeg', base64: await UI.fileToBase64(file) });
          UI.toast('Laporan diunggah ke folder Laporan');
          this.loadArsip(el, true);
        } catch (e) { UI.toast(e.message, 'error'); }
        finally { UI.loading(false); }
      };
      UI.$('#lap-ref', el).onclick = () => this.loadArsip(el, true);
      UI.$('#arsip-list', el).onclick = async (e) => {
        const b = e.target.closest('[data-file]'); if (!b) return;
        UI.loading(true, 'Mengambil berkas…');
        try {
          const f = await API.call('laporan.get', { fileId: b.dataset.file });
          b.dataset.mode === 'dl' ? UI.downloadB64(f) : UI.viewFile(f);
        } catch (err) { UI.toast(err.message, 'error'); }
        finally { UI.loading(false); }
      };
      this.loadArsip(el, false);
    },
    async loadArsip(el, force) {
      const box = UI.$('#arsip-list', el);
      if (!box) return;
      if (force || !STATE.laporan) {
        if (force) box.innerHTML = `<div class="sk-list">${'<div class="sk"></div>'.repeat(3)}</div>`;
        try { STATE.laporan = await API.call('laporan.list'); }
        catch (e) { box.innerHTML = `<div class="note warn">${icon('triangle-alert', 16)}<span>${esc(e.message)}</span></div>`; return; }
      }
      if (!document.body.contains(box)) return;
      const files = STATE.laporan;
      box.innerHTML = files.length ? `<ul class="file-list">${files.map((f) => `<li>
          <span class="file-ic ${/pdf/.test(f.mimeType) ? 'pdf' : ''}">${icon(/pdf/.test(f.mimeType) ? 'file-text' : 'file', 18)}</span>
          <span class="file-main"><span class="t-strong clamp1">${esc(f.nama)}</span><span class="t-sub">${UI.tgl(f.dibuat)} ${esc(f.dibuat.slice(11))} • ${UI.fmtSize(f.ukuran)}${/^Unggahan_/.test(f.nama) ? ' • unggahan' : ''}</span></span>
          <button type="button" class="icon-btn sm" data-file="${esc(f.id)}" data-mode="view" title="Lihat" aria-label="Lihat ${esc(f.nama)}">${icon('eye', 17)}</button>
          <button type="button" class="icon-btn sm" data-file="${esc(f.id)}" data-mode="dl" title="Unduh" aria-label="Unduh ${esc(f.nama)}">${icon('download', 17)}</button></li>`).join('')}</ul>`
        : UI.empty('Arsip masih kosong', 'Laporan yang dicetak atau diunggah akan muncul di sini.');
    }
  };

  // =========================================================================
  // PENGGUNA (F12)
  // =========================================================================
  const pengguna = {
    title: 'Pengguna',
    render(el) {
      const users = STATE.pengguna;
      const f = STATE.f.users;
      const roleCard = (p, ic, col) => {
        const n = count(users, (u) => u.Peran === p && u.Status === 'Aktif');
        return `<div class="card role-card" style="--accent:${col}"><div class="rc-top"><span class="rep-ic">${icon(ic, 20)}</span><span class="chip">${n} aktif</span></div>
          <h3>${DATA.PERAN_LABEL[p]}</h3><p class="card-sub">${{ Admin: 'Akses penuh: lihat, tambah, ubah, hapus data, kelola pengguna.', WD_IV: 'Lihat, tambah, dan ubah seluruh data serta cetak laporan. Tanpa hak hapus.', Tim_Promosi: 'Hanya melihat dashboard, daftar, dan kalender promosi.' }[p]}</p></div>`;
      };
      el.innerHTML = `
        ${DATA.head({
          eyebrow: icon('shield-check', 14) + ' Hak akses',
          title: 'Manajemen Pengguna',
          lead: 'Hanya akun yang terdaftar di sini yang dapat masuk ke SIMPEKA. Setiap akun baru mendapat kata sandi sementara yang wajib diganti saat pertama masuk.',
          actions: `<button type="button" class="btn btn-primary" id="u-add">${icon('plus', 18)} Tambah pengguna</button>`
        })}
        <div class="grid g-3">${roleCard('Admin', 'shield-check', 'var(--primary)')}${roleCard('WD_IV', 'user-round', 'var(--c2)')}${roleCard('Tim_Promosi', 'megaphone', 'var(--pr-rencana)')}</div>
        <div class="card filter-card"><div class="filters"><label class="search">${icon('search', 18)}<input id="u-q" type="search" placeholder="Cari nama atau email…" value="${esc(f.q)}" aria-label="Cari pengguna"></label></div></div>
        <section class="card list-card" id="u-res"></section>
        <div class="note">${icon('info', 16)}<span>Perubahan peran atau status berlaku seketika. Pengguna yang lupa kata sandi: tekan ikon kunci untuk mereset. Akun yang salah kata sandi 5 kali terkunci 15 menit; reset juga membuka kunci itu.</span></div>`;
      const res = UI.$('#u-res', el);
      const go = () => this.results(res);
      UI.$('#u-add', el).onclick = () => FORMS.userForm();
      UI.$('#u-q', el).oninput = UI.debounce((e) => { f.q = e.target.value.trim(); go(); }, 150);
      res.onclick = async (e) => {
        const row = e.target.closest('[data-email]'); if (!row) return;
        const email = row.dataset.email, act = e.target.closest('[data-act]');
        if (!act || act.dataset.act === 'edit') return FORMS.userForm(email);
        if (act.dataset.act === 'reset') return FORMS.resetSandi(email);
        if (act.dataset.act === 'toggle') {
          const u = users.find((x) => x.Email === email);
          const next = u.Status === 'Aktif' ? 'Nonaktif' : 'Aktif';
          if (next === 'Nonaktif' && !(await UI.confirmDlg({ title: 'Nonaktifkan ' + u.Nama + '?', message: esc(email) + ' tidak dapat masuk lagi sampai diaktifkan kembali.', okText: 'Nonaktifkan', danger: true }))) return;
          UI.loading(true, 'Menyimpan…');
          try {
            const res = await API.call('pengguna.save', { Email: u.Email, EmailLama: email, Nama: u.Nama, Peran: u.Peran, Status: next });
            Object.assign(u, res.pengguna);
            UI.toast(u.Nama + (next === 'Aktif' ? ' diaktifkan' : ' dinonaktifkan'));
            this.render(el);
          } catch (err) { UI.toast(err.message, 'error'); }
          finally { UI.loading(false); }
        }
        if (act.dataset.act === 'del') {
          if (!(await UI.confirmDlg({ title: 'Hapus pengguna?', message: esc(email) + ' akan dihapus dari daftar akses.', okText: 'Hapus', danger: true }))) return;
          UI.loading(true, 'Menghapus…');
          try {
            await API.call('pengguna.delete', { Email: email });
            STATE.pengguna = users.filter((x) => x.Email !== email);
            UI.toast('Pengguna dihapus');
            this.render(el);
          } catch (err) { UI.toast(err.message, 'error'); }
          finally { UI.loading(false); }
        }
      };
      go();
    },
    results(res) {
      const f = STATE.f.users;
      const order = { Admin: 0, WD_IV: 1, Tim_Promosi: 2 };
      const rows = STATE.pengguna.filter((u) => !f.q || DATA.matchQ(f.q, [u.Nama, u.Email]))
        .sort((a, b) => (a.Status === b.Status ? 0 : a.Status === 'Aktif' ? -1 : 1) || order[a.Peran] - order[b.Peran] || String(a.Nama).localeCompare(String(b.Nama), 'id'));
      if (!rows.length) { res.innerHTML = UI.empty('Tidak ditemukan', 'Coba kata kunci lain.'); return; }
      const me = STATE.user.email;
      const roleChip = (p) => `<span class="chip ${p === 'Admin' ? 'chip-blue' : p === 'WD_IV' ? 'chip-navy' : 'chip-violet'}">${DATA.PERAN_LABEL[p] || esc(p)}</span>`;
      const st = (u) => u.Status === 'Aktif' ? `<span class="badge st-aktif">${icon('circle-check', 13)}Aktif</span>` : `<span class="badge st-kadaluarsa">${icon('circle-x', 13)}Nonaktif</span>`;
      const sandi = (u) => u.Terkunci ? `<span class="chip chip-red">${icon('lock', 12)} Terkunci</span>`
        : !u.Punya_Sandi ? '<span class="chip chip-warn">Belum ada sandi</span>'
        : u.Wajib_Ganti ? '<span class="chip chip-warn">Sandi sementara</span>' : '<span class="chip chip-green">Sudah diganti</span>';
      const acts = (u) => u.Email === me ? '<span class="chip chip-blue">Anda</span>' : `<span class="row-acts">
        <button type="button" class="icon-btn sm" data-act="edit" title="Ubah" aria-label="Ubah">${icon('pencil', 17)}</button>
        <button type="button" class="icon-btn sm" data-act="reset" title="Reset kata sandi" aria-label="Reset kata sandi">${icon('key-round', 17)}</button>
        <button type="button" class="icon-btn sm" data-act="toggle" title="${u.Status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}" aria-label="${u.Status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}">${icon(u.Status === 'Aktif' ? 'lock' : 'check', 17)}</button>
        <button type="button" class="icon-btn sm danger" data-act="del" title="Hapus" aria-label="Hapus">${icon('trash-2', 17)}</button></span>`;
      res.innerHTML = `
        <div class="list-head"><h2 class="card-title">Daftar pengguna terdaftar</h2><span class="chip">${rows.length} akun</span></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Pengguna</th><th>Peran</th><th>Status</th><th>Kata sandi</th><th>Login terakhir</th><th class="ta-r">Aksi</th></tr></thead>
          <tbody>${rows.map((u) => `<tr data-email="${esc(u.Email)}" class="row-click ${u.Status !== 'Aktif' ? 'is-off' : ''}" tabindex="0">
            <td><div class="user-cell"><span class="avatar">${esc(UI.initials(u.Nama))}</span><span><span class="t-strong">${esc(u.Nama)}</span><span class="t-sub">${esc(u.Email)}</span></span></div></td>
            <td>${roleChip(u.Peran)}</td><td>${st(u)}</td><td>${sandi(u)}</td>
            <td class="nowrap t-sub">${u.Login_Terakhir ? UI.tgl(u.Login_Terakhir) + '<br>' + esc(u.Login_Terakhir.slice(11)) + ' WIB' : 'Belum pernah'}</td><td class="ta-r">${acts(u)}</td></tr>`).join('')}</tbody>
        </table></div>
        <ul class="mlist">${rows.map((u) => `<li class="mcard ${u.Status !== 'Aktif' ? 'is-off' : ''}" data-email="${esc(u.Email)}" style="--accent:${u.Status === 'Aktif' ? 'var(--st-aktif)' : 'var(--st-kadaluarsa)'}">
          <div class="mcard-top"><span class="avatar">${esc(UI.initials(u.Nama))}</span><div class="mcard-title"><span class="t-strong">${esc(u.Nama)}</span><span class="t-sub">${esc(u.Email)}</span></div>${st(u)}</div>
          <div class="mcard-foot"><span class="chips">${roleChip(u.Peran)}${sandi(u)}</span>${acts(u)}</div></li>`).join('')}</ul>`;
    }
  };

  return { dashboard, kerjasama, ia, promosi, kalender, laporan, pengguna };
})();
