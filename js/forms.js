/**
 * FORMS — panel detail dan formulir (drawer geser kanan) untuk
 * Kerja Sama, IA, Promosi, dan Pengguna.
 */
const FORMS = (() => {
  const { esc, icon } = UI;

  function dl(rows) {
    return `<dl class="dl">${rows.filter(Boolean).map((r) => `<div class="dl-row"><dt>${esc(r[0])}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>`;
  }
  function trail(r) {
    return `<div class="trail">${icon('info', 14)}<span>Dibuat oleh ${esc(r.Dibuat_Oleh || '-')} • ${esc(r.Dibuat_Pada || '-')}<br>Terakhir diubah ${esc(r.Diubah_Oleh || '-')} • ${esc(r.Diubah_Pada || '-')}</span></div>`;
  }
  const footBtns = (formId, label) => `<button type="button" class="btn btn-outline" data-close-form>Batal</button><span class="spacer"></span><button type="submit" form="${formId}" class="btn btn-primary">${icon('check', 16)} ${esc(label || 'Simpan')}</button>`;
  const berkasBtn = (ada) => ada ? `<button type="button" class="link-btn" data-act="berkas">${icon('eye', 15)} Lihat berkas</button>` : '<span class="muted">Belum diunggah</span>';

  /** Validasi sederhana: rules = [[name, pesan, fungsiTes]] */
  function validate(form, rules) {
    let first = null;
    rules.forEach(([name, msg, test]) => {
      const bad = !test();
      UI.fieldError(form, name, bad ? msg : '');
      if (bad && !first) first = name;
    });
    if (first) {
      const el = form.querySelector('[name="' + first + '"]');
      if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (el.focus) el.focus({ preventScroll: true }); }
      return false;
    }
    return true;
  }

  function bindClose(el) {
    UI.$$('[data-close-form]', el).forEach((b) => { b.onclick = UI.closeDrawer; });
  }

  // =========================================================================
  // KERJA SAMA
  // =========================================================================
  function ksDetail(id) {
    const r = DATA.byId('ks', id);
    if (!r) return UI.toast('Data tidak ditemukan.', 'error');
    const ias = STATE.ia.filter((x) => x.ID_Kerja_Sama === id);
    const body = `
      <div class="detail-hero" style="--accent:${UI.color(r.Status_Masa)}">
        <div class="dh-top">${DATA.chipMoU(r.Jenis_MoU)}<span class="chip">${esc(r.Jenis_Mitra)}</span></div>
        <h3>${esc(r.Mitra)}</h3>
        <p>${esc(r.Judul_Kerja_Sama)}</p>
        <div class="dh-status">${UI.badge(r.Status_Masa)}<span class="muted">${esc(UI.sisaTeks(r.Akhir))}</span></div>
      </div>
      ${dl([
        ['Nomor registrasi', `<span class="mono">${esc(r.ID_Kerja_Sama)}</span>`],
        ['Mulai berlaku', UI.tgl(r.Awal, true)],
        ['Berakhir', `<b>${UI.tgl(r.Akhir, true)}</b>`],
        ['Tahun', esc(r.Tahun)],
        ['Berkas MoU/MoA', berkasBtn(r.Link_Bukti)]
      ])}
      <div class="sub-head"><h4>Implementation Agreement (${ias.length})</h4>${DATA.can('ia', 'w') ? `<button type="button" class="btn btn-outline btn-sm" data-act="add-ia">${icon('plus', 15)} Tambah IA</button>` : ''}</div>
      ${ias.length ? `<ul class="mini-list">${ias.map((i) => `<li><button type="button" data-ia="${esc(i.ID_IA)}">
          <span><span class="mono muted">${esc(i.ID_IA)} • ${UI.tgl(i.Tanggal_IA)}</span><span class="t-strong">${esc(i.Nama_Kegiatan)}</span></span>
          ${i.Ceklis_IA === 'Sudah' ? '<span class="chip chip-green">Lengkap</span>' : '<span class="chip chip-warn">Belum lengkap</span>'}</button></li>`).join('')}</ul>`
        : `<div class="note warn">${icon('triangle-alert', 16)}<span>Belum ada IA untuk kerja sama ini. Setiap kegiatan wajib memiliki IA.</span></div>`}
      ${trail(r)}`;
    const footer = (DATA.can('ks', 'd') ? `<button type="button" class="btn btn-ghost danger" data-act="del">${icon('trash-2', 16)} Hapus</button>` : '') +
      '<span class="spacer"></span>' +
      (DATA.can('ks', 'w') ? `<button type="button" class="btn btn-primary" data-act="edit">${icon('pencil', 16)} Ubah data</button>` : '');
    UI.openDrawer({
      title: 'Detail Kerja Sama', subtitle: r.ID_Kerja_Sama, icon: 'handshake', body: body, footer: footer,
      onMount(el) {
        el.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-act],[data-ia]');
          if (!b) return;
          if (b.dataset.ia) return iaDetail(b.dataset.ia);
          const a = b.dataset.act;
          if (a === 'berkas') DATA.berkas('ks', id);
          if (a === 'edit') ksForm(id);
          if (a === 'add-ia') iaForm(null, { ID_Kerja_Sama: id });
          if (a === 'del' && await DATA.del('ks', id)) { UI.closeDrawer(); APP.refreshView(); }
        });
      }
    });
  }

  function ksForm(id) {
    const r = id ? DATA.byId('ks', id) : { Jenis_MoU: 'MoU' };
    const o = STATE.options;
    const body = `<form class="form" id="f-ks" novalidate>
      <div class="id-box"><span>Nomor registrasi</span><b class="mono">${id ? esc(id) : 'Otomatis (KS-xxxx)'}</b></div>
      <div class="field"><label>Jenis dokumen <span class="req">*</span></label>
        <div class="radio-cards">${[['MoU', 'Nota kesepahaman (payung)'], ['MoA', 'Perjanjian kerja sama (teknis)']].map(([v, d]) =>
          `<label class="rc"><input type="radio" name="Jenis_MoU" value="${v}" ${r.Jenis_MoU === v ? 'checked' : ''}><span><b>${v}</b><small>${d}</small></span></label>`).join('')}</div></div>
      <div class="field"><label for="ks-mitra">Nama mitra <span class="req">*</span></label>
        <input class="input" id="ks-mitra" name="Mitra" maxlength="200" value="${esc(r.Mitra)}" placeholder="Contoh: PT Hutama Karya (Persero)" autocomplete="off"></div>
      <div class="field"><label for="ks-judul">Judul kerja sama <span class="req">*</span></label>
        <textarea class="input" id="ks-judul" name="Judul_Kerja_Sama" rows="3" maxlength="500" placeholder="Ruang lingkup, mis. magang industri dan dosen tamu Teknik Sipil">${esc(r.Judul_Kerja_Sama)}</textarea></div>
      <div class="field"><label for="ksf-jm">Jenis mitra <span class="req">*</span></label>${DATA.selectNamed('Jenis_Mitra', 'ksf-jm', 'Pilih jenis mitra', o.jenisMitra, r.Jenis_Mitra)}</div>
      <div class="row2">
        <div class="field"><label for="ks-awal">Tanggal mulai <span class="req">*</span></label><input type="date" class="input" id="ks-awal" name="Awal" value="${esc(r.Awal)}"></div>
        <div class="field"><label for="ks-akhir">Tanggal berakhir <span class="req">*</span></label><input type="date" class="input" id="ks-akhir" name="Akhir" value="${esc(r.Akhir)}"></div>
      </div>
      <div class="status-preview" id="ks-prev" aria-live="polite"></div>
      ${UI.fileField('ks-file', { label: 'Berkas MoU/MoA', ada: !!r.Link_Bukti, maksMB: o.maksMB, namaOtomatis: (id || 'KS-xxxx') + '_NamaMitra_Tahun.pdf' })}
    </form>`;
    UI.openDrawer({
      title: id ? 'Ubah Kerja Sama' : 'Tambah Kerja Sama', subtitle: 'Formulir MoU/MoA FTSP', icon: id ? 'pencil' : 'file-plus-2',
      body: body, footer: footBtns('f-ks', id ? 'Simpan perubahan' : 'Simpan kerja sama'),
      onMount(el) {
        bindClose(el);
        const form = UI.$('#f-ks', el);
        const getFile = UI.bindFileField(el, 'ks-file', o.maksMB);
        const prev = UI.$('#ks-prev', el);
        const upd = () => {
          const akhir = form.Akhir.value;
          if (!akhir) { prev.innerHTML = `${icon('info', 15)} Status masa berlaku dihitung otomatis dari tanggal berakhir.`; return; }
          const st = UI.statusMasa(akhir, o.ambang);
          prev.innerHTML = `Status otomatis: ${UI.badge(st)} <span class="muted">${esc(UI.sisaTeks(akhir))}</span>`;
        };
        form.Akhir.addEventListener('input', upd);
        upd();
        form.onsubmit = async (e) => {
          e.preventDefault();
          const d = UI.formData(form);
          const ok = validate(form, [
            ['Jenis_MoU', 'Pilih MoU atau MoA.', () => !!d.Jenis_MoU],
            ['Mitra', 'Nama mitra wajib diisi.', () => !!d.Mitra],
            ['Judul_Kerja_Sama', 'Judul kerja sama wajib diisi.', () => !!d.Judul_Kerja_Sama],
            ['Jenis_Mitra', 'Pilih jenis mitra.', () => !!d.Jenis_Mitra],
            ['Awal', 'Tanggal mulai wajib diisi.', () => !!d.Awal],
            ['Akhir', 'Tanggal berakhir wajib diisi dan tidak boleh sebelum tanggal mulai.', () => !!d.Akhir && (!d.Awal || d.Akhir >= d.Awal)]
          ]);
          if (!ok) return;
          if (id) d.ID_Kerja_Sama = id;
          try {
            const rec = await DATA.save('ks', d, getFile());
            UI.closeDrawer();
            APP.refreshView();
            if (!id && rec && DATA.can('ia', 'w')) offerIA(rec);
          } catch (err) { UI.toast(err.message, 'error'); }
        };
      }
    });
  }

  /** Setelah kerja sama baru tersimpan, tawarkan langsung mencatat IA-nya. */
  async function offerIA(rec) {
    const ya = await UI.confirmDlg({
      title: 'Catat IA sekarang?',
      message: esc(rec.ID_Kerja_Sama + ' — ' + rec.Mitra) + ' belum memiliki IA. Setiap kegiatan wajib memiliki IA.',
      okText: 'Tambah IA'
    });
    if (ya) iaForm(null, { ID_Kerja_Sama: rec.ID_Kerja_Sama });
  }

  // =========================================================================
  // IMPLEMENTATION AGREEMENT
  // =========================================================================
  function iaDetail(id) {
    const r = DATA.byId('ia', id);
    if (!r) return UI.toast('Data tidak ditemukan.', 'error');
    const ks = r.ID_Kerja_Sama ? DATA.byId('ks', r.ID_Kerja_Sama) : null;
    const body = `
      <div class="detail-hero" style="--accent:${r.Ceklis_IA === 'Sudah' ? 'var(--st-aktif)' : 'var(--st-akan)'}">
        <div class="dh-top">${ks ? `<span class="chip chip-blue">${icon('link', 13)} ${esc(ks.ID_Kerja_Sama)}</span>` : `<span class="chip chip-violet">IA mandiri</span>`}
          ${r.Ceklis_IA === 'Sudah' ? '<span class="chip chip-green">Berkas lengkap</span>' : '<span class="chip chip-warn">Belum lengkap</span>'}</div>
        <h3>${esc(r.Nama_Kegiatan)}</h3><p>${esc(r.Mitra)}</p>
      </div>
      ${dl([
        ['Nomor registrasi', `<span class="mono">${esc(r.ID_IA)}</span>`],
        ['Tanggal IA', UI.tgl(r.Tanggal_IA, true)],
        ['MoU/MoA induk', ks ? `<button type="button" class="link-btn" data-act="ks">${esc(ks.ID_Kerja_Sama)} • ${esc(ks.Jenis_MoU)} ${esc(ks.Mitra)}</button>` : '<span class="muted">Berdiri sendiri (tanpa MoU/MoA)</span>'],
        ks ? ['Status induk', UI.badge(ks.Status_Masa)] : null,
        ['Berkas IA', berkasBtn(r.Link_Berkas)]
      ])}
      ${trail(r)}`;
    const footer = (DATA.can('ia', 'd') ? `<button type="button" class="btn btn-ghost danger" data-act="del">${icon('trash-2', 16)} Hapus</button>` : '') +
      '<span class="spacer"></span>' + (DATA.can('ia', 'w') ? `<button type="button" class="btn btn-primary" data-act="edit">${icon('pencil', 16)} Ubah data</button>` : '');
    UI.openDrawer({
      title: 'Detail IA', subtitle: r.ID_IA, icon: 'file-check', body: body, footer: footer,
      onMount(el) {
        el.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-act]');
          if (!b) return;
          const a = b.dataset.act;
          if (a === 'berkas') DATA.berkas('ia', id);
          if (a === 'ks') ksDetail(r.ID_Kerja_Sama);
          if (a === 'edit') iaForm(id);
          if (a === 'del' && await DATA.del('ia', id)) { UI.closeDrawer(); APP.refreshView(); }
        });
      }
    });
  }

  function iaForm(id, preset) {
    const r = id ? DATA.byId('ia', id) : Object.assign({ Ceklis_IA: 'Belum' }, preset || {});
    const o = STATE.options;
    const rel = r.ID_Kerja_Sama ? 'link' : (id ? 'mandiri' : 'link');
    const ksOpts = STATE.ks.slice().sort((a, b) => a.Mitra.localeCompare(b.Mitra, 'id')).map((k) => ({
      value: k.ID_Kerja_Sama,
      label: k.ID_Kerja_Sama + ' — ' + k.Mitra + ' (' + k.Jenis_MoU + ')' + (k.Status_Masa === 'Kadaluarsa' ? ' • kadaluarsa' : '')
    }));
    const body = `<form class="form" id="f-ia" novalidate>
      <div class="id-box"><span>Nomor registrasi</span><b class="mono">${id ? esc(id) : 'Otomatis (IA-xxxx)'}</b></div>
      <div class="field"><label>Hubungan kerja sama <span class="req">*</span></label>
        <div class="radio-cards">
          <label class="rc"><input type="radio" name="_rel" value="link" ${rel === 'link' ? 'checked' : ''}><span><b>Terhubung MoU/MoA</b><small>Turunan dari kerja sama resmi</small></span></label>
          <label class="rc"><input type="radio" name="_rel" value="mandiri" ${rel === 'mandiri' ? 'checked' : ''}><span><b>IA mandiri</b><small>Kegiatan tanpa MoU/MoA</small></span></label>
        </div></div>
      <div class="field" id="ia-ks-field"><label for="ia-ks">MoU/MoA induk <span class="req">*</span></label>
        ${DATA.selectNamed('ID_Kerja_Sama', 'ia-ks', 'Pilih MoU/MoA', ksOpts, r.ID_Kerja_Sama)}
        ${ksOpts.length ? '' : '<p class="hint">Belum ada data kerja sama. Pilih "IA mandiri" atau tambahkan kerja sama terlebih dahulu.</p>'}</div>
      <div class="field"><label for="ia-mitra">Mitra <span class="req">*</span></label>
        <input class="input" id="ia-mitra" name="Mitra" maxlength="200" value="${esc(r.Mitra)}" placeholder="Nama mitra kegiatan" autocomplete="off">
        <p class="hint" id="ia-mitra-hint" hidden>Terisi otomatis dari MoU/MoA yang dipilih.</p></div>
      <div class="field"><label for="ia-keg">Nama kegiatan <span class="req">*</span></label>
        <textarea class="input" id="ia-keg" name="Nama_Kegiatan" rows="2" maxlength="300" placeholder="Contoh: Kuliah tamu perancangan struktur jembatan">${esc(r.Nama_Kegiatan)}</textarea></div>
      <div class="field"><label for="ia-tgl">Tanggal IA <span class="req">*</span></label><input type="date" class="input" id="ia-tgl" name="Tanggal_IA" value="${esc(r.Tanggal_IA)}"></div>
      <div class="field"><label class="toggle"><input type="checkbox" name="_lengkap" ${r.Ceklis_IA === 'Sudah' ? 'checked' : ''}><span class="tg"></span><span><b>Berkas IA sudah lengkap</b><small>Centang bila dokumen IA dan lampirannya sudah lengkap</small></span></label></div>
      ${UI.fileField('ia-file', { label: 'Berkas IA', ada: !!r.Link_Berkas, maksMB: o.maksMB })}
    </form>`;
    UI.openDrawer({
      title: id ? 'Ubah IA' : 'Rekam IA Baru', subtitle: 'Implementation Agreement', icon: id ? 'pencil' : 'file-plus-2',
      body: body, footer: footBtns('f-ia', id ? 'Simpan perubahan' : 'Simpan IA'),
      onMount(el) {
        bindClose(el);
        const form = UI.$('#f-ia', el);
        const getFile = UI.bindFileField(el, 'ia-file', o.maksMB);
        const ksField = UI.$('#ia-ks-field', el), hint = UI.$('#ia-mitra-hint', el);
        const sync = () => {
          const linked = form.querySelector('[name="_rel"]:checked').value === 'link';
          ksField.hidden = !linked;
          form.Mitra.readOnly = linked;
          hint.hidden = !linked;
          if (linked) {
            const k = DATA.byId('ks', form.ID_Kerja_Sama.value);
            form.Mitra.value = k ? k.Mitra : '';
          }
        };
        UI.$$('[name="_rel"]', form).forEach((x) => x.addEventListener('change', sync));
        form.ID_Kerja_Sama.addEventListener('change', sync);
        sync();
        form.onsubmit = async (e) => {
          e.preventDefault();
          const d = UI.formData(form);
          const linked = d._rel === 'link';
          const ok = validate(form, [
            ['ID_Kerja_Sama', 'Pilih MoU/MoA induk.', () => !linked || !!d.ID_Kerja_Sama],
            ['Mitra', 'Nama mitra wajib diisi.', () => linked || !!d.Mitra],
            ['Nama_Kegiatan', 'Nama kegiatan wajib diisi.', () => !!d.Nama_Kegiatan],
            ['Tanggal_IA', 'Tanggal IA wajib diisi.', () => !!d.Tanggal_IA]
          ]);
          if (!ok) return;
          const data = {
            ID_IA: id || '', ID_Kerja_Sama: linked ? d.ID_Kerja_Sama : '', Mitra: d.Mitra,
            Nama_Kegiatan: d.Nama_Kegiatan, Tanggal_IA: d.Tanggal_IA, Ceklis_IA: d._lengkap ? 'Sudah' : 'Belum'
          };
          try { await DATA.save('ia', data, getFile()); UI.closeDrawer(); APP.refreshView(); }
          catch (err) { UI.toast(err.message, 'error'); }
        };
      }
    });
  }

  // =========================================================================
  // PROMOSI
  // =========================================================================
  function promosiDetail(id) {
    const r = DATA.byId('promosi', id);
    if (!r) return UI.toast('Data tidak ditemukan.', 'error');
    const body = `
      <div class="detail-hero" style="--accent:${UI.color(r.Status)}">
        <div class="dh-top">${UI.badge(r.Status)}</div>
        <h3>${esc(r.Nama_Sekolah)}</h3><p>${icon('map-pin', 14)} ${esc(r.Kota_Alamat || '-')}</p>
      </div>
      ${dl([
        ['Nomor registrasi', `<span class="mono">${esc(r.ID_Promosi)}</span>`],
        ['PIC', esc(r.PIC || '-')],
        ['Tanggal rencana', UI.tgl(r.Tanggal_Rencana, true)],
        ['Tanggal realisasi', r.Tanggal_Realisasi ? UI.tgl(r.Tanggal_Realisasi, true) : '<span class="muted">-</span>'],
        ['Bukti kegiatan', berkasBtn(r.Link_Bukti)]
      ])}
      ${trail(r)}`;
    const footer = (DATA.can('promosi', 'd') ? `<button type="button" class="btn btn-ghost danger" data-act="del">${icon('trash-2', 16)} Hapus</button>` : '') +
      '<span class="spacer"></span>' + (DATA.can('promosi', 'w') ? `<button type="button" class="btn btn-primary" data-act="edit">${icon('pencil', 16)} Ubah data</button>` : '');
    UI.openDrawer({
      title: 'Detail Promosi', subtitle: r.ID_Promosi, icon: 'megaphone', body: body,
      footer: DATA.can('promosi', 'w') || DATA.can('promosi', 'd') ? footer : null,
      onMount(el) {
        el.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-act]');
          if (!b) return;
          const a = b.dataset.act;
          if (a === 'berkas') DATA.berkas('promosi', id);
          if (a === 'edit') promosiForm(id);
          if (a === 'del' && await DATA.del('promosi', id)) { UI.closeDrawer(); APP.refreshView(); }
        });
      }
    });
  }

  function promosiForm(id, preset) {
    const r = id ? DATA.byId('promosi', id) : Object.assign({ Status: 'Rencana' }, preset || {});
    const o = STATE.options;
    const body = `<form class="form" id="f-pr" novalidate>
      <div class="id-box"><span>Nomor registrasi</span><b class="mono">${id ? esc(id) : 'Otomatis (PR-xxxx)'}</b></div>
      <div class="field"><label for="pr-sek">Nama sekolah <span class="req">*</span></label>
        <input class="input" id="pr-sek" name="Nama_Sekolah" maxlength="200" value="${esc(r.Nama_Sekolah)}" placeholder="Contoh: SMA Negeri 8 Jakarta" autocomplete="off"></div>
      <div class="field"><label for="pr-kota">Kota / alamat</label>
        <input class="input" id="pr-kota" name="Kota_Alamat" maxlength="300" value="${esc(r.Kota_Alamat)}" placeholder="Contoh: Bukit Duri, Jakarta Selatan"></div>
      <div class="field"><label for="pr-pic">PIC (penanggung jawab)</label>
        <input class="input" id="pr-pic" name="PIC" maxlength="200" value="${esc(r.PIC)}" placeholder="Nama dosen atau anggota tim"></div>
      <div class="field"><label>Status <span class="req">*</span></label>
        <div class="seg seg-form">${o.statusPromosi.map((s) => `<label><input type="radio" name="Status" value="${s}" ${r.Status === s ? 'checked' : ''}><span>${s}</span></label>`).join('')}</div></div>
      <div class="row2">
        <div class="field"><label for="pr-ren">Tanggal rencana <span class="req">*</span></label><input type="date" class="input" id="pr-ren" name="Tanggal_Rencana" value="${esc(r.Tanggal_Rencana)}"></div>
        <div class="field"><label for="pr-real">Tanggal realisasi</label><input type="date" class="input" id="pr-real" name="Tanggal_Realisasi" value="${esc(r.Tanggal_Realisasi)}"></div>
      </div>
      <p class="hint" id="pr-hint"></p>
      ${UI.fileField('pr-file', { label: 'Bukti kegiatan (foto/berita acara)', ada: !!r.Link_Bukti, maksMB: o.maksMB })}
    </form>`;
    UI.openDrawer({
      title: id ? 'Ubah Promosi' : 'Jadwalkan Promosi', subtitle: 'Kunjungan promosi sekolah', icon: id ? 'pencil' : 'megaphone',
      body: body, footer: footBtns('f-pr', id ? 'Simpan perubahan' : 'Simpan jadwal'),
      onMount(el) {
        bindClose(el);
        const form = UI.$('#f-pr', el);
        const getFile = UI.bindFileField(el, 'pr-file', o.maksMB);
        const hint = UI.$('#pr-hint', el);
        const upd = () => {
          const st = form.querySelector('[name="Status"]:checked').value;
          hint.textContent = st === 'Terlaksana' ? 'Isi tanggal realisasi bila berbeda dari rencana, lalu unggah bukti kegiatan.' :
            st === 'Batal' ? 'Kegiatan batal tetap tercatat di kalender dengan warna abu-abu.' : 'Kegiatan akan muncul di kalender promosi pada tanggal rencana.';
        };
        UI.$$('[name="Status"]', form).forEach((x) => x.addEventListener('change', upd));
        upd();
        form.onsubmit = async (e) => {
          e.preventDefault();
          const d = UI.formData(form);
          const ok = validate(form, [
            ['Nama_Sekolah', 'Nama sekolah wajib diisi.', () => !!d.Nama_Sekolah],
            ['Tanggal_Rencana', 'Tanggal rencana wajib diisi.', () => !!d.Tanggal_Rencana]
          ]);
          if (!ok) return;
          if (id) d.ID_Promosi = id;
          try { await DATA.save('promosi', d, getFile()); UI.closeDrawer(); APP.refreshView(); }
          catch (err) { UI.toast(err.message, 'error'); }
        };
      }
    });
  }

  // =========================================================================
  // PENGGUNA
  // =========================================================================
  const PERAN_DESC = {
    Admin: 'Akses penuh, termasuk hapus data dan kelola pengguna',
    WD_IV: 'Lihat, tambah, dan ubah semua data; tanpa hak hapus',
    Tim_Promosi: 'Hanya melihat data dan kalender promosi'
  };

  /** Tampilkan kata sandi sementara sekali saja, dengan tombol salin. */
  function showSandi(u, sandi, terkirim, jenis) {
    const m = UI.openModal(`
      <div class="modal-body center">
        <div class="modal-ic">${icon('key-round', 24)}</div>
        <h3>${jenis === 'reset' ? 'Kata sandi direset' : 'Pengguna ditambahkan'}</h3>
        <p>Kata sandi sementara untuk <b>${esc(u.Nama)}</b><br><span class="muted">${esc(u.Email)}</span></p>
        <div class="temp-pw"><code id="tp-val">${esc(sandi)}</code><button type="button" class="btn btn-outline btn-sm" id="tp-copy">${icon('copy', 15)} Salin</button></div>
        <div class="note ${terkirim ? '' : 'warn'} left">${icon(terkirim ? 'mail' : 'triangle-alert', 16)}<span>${terkirim
          ? 'Sudah dikirim ke email pengguna. Minta pengguna memeriksa folder Spam bila belum masuk.'
          : 'Belum dikirim lewat email. Sampaikan langsung kepada pengguna, misalnya lewat WhatsApp.'}</span></div>
        <p class="sm muted">Pengguna wajib menggantinya saat pertama masuk. Kata sandi ini <b>tidak dapat ditampilkan lagi</b> setelah jendela ini ditutup.</p>
      </div>
      <div class="modal-foot"><button type="button" class="btn btn-primary" data-mclose>Selesai</button></div>`, 'modal-sm');
    UI.$('#tp-copy', m).onclick = async () => {
      try { await navigator.clipboard.writeText(sandi); UI.toast('Kata sandi disalin'); }
      catch (e) { const r = document.createRange(); r.selectNodeContents(UI.$('#tp-val', m)); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
    };
  }

  function userForm(email) {
    const r = email ? (STATE.pengguna || []).find((u) => u.Email === email) : { Peran: 'Tim_Promosi', Status: 'Aktif' };
    const self = email && email === STATE.user.email;
    const body = `<form class="form" id="f-user" novalidate>
      ${self ? `<div class="note">${icon('info', 16)}<span>Ini akun Anda sendiri. Email, peran, dan status tidak dapat diubah dari akun sendiri. Untuk kata sandi, gunakan menu akun → Ganti kata sandi.</span></div>` : ''}
      <div class="field"><label for="u-email">Email <span class="req">*</span></label>
        <input class="input" type="email" id="u-email" name="Email" value="${esc(r.Email)}" placeholder="nama@trisakti.ac.id atau nama@gmail.com" ${self ? 'readonly' : ''} autocomplete="off">
        <p class="hint">Dipakai untuk masuk dan menerima email dari SIMPEKA.</p></div>
      <div class="field"><label for="u-nama">Nama lengkap <span class="req">*</span></label>
        <input class="input" id="u-nama" name="Nama" maxlength="150" value="${esc(r.Nama)}" placeholder="Nama dan gelar"></div>
      <div class="field"><label>Peran <span class="req">*</span></label>
        <div class="radio-cards col">${STATE.options.peran.map((p) => `<label class="rc"><input type="radio" name="Peran" value="${p}" ${r.Peran === p ? 'checked' : ''} ${self ? 'disabled' : ''}><span><b>${DATA.PERAN_LABEL[p]}</b><small>${PERAN_DESC[p]}</small></span></label>`).join('')}</div></div>
      <div class="field"><label class="toggle"><input type="checkbox" name="_aktif" ${r.Status !== 'Nonaktif' ? 'checked' : ''} ${self ? 'disabled' : ''}><span class="tg"></span><span><b>Akun aktif</b><small>Akun nonaktif langsung kehilangan akses</small></span></label></div>
      ${email ? '' : `<div class="field"><label class="toggle"><input type="checkbox" name="_kirim" checked><span class="tg"></span><span><b>Kirim kata sandi sementara ke email ini</b><small>Kata sandi juga ditampilkan sekali setelah disimpan</small></span></label></div>`}
    </form>`;
    UI.openDrawer({
      title: email ? 'Ubah Pengguna' : 'Tambah Pengguna', subtitle: 'Daftar akun yang boleh masuk', icon: 'users',
      body: body, footer: footBtns('f-user', email ? 'Simpan perubahan' : 'Tambah pengguna'),
      onMount(el) {
        bindClose(el);
        const form = UI.$('#f-user', el);
        form.onsubmit = async (e) => {
          e.preventDefault();
          const d = UI.formData(form);
          const peran = self ? r.Peran : d.Peran;
          const ok = validate(form, [
            ['Email', 'Masukkan email yang valid.', () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.Email)],
            ['Nama', 'Nama wajib diisi.', () => !!d.Nama],
            ['Peran', 'Pilih peran.', () => !!peran]
          ]);
          if (!ok) return;
          UI.loading(true, email ? 'Menyimpan pengguna…' : 'Membuat akun' + (d._kirim ? ' dan mengirim email…' : '…'));
          try {
            const res = await API.call('pengguna.save', {
              Email: d.Email.toLowerCase(), EmailLama: email || '', Nama: d.Nama, Peran: peran,
              Status: self ? 'Aktif' : (d._aktif ? 'Aktif' : 'Nonaktif'), kirimEmail: !!d._kirim
            });
            const rec = res.pengguna;
            const arr = STATE.pengguna;
            const i = arr.findIndex((u) => u.Email === (email || rec.Email));
            if (i >= 0) arr[i] = rec; else arr.push(rec);
            UI.closeDrawer();
            APP.refreshView();
            if (res.sandiSementara) showSandi(rec, res.sandiSementara, res.emailTerkirim, 'baru');
            else UI.toast('Pengguna diperbarui');
          } catch (err) { UI.toast(err.message, 'error'); }
          finally { UI.loading(false); }
        };
      }
    });
  }

  /** Admin mereset kata sandi pengguna lain. */
  async function resetSandi(email) {
    const u = (STATE.pengguna || []).find((x) => x.Email === email);
    const m = UI.openModal(`
      <div class="modal-body center">
        <div class="modal-ic">${icon('key-round', 24)}</div>
        <h3>Reset kata sandi ${esc(u.Nama)}?</h3>
        <p>Kata sandi lama langsung tidak berlaku, pengguna keluar dari semua perangkat, dan kunci akun (bila ada) dibuka.</p>
        <label class="toggle left" style="margin-top:14px"><input type="checkbox" id="rs-mail" checked><span class="tg"></span><span><b>Kirim kata sandi sementara ke ${esc(email)}</b></span></label>
      </div>
      <div class="modal-foot"><button type="button" class="btn btn-outline" data-mclose>Batal</button><button type="button" class="btn btn-primary" id="rs-go">Reset kata sandi</button></div>`, 'modal-sm');
    UI.$('#rs-go', m).onclick = async () => {
      const kirim = UI.$('#rs-mail', m).checked;
      UI.closeModal();
      UI.loading(true, 'Mereset kata sandi…');
      try {
        const res = await API.call('pengguna.resetSandi', { Email: email, kirimEmail: kirim });
        Object.assign(u, res.pengguna);
        APP.refreshView();
        showSandi(res.pengguna, res.sandiSementara, res.emailTerkirim, 'reset');
      } catch (err) { UI.toast(err.message, 'error'); }
      finally { UI.loading(false); }
    };
  }

  return { ksDetail, ksForm, iaDetail, iaForm, promosiDetail, promosiForm, userForm, resetSandi };
})();
