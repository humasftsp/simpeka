/**
 * FORMS — helper formulir bersama, serta panel detail & formulir Promosi
 * dan Pengguna. Dokumen MoU/MoA/IA dan Mitra ada di docs.js.
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
    if (!form._liveClear) {
      // Pesan galat hilang begitu kolomnya diperbaiki (tidak menunggu tombol simpan).
      const clear = (e) => {
        const f = e.target.closest && e.target.closest('.field.invalid');
        if (!f) return;
        f.classList.remove('invalid');
        const er = f.querySelector('.err'); if (er) er.hidden = true;
      };
      form.addEventListener('input', clear); form.addEventListener('change', clear);
      form._liveClear = true;
    }
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
  // PROMOSI
  // =========================================================================
  const jenisLabel = (r) => r.Jenis_Kegiatan ? (r.Jenis_Kegiatan === 'Lainnya' ? 'Lainnya — ' + (r.Keterangan_Jenis || '') : r.Jenis_Kegiatan) : '';

  function promosiDetail(id) {
    const r = DATA.byId('promosi', id);
    if (!r) return UI.toast('Data tidak ditemukan.', 'error');
    const o = STATE.options;
    const kurang = r.Status === 'Terlaksana' && r._ptg.length < o.petugasMin;
    const ptgList = r._ptg.length ? `<ul class="ptg-list">${r._ptg.map((p) => `<li><span class="avatar sm">${esc(UI.initials(p.Nama_Petugas))}</span>
        <span class="t-main"><b>${esc(p.Nama_Petugas)}</b>${p.Keterangan ? `<small>${esc(p.Keterangan)}</small>` : ''}</span>${DATA.katChip(p.Kategori)}</li>`).join('')}</ul>`
      : '<span class="muted">Belum ada petugas</span>';
    const body = `
      <div class="detail-hero" style="--accent:${UI.color(r.Status)}">
        <div class="dh-top">${UI.badge(r.Status)}${DATA.jenisChip(r)}</div>
        <h3>${esc(r.Nama_Sekolah)}</h3><p>${icon('map-pin', 14)} ${esc(r.Kota_Alamat || '-')}</p>
      </div>
      ${kurang ? `<div class="note warn">${icon('triangle-alert', 16)}<span>Kegiatan sudah Terlaksana tetapi petugasnya baru ${r._ptg.length}. Lengkapi menjadi ${o.petugasMin}–${o.petugasMax} orang.</span></div>` : ''}
      ${!r.Jenis_Kegiatan ? `<div class="note warn">${icon('info', 16)}<span>Jenis kegiatan belum diisi (data lama). Tekan <b>Ubah data</b> untuk melengkapinya.</span></div>` : ''}
      ${dl([
        ['Nomor registrasi', `<span class="mono">${esc(r.ID_Promosi)}</span>`],
        ['Jenis kegiatan', r.Jenis_Kegiatan ? esc(jenisLabel(r)) : '<span class="muted">Belum diisi</span>'],
        ['Tanggal rencana', UI.tgl(r.Tanggal_Rencana, true)],
        ['Tanggal realisasi', r.Tanggal_Realisasi ? UI.tgl(r.Tanggal_Realisasi, true) : '<span class="muted">-</span>'],
        ['Petugas (' + r._ptg.length + ')', ptgList],
        ['Catatan', r.Catatan ? `<span class="pre">${esc(r.Catatan)}</span>` : '<span class="muted">-</span>'],
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
    // daftar petugas terpilih: { id } untuk yang terdaftar, { baru: true, Nama_Petugas, Kategori } untuk yang belum
    const sel = (r._ptg || []).map((p) => ({ id: p.ID_Petugas }));
    const body = `<form class="form" id="f-pr" novalidate>
      <div class="id-box"><span>Nomor registrasi</span><b class="mono">${id ? esc(id) : 'Otomatis (PR-xxxx)'}</b></div>
      <div class="field"><label for="pr-sek">Nama sekolah <span class="req">*</span></label>
        <input class="input" id="pr-sek" name="Nama_Sekolah" maxlength="200" value="${esc(r.Nama_Sekolah)}" placeholder="Contoh: SMA Negeri 8 Jakarta" autocomplete="off"></div>
      <div class="field"><label for="pr-kota">Kota / alamat</label>
        <input class="input" id="pr-kota" name="Kota_Alamat" maxlength="300" value="${esc(r.Kota_Alamat)}" placeholder="Contoh: Bukit Duri, Jakarta Selatan"></div>
      <div class="field"><label>Jenis kegiatan <span class="req">*</span></label>
        <div class="seg seg-form">${o.jenisKegiatan.map((j) => `<label><input type="radio" name="Jenis_Kegiatan" value="${esc(j)}" ${r.Jenis_Kegiatan === j ? 'checked' : ''}><span>${esc(j)}</span></label>`).join('')}</div></div>
      <div class="field" id="pr-ket-f" hidden><label for="pr-ket">Keterangan jenis kegiatan <span class="req">*</span></label>
        <input class="input" id="pr-ket" name="Keterangan_Jenis" maxlength="200" value="${esc(r.Keterangan_Jenis)}" placeholder="Contoh: Webinar untuk siswa SMA, kunjungan sekolah ke kampus"></div>
      <div class="field"><label>Status <span class="req">*</span></label>
        <div class="seg seg-form">${o.statusPromosi.map((st) => `<label><input type="radio" name="Status" value="${st}" ${r.Status === st ? 'checked' : ''}><span>${st}</span></label>`).join('')}</div></div>
      <div class="row2">
        <div class="field"><label for="pr-ren">Tanggal rencana <span class="req">*</span></label><input type="date" class="input" id="pr-ren" name="Tanggal_Rencana" value="${esc(r.Tanggal_Rencana)}"></div>
        <div class="field"><label for="pr-real">Tanggal realisasi</label><input type="date" class="input" id="pr-real" name="Tanggal_Realisasi" value="${esc(r.Tanggal_Realisasi)}"></div>
      </div>
      <p class="hint" id="pr-hint"></p>
      <div class="form-sec">Petugas <small id="pr-ptg-rule"></small></div>
      <div class="field" id="pr-ptg-f"><input type="hidden" name="_petugas"><div id="pr-ptg"></div></div>
      <div class="field"><label for="pr-cat">Catatan</label>
        <textarea class="input" id="pr-cat" name="Catatan" rows="3" maxlength="1000" placeholder="Contoh: peserta ±120 siswa kelas XII; diundang Guru BK; dijadwalkan ulang karena ujian">${esc(r.Catatan)}</textarea></div>
      ${UI.fileField('pr-file', { label: 'Bukti kegiatan (foto/berita acara)', ada: !!r.Link_Bukti, maksMB: o.maksMB })}
    </form>`;
    UI.openDrawer({
      title: id ? 'Ubah Promosi' : 'Jadwalkan Promosi', subtitle: 'Kegiatan promosi sekolah', icon: id ? 'pencil' : 'megaphone',
      body: body, footer: footBtns('f-pr', id ? 'Simpan perubahan' : 'Simpan jadwal'),
      onMount(el) {
        bindClose(el);
        const form = UI.$('#f-pr', el);
        const getFile = UI.bindFileField(el, 'pr-file', o.maksMB);
        const hint = UI.$('#pr-hint', el);
        const box = UI.$('#pr-ptg', el);
        const status = () => { const x = form.querySelector('[name="Status"]:checked'); return x ? x.value : ''; };
        const jenis = () => { const x = form.querySelector('[name="Jenis_Kegiatan"]:checked'); return x ? x.value : ''; };
        const nama = (x) => x.baru ? x.Nama_Petugas : (DATA.byId('petugas', x.id) || {}).Nama_Petugas || x.id;
        const kat = (x) => x.baru ? x.Kategori : (DATA.byId('petugas', x.id) || {}).Kategori || '';
        let tambahBaru = false;

        function drawPetugas() {
          const pilihan = STATE.petugas.filter((p) => p.Status !== 'Nonaktif' && !sel.some((x) => x.id === p.ID_Petugas))
            .sort((a, b) => a.Nama_Petugas.localeCompare(b.Nama_Petugas, 'id'))
            .map((p) => ({ value: p.ID_Petugas, label: p.Nama_Petugas + ' — ' + p.Kategori }));
          const penuh = sel.length >= o.petugasMax;
          box.innerHTML = `
            ${sel.length ? `<ul class="ptg-pick">${sel.map((x, i) => `<li><span class="num">${i + 1}</span><span class="t-main"><b>${esc(nama(x))}</b>${x.baru ? '<small>petugas baru — didaftarkan saat disimpan</small>' : ''}</span>
              ${DATA.katChip(kat(x))}<button type="button" class="icon-btn sm" data-rm="${i}" aria-label="Hapus ${esc(nama(x))} dari daftar">${icon('x', 16)}</button></li>`).join('')}</ul>`
              : `<div class="mini-empty">${icon('users', 18)}<span>Belum ada petugas dipilih.</span></div>`}
            <div class="ptg-count"><b>${sel.length}</b> / ${o.petugasMax} petugas</div>
            ${penuh ? '' : tambahBaru ? `
              <div class="subform">
                <div class="subform-head"><b>Petugas baru</b><button type="button" class="link-btn" id="pb-batal">Batal, pilih dari daftar</button></div>
                <div class="field"><label for="pb-nama">Nama lengkap <span class="req">*</span></label><input class="input" id="pb-nama" maxlength="150" placeholder="Contoh: Ir. Budi Santoso, M.T."></div>
                <div class="field"><label>Kategori <span class="req">*</span></label><div class="seg seg-form">${o.kategoriPetugas.map((k) => `<label><input type="radio" name="pb-kat" value="${k}"><span>${k}</span></label>`).join('')}</div></div>
                <button type="button" class="btn btn-outline btn-sm" id="pb-ok">${icon('plus', 15)} Tambahkan ke kegiatan</button>
              </div>` : `
              <div class="ptg-add">
                ${pilihan.length ? DOCSUI.combo('_pilihPetugas', 'pr-pilih', 'Pilih petugas terdaftar', pilihan, '') : ''}
                <div class="ptg-add-act">${pilihan.length ? `<button type="button" class="btn btn-outline btn-sm" id="pr-pick-add">${icon('plus', 15)} Tambahkan</button>` : ''}
                <button type="button" class="link-btn sm-gap" id="pr-baru">${icon('plus', 14)} Petugas belum terdaftar? Tambah petugas baru</button></div>
              </div>`}`;
          DOCSUI.bindCombo(box);
          UI.$$('[data-rm]', box).forEach((b) => { b.onclick = () => { sel.splice(Number(b.dataset.rm), 1); drawPetugas(); }; });
          const add = UI.$('#pr-pick-add', box);
          if (add) add.onclick = () => {
            const v = UI.$('#pr-pilih', box).value;
            if (!v) return UI.toast('Pilih petugas dari daftar terlebih dahulu.', 'warn');
            sel.push({ id: v }); drawPetugas();
          };
          const bb = UI.$('#pr-baru', box); if (bb) bb.onclick = () => { tambahBaru = true; drawPetugas(); UI.$('#pb-nama', box).focus(); };
          const bt = UI.$('#pb-batal', box); if (bt) bt.onclick = () => { tambahBaru = false; drawPetugas(); };
          const ok = UI.$('#pb-ok', box);
          if (ok) ok.onclick = () => {
            const n = UI.$('#pb-nama', box).value.trim();
            const k = (box.querySelector('[name="pb-kat"]:checked') || {}).value;
            if (!n) return UI.toast('Isi nama petugas.', 'warn');
            if (!k) return UI.toast('Pilih kategori: Dosen, Tendik, atau Mahasiswa.', 'warn');
            const ada = STATE.petugas.filter((p) => p.Nama_Petugas.trim().toLowerCase() === n.toLowerCase())[0];
            if (ada) {
              if (sel.some((x) => x.id === ada.ID_Petugas)) return UI.toast(ada.Nama_Petugas + ' sudah ada di daftar.', 'warn');
              sel.push({ id: ada.ID_Petugas }); UI.toast(ada.Nama_Petugas + ' sudah terdaftar sebagai ' + ada.Kategori + ' — dipakai data yang ada.');
            } else if (sel.some((x) => x.baru && x.Nama_Petugas.toLowerCase() === n.toLowerCase())) {
              return UI.toast(n + ' sudah ada di daftar.', 'warn');
            } else sel.push({ baru: true, Nama_Petugas: n, Kategori: k });
            tambahBaru = false; drawPetugas();
          };
          rule();
        }
        function rule() {
          const wajib = status() === 'Terlaksana';
          UI.$('#pr-ptg-rule', el).textContent = wajib ? '(wajib ' + o.petugasMin + '–' + o.petugasMax + ' orang)' : '(boleh dilengkapi nanti; wajib ' + o.petugasMin + '–' + o.petugasMax + ' orang saat Terlaksana)';
        }
        const upd = () => {
          const st = status();
          hint.textContent = st === 'Terlaksana' ? 'Isi tanggal realisasi bila berbeda dari rencana, catat ' + o.petugasMin + '–' + o.petugasMax + ' petugas, lalu unggah bukti kegiatan.' :
            st === 'Batal' ? 'Kegiatan batal tetap tercatat di kalender dengan warna abu-abu.' : 'Kegiatan akan muncul di kalender promosi pada tanggal rencana.';
          UI.$('#pr-ket-f', el).hidden = jenis() !== 'Lainnya';
          rule();
        };
        UI.$$('[name="Status"], [name="Jenis_Kegiatan"]', form).forEach((x) => x.addEventListener('change', upd));
        upd(); drawPetugas();

        form.onsubmit = async (e) => {
          e.preventDefault();
          const d = UI.formData(form);
          const okv = validate(form, [
            ['Nama_Sekolah', 'Nama sekolah wajib diisi.', () => !!d.Nama_Sekolah],
            ['Jenis_Kegiatan', 'Pilih jenis kegiatan.', () => !!jenis()],
            ['Keterangan_Jenis', 'Jelaskan jenis kegiatan "Lainnya".', () => jenis() !== 'Lainnya' || !!String(d.Keterangan_Jenis || '').trim()],
            ['Tanggal_Rencana', 'Tanggal rencana wajib diisi.', () => !!d.Tanggal_Rencana],
            ['_petugas', 'Kegiatan Terlaksana wajib mencatat ' + o.petugasMin + '–' + o.petugasMax + ' petugas (saat ini ' + sel.length + ').', () => status() !== 'Terlaksana' || sel.length >= o.petugasMin]
          ]);
          if (!okv) return;
          const data = {
            Nama_Sekolah: d.Nama_Sekolah, Kota_Alamat: d.Kota_Alamat, Jenis_Kegiatan: jenis(), Keterangan_Jenis: d.Keterangan_Jenis || '',
            Status: status(), Tanggal_Rencana: d.Tanggal_Rencana, Tanggal_Realisasi: d.Tanggal_Realisasi, Catatan: d.Catatan,
            ID_Petugas: sel.filter((x) => !x.baru).map((x) => x.id),
            petugasBaru: sel.filter((x) => x.baru).map((x) => ({ Nama_Petugas: x.Nama_Petugas, Kategori: x.Kategori }))
          };
          if (id) data.ID_Promosi = id;
          try { await DATA.save('promosi', data, getFile()); UI.closeDrawer(); APP.refreshView(); }
          catch (err) { UI.toast(err.message, 'error'); }
        };
      }
    });
  }

  // =========================================================================
  // MASTER PETUGAS
  // =========================================================================
  function petugasForm(id) {
    const r = id ? DATA.byId('petugas', id) : { Status: 'Aktif' };
    const o = STATE.options;
    const canD = id && DATA.can('promosi', 'd');
    const riwayat = id ? STATE.promosi.filter((p) => p._ptg.some((x) => x.ID_Petugas === id)).sort((a, b) => b._tgl.localeCompare(a._tgl)) : [];
    const body = `<form class="form" id="f-ptg" novalidate>
      <div class="id-box"><span>ID petugas</span><b class="mono">${id ? esc(id) : 'Otomatis (PTG-xxxx)'}</b></div>
      <div class="field"><label for="pt-nama">Nama lengkap <span class="req">*</span></label>
        <input class="input" id="pt-nama" name="Nama_Petugas" maxlength="150" value="${esc(r.Nama_Petugas)}" placeholder="Contoh: Ir. Budi Santoso, M.T." autocomplete="off"></div>
      <div class="field"><label>Kategori <span class="req">*</span></label>
        <div class="seg seg-form">${o.kategoriPetugas.map((k) => `<label><input type="radio" name="Kategori" value="${k}" ${r.Kategori === k ? 'checked' : ''}><span>${k}</span></label>`).join('')}</div></div>
      <div class="field"><label for="pt-ket">Keterangan</label>
        <input class="input" id="pt-ket" name="Keterangan" maxlength="200" value="${esc(r.Keterangan)}" placeholder="Contoh: Prodi Arsitektur / NIM 0521xxxx / Bagian Humas"></div>
      <div class="field"><label>Status</label>
        <div class="seg seg-form">${['Aktif', 'Nonaktif'].map((k) => `<label><input type="radio" name="Status" value="${k}" ${r.Status === k ? 'checked' : ''}><span>${k}</span></label>`).join('')}</div>
        <p class="hint">Petugas Nonaktif (mis. mahasiswa yang sudah lulus) tidak muncul lagi di pilihan, tetapi riwayat tugasnya tetap tersimpan.</p></div>
      ${id ? `<div class="form-sec">Riwayat tugas (${riwayat.length})</div>
        ${riwayat.length ? `<ul class="mini-list">${riwayat.slice(0, 12).map((p) => `<li><span class="mono sm">${esc(UI.tgl(p._tgl))}</span><span class="t-main">${esc(p.Nama_Sekolah)}</span>${UI.badge(p.Status)}</li>`).join('')}</ul>` : '<p class="muted">Belum pernah bertugas.</p>'}` : ''}
    </form>`;
    UI.openDrawer({
      title: id ? 'Ubah Petugas' : 'Tambah Petugas', subtitle: 'Master petugas promosi', icon: 'users', body: body,
      footer: (canD ? `<button type="button" class="btn btn-ghost danger" id="pt-del">${icon('trash-2', 16)} Hapus</button>` : '') + footBtns('f-ptg', 'Simpan petugas'),
      onMount(el) {
        bindClose(el);
        const form = UI.$('#f-ptg', el);
        const del = UI.$('#pt-del', el);
        if (del) del.onclick = async () => { if (await DATA.del('petugas', id, r.Nama_Petugas)) { UI.closeDrawer(); APP.refreshView(); } };
        form.onsubmit = async (e) => {
          e.preventDefault();
          const d = UI.formData(form);
          const k = (form.querySelector('[name="Kategori"]:checked') || {}).value;
          const ok = validate(form, [
            ['Nama_Petugas', 'Nama petugas wajib diisi.', () => !!String(d.Nama_Petugas || '').trim()],
            ['Kategori', 'Pilih kategori: Dosen, Tendik, atau Mahasiswa.', () => !!k]
          ]);
          if (!ok) return;
          const data = { Nama_Petugas: d.Nama_Petugas, Kategori: k, Keterangan: d.Keterangan, Status: (form.querySelector('[name="Status"]:checked') || {}).value || 'Aktif' };
          if (id) data.ID_Petugas = id;
          try {
            await DATA.save('petugas', data);
            UI.closeDrawer(); APP.refreshView();
          } catch (err) { UI.toast(err.message, 'error'); }
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

  return { dl, trail, footBtns, berkasBtn, validate, bindClose, promosiDetail, promosiForm, petugasForm, userForm, resetSandi };
})();
