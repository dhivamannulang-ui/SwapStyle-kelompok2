/* ============================================================
   SwapStyle — script.js
   Semua interaksi: modal, pembayaran, filter, AI recommender,
   ganti foto, lightbox, dan navigasi mobile.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- STATE ---------- */
  const state = {
    user: null, // { name, email }
    activeCategory: "semua",
    activeSort: "terbaru",
    activeSizes: new Set(),
    priceUnder100k: false,
  };

  /* ---------- HELPERS ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const formatRupiah = (n) => "Rp " + Number(n).toLocaleString("id-ID");

  /* ---------- TOAST ---------- */
  const toastContainer = $("#toastContainer");
  function showToast(message, type = "default", duration = 3200) {
    const el = document.createElement("div");
    el.className = "toast" + (type !== "default" ? " " + type : "");
    el.textContent = message;
    toastContainer.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 250);
    }, duration);
  }

  /* ---------- MODAL ---------- */
  const modalOverlay = $("#modalOverlay");
  const modalBox = $("#modalBox");
  const modalContent = $("#modalContent");
  const modalClose = $("#modalClose");

  function openModal(html, { wide = false } = {}) {
    modalContent.innerHTML = html;
    modalBox.classList.toggle("wide", wide);
    modalOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
    const firstInput = modalContent.querySelector("input, button.btn-primary");
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  }

  function closeModal() {
    modalOverlay.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(() => { modalContent.innerHTML = ""; }, 200);
  }

  modalClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeModal(); closeLightbox(); }
  });

  /* ---------- LIGHTBOX ---------- */
  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightboxImg");
  function openLightbox(src, alt) {
    if (!src) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.classList.add("open");
  }
  function closeLightbox() { lightbox.classList.remove("open"); }
  lightbox.addEventListener("click", closeLightbox);

  /* ---------- MODAL TEMPLATES ---------- */
  function tplDaftar() {
    return `
      <p class="modal-title">Buat Akun</p>
      <p class="modal-sub">Gabung dan mulai jual-beli fashion preloved dengan aman.</p>
      <form id="formDaftar">
        <div class="form-field">
          <label for="dName">Nama Lengkap</label>
          <input id="dName" type="text" placeholder="Nama kamu" required />
        </div>
        <div class="form-field">
          <label for="dEmail">Email Kampus</label>
          <input id="dEmail" type="email" placeholder="nama@kampus.ac.id" required />
        </div>
        <div class="form-field">
          <label for="dPass">Kata Sandi</label>
          <input id="dPass" type="password" placeholder="Minimal 8 karakter" minlength="8" required />
        </div>
        <button type="submit" class="btn-primary">Daftar Sekarang</button>
        <p class="form-note">Sudah punya akun? <a data-switch="masuk">Masuk di sini</a></p>
      </form>`;
  }

  function tplMasuk() {
    return `
      <p class="modal-title">Selamat Datang Kembali</p>
      <p class="modal-sub">Masuk untuk melanjutkan jual-beli kamu.</p>
      <form id="formMasuk">
        <div class="form-field">
          <label for="mEmail">Email</label>
          <input id="mEmail" type="email" placeholder="nama@kampus.ac.id" required />
        </div>
        <div class="form-field">
          <label for="mPass">Kata Sandi</label>
          <input id="mPass" type="password" placeholder="Kata sandi" required />
        </div>
        <button type="submit" class="btn-primary">Masuk</button>
        <p class="form-note">Belum punya akun? <a data-switch="daftar">Daftar di sini</a></p>
      </form>`;
  }

  function tplAI() {
    return `
      <p class="modal-title">🤖 AI Style Recommender</p>
      <p class="modal-sub">Ceritakan preferensi kamu, AI akan mencarikan item yang cocok.</p>
      <div class="form-field">
        <label>Kategori</label>
        <div class="choice-group" data-ai-group="kategori">
          <span class="choice-chip active" data-val="semua">Semua</span>
          <span class="choice-chip" data-val="kemeja">Kemeja</span>
          <span class="choice-chip" data-val="celana">Celana</span>
          <span class="choice-chip" data-val="jaket">Jaket</span>
        </div>
      </div>
      <div class="form-field">
        <label>Ukuran</label>
        <div class="choice-group" data-ai-group="ukuran">
          <span class="choice-chip active" data-val="semua">Semua</span>
          <span class="choice-chip" data-val="S">S</span>
          <span class="choice-chip" data-val="M">M</span>
          <span class="choice-chip" data-val="L">L</span>
          <span class="choice-chip" data-val="XL">XL</span>
        </div>
      </div>
      <div class="form-field">
        <label>Budget</label>
        <div class="choice-group" data-ai-group="budget">
          <span class="choice-chip active" data-val="semua">Semua</span>
          <span class="choice-chip" data-val="100k">&lt; Rp 100K</span>
          <span class="choice-chip" data-val="150k">Rp 100K–150K</span>
          <span class="choice-chip" data-val="atas">&gt; Rp 150K</span>
        </div>
      </div>
      <button class="btn-primary" id="aiSubmit">Cari Rekomendasi ✦</button>`;
  }

  function tplPaymentInfo(kind) {
    const data = {
      "bayar-dana": {
        title: "📱 Pembayaran DANA",
        desc: "Bayar langsung dari saldo DANA kamu dengan scan QR atau transfer ke nomor tujuan penjual. Dana masuk instan, tanpa biaya admin tambahan.",
      },
      "bayar-atm": {
        title: "🏧 Transfer ATM / Bank",
        desc: "Transfer manual ke rekening virtual account penjual lewat ATM, m-banking, atau teller. Konfirmasi otomatis setelah pembayaran terverifikasi.",
      },
      "bayar-aman": {
        title: "🔒 Pembayaran Terlindungi",
        desc: "Dana kamu ditahan sistem escrow SwapStyle dan baru diteruskan ke penjual setelah kamu mengonfirmasi barang diterima sesuai deskripsi.",
      },
    };
    const d = data[kind];
    return `
      <p class="modal-title">${d.title}</p>
      <p class="modal-sub">${d.desc}</p>
      <button class="btn-primary" data-action="close-modal">Mengerti</button>`;
  }

  function tplSimplePage(kind) {
    const data = {
      privasi: {
        title: "Kebijakan Privasi",
        body: "SwapStyle hanya mengumpulkan data yang diperlukan untuk transaksi (nama, email, dan riwayat pesanan). Data tidak pernah dijual ke pihak ketiga dan disimpan dengan enkripsi standar industri.",
      },
      syarat: {
        title: "Syarat & Ketentuan",
        body: "Dengan menggunakan SwapStyle, kamu setuju untuk mengunggah deskripsi barang yang jujur, menyelesaikan transaksi dengan itikad baik, dan mematuhi kebijakan escrow untuk perlindungan pembeli maupun penjual.",
      },
      kontak: {
        title: "Hubungi Kami",
        body: "Punya pertanyaan atau kendala transaksi? Email tim kami di halo@swapstyle.id atau chat lewat fitur Live Chat pada halaman produk.",
      },
    };
    const d = data[kind];
    return `<p class="modal-title">${d.title}</p><p class="modal-sub" style="margin-bottom:0">${d.body}</p>`;
  }

  function tplSeller(card) {
    const name = card.dataset.name;
    const rating = card.dataset.rating;
    const sold = card.dataset.sold;
    const active = card.dataset.active;
    const initials = name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
    return `
      <div style="text-align:center">
        <div class="seller-avatar" style="width:64px;height:64px;font-size:1.1rem;margin:0 auto 14px;">${initials}</div>
        <p class="modal-title" style="margin-bottom:4px;">${name} <span class="badge-verified" style="vertical-align:middle;">✓</span></p>
        <p class="modal-sub">Penjual Terverifikasi SwapStyle</p>
      </div>
      <div class="pay-summary">
        <div class="pay-summary-row"><span>Rating</span><span>⭐ ${rating} / 5.0</span></div>
        <div class="pay-summary-row"><span>Total Terjual</span><span>${sold} item</span></div>
        <div class="pay-summary-row" style="color:var(--text);font-family:var(--font-body);font-weight:500;"><span>Item Aktif</span><span>${active} item</span></div>
      </div>
      <button class="btn-primary" data-action="close-modal">Tutup</button>`;
  }

  function tplDetail(card) {
    const img = $(".photo-img", card);
    const size = card.dataset.size;
    return `
      <div class="detail-photo">
        <img src="${img && img.src ? img.src : ""}" alt="${card.dataset.name}" onerror="this.style.opacity=0" />
      </div>
      <p class="modal-title" style="margin-bottom:2px;">${card.dataset.name}</p>
      <div class="detail-price-row">
        <span class="detail-price">${card.dataset.pricelabel}</span>
        <span class="detail-cond">${card.dataset.cond}</span>
      </div>
      <p class="detail-desc">${card.dataset.desc}</p>
      <div class="form-field">
        <label>Pilih Ukuran</label>
        <div class="choice-group" data-detail-size>
          ${["S", "M", "L", "XL"].map((s) => `<span class="choice-chip${s === size ? " active" : ""}" data-val="${s}">${s}</span>`).join("")}
        </div>
      </div>
      <button class="btn-primary" data-action="beli-from-detail" data-name="${card.dataset.name}" data-price="${card.dataset.price}" data-pricelabel="${card.dataset.pricelabel}">Beli Sekarang</button>`;
  }

  function tplPaymentChoose(name, priceval, pricelabel) {
    return `
      <p class="modal-title">Pilih Metode Pembayaran</p>
      <p class="modal-sub">${name} · <strong style="color:var(--primary)">${pricelabel}</strong></p>
      <div class="pay-option" data-pay="DANA" data-name="${name}" data-priceval="${priceval}" data-pricelabel="${pricelabel}">
        <span class="pay-emoji">📱</span>
        <div><div class="pay-name">DANA</div><div class="pay-detail">Bayar instan lewat e-wallet</div></div>
      </div>
      <div class="pay-option" data-pay="ATM" data-name="${name}" data-priceval="${priceval}" data-pricelabel="${pricelabel}">
        <span class="pay-emoji">🏧</span>
        <div><div class="pay-name">Transfer ATM / Bank</div><div class="pay-detail">Transfer manual, verifikasi otomatis</div></div>
      </div>
      <p class="form-note">🔒 Dana ditahan aman sampai barang kamu terima</p>`;
  }

  function tplPaymentProcessing(method, name, pricelabel) {
    return `
      <div style="text-align:center;">
        <div class="spinner"></div>
        <p class="modal-title" style="text-align:center;">Memproses Pembayaran…</p>
        <p class="modal-sub" style="text-align:center;">Menghubungkan ke ${method === "DANA" ? "DANA" : "bank kamu"} untuk ${name}</p>
      </div>`;
  }

  function tplPaymentSuccess(method, name, priceval, pricelabel) {
    const fee = method === "DANA" ? 0 : 2500;
    const total = Number(priceval) + fee;
    const orderId = "SW" + Math.floor(100000 + Math.random() * 900000);
    return `
      <div style="text-align:center;">
        <div class="success-check">✓</div>
        <p class="modal-title" style="text-align:center;">Pembayaran Berhasil!</p>
        <p class="modal-sub" style="text-align:center;">Pesanan kamu sedang diproses penjual.</p>
      </div>
      <div class="pay-summary">
        <div class="pay-summary-row"><span>ID Pesanan</span><span>${orderId}</span></div>
        <div class="pay-summary-row"><span>Item</span><span>${name}</span></div>
        <div class="pay-summary-row"><span>Metode</span><span>${method === "DANA" ? "DANA" : "Transfer ATM/Bank"}</span></div>
        ${fee ? `<div class="pay-summary-row"><span>Biaya Admin</span><span>${formatRupiah(fee)}</span></div>` : ""}
        <div class="pay-summary-row"><span>Total Dibayar</span><span>${formatRupiah(total)}</span></div>
      </div>
      <button class="btn-primary" data-action="close-modal">Selesai</button>`;
  }

  /* ---------- AUTH ---------- */
  function renderNavRight() {
    const navRight = $("#navRight");
    if (state.user) {
      const initials = state.user.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
      navRight.innerHTML = `
        <div class="user-chip">
          <span class="user-avatar">${initials}</span>
          <span>${state.user.name.split(" ")[0]}</span>
        </div>
        <button class="btn-logout" id="btnLogout">Keluar</button>`;
      $("#btnLogout").addEventListener("click", () => {
        state.user = null;
        renderNavRight();
        showToast("Kamu berhasil keluar.", "default");
      });
    } else {
      navRight.innerHTML = `
        <button class="btn-outline" data-modal="daftar">Daftar</button>
        <button class="btn-primary" data-modal="masuk">Masuk</button>`;
    }
  }

  /* ---------- PRODUCT FILTERING ---------- */
  const grid = $("#productsGrid");
  const emptyState = $("#emptyState");

  function applyFilters() {
    const cards = $$(".product-card", grid);
    let visibleCount = 0;

    cards.forEach((card) => {
      const cat = card.dataset.category;
      const size = card.dataset.size;
      const price = Number(card.dataset.price);

      let visible = true;
      if (state.activeCategory !== "semua" && cat !== state.activeCategory) visible = false;
      if (state.activeSizes.size > 0 && !state.activeSizes.has(size)) visible = false;
      if (state.priceUnder100k && price >= 100000) visible = false;

      card.hidden = !visible;
      if (visible) visibleCount++;
    });

    // sorting
    if (state.activeSort === "termurah") {
      const sorted = cards.slice().sort((a, b) => Number(a.dataset.price) - Number(b.dataset.price));
      sorted.forEach((c) => grid.appendChild(c));
    }

    emptyState.hidden = visibleCount !== 0;
  }

  $$(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".filter-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.activeCategory = tab.dataset.filter;
      applyFilters();
    });
  });

  $$(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const group = chip.dataset.group;
      if (group === "sort") {
        $$('.chip[data-group="sort"]').forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        state.activeSort = chip.dataset.chip;
      } else if (group === "size") {
        chip.classList.toggle("active");
        const size = chip.dataset.chip;
        if (state.activeSizes.has(size)) state.activeSizes.delete(size);
        else state.activeSizes.add(size);
      } else if (group === "price") {
        chip.classList.toggle("active");
        state.priceUnder100k = chip.classList.contains("active");
      }
      applyFilters();
    });
  });

  /* ---------- BUY / PAYMENT FLOW ---------- */
  function startPaymentFlow(name, priceval, pricelabel) {
    openModal(tplPaymentChoose(name, priceval, pricelabel));
  }

  function handlePayOptionClick(el) {
    const method = el.dataset.pay;
    const name = el.dataset.name;
    const priceval = el.dataset.priceval;
    const pricelabel = el.dataset.pricelabel;
    openModal(tplPaymentProcessing(method, name, pricelabel));
    setTimeout(() => {
      openModal(tplPaymentSuccess(method, name, priceval, pricelabel));
      showToast(`Pesanan "${name}" berhasil dibayar via ${method}.`, "success");
    }, 1400);
  }

  /* ---------- AI RECOMMENDER ---------- */
  function wireAIModal() {
    const groups = { kategori: "semua", ukuran: "semua", budget: "semua" };
    $$("[data-ai-group]").forEach((groupEl) => {
      const groupName = groupEl.dataset.aiGroup;
      $$(".choice-chip", groupEl).forEach((chip) => {
        chip.addEventListener("click", () => {
          $$(".choice-chip", groupEl).forEach((c) => c.classList.remove("active"));
          chip.classList.add("active");
          groups[groupName] = chip.dataset.val;
        });
      });
    });
    $("#aiSubmit").addEventListener("click", () => {
      // reset visual filters to reflect AI pick
      state.activeCategory = groups.kategori;
      $$(".filter-tab").forEach((t) => t.classList.toggle("active", t.dataset.filter === groups.kategori));

      state.activeSizes = new Set(groups.ukuran !== "semua" ? [groups.ukuran] : []);
      $$('.chip[data-group="size"]').forEach((c) => c.classList.toggle("active", state.activeSizes.has(c.dataset.chip)));

      state.priceUnder100k = groups.budget === "100k";
      $$('.chip[data-group="price"]').forEach((c) => c.classList.toggle("active", state.priceUnder100k));

      applyFilters();

      const visible = $$(".product-card", grid).filter((c) => !c.hidden).length;
      closeModal();
      $("#produk").scrollIntoView({ behavior: "smooth", block: "start" });
      showToast(`AI menemukan ${visible} item yang cocok untukmu ✦`, "success");
    });
  }

  /* ---------- DETAIL MODAL ---------- */
  function wireDetailModal(card) {
    $$("[data-detail-size] .choice-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        $$("[data-detail-size] .choice-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
      });
    });
    const beliBtn = $('[data-action="beli-from-detail"]');
    if (beliBtn) {
      beliBtn.addEventListener("click", () => {
        startPaymentFlow(beliBtn.dataset.name, beliBtn.dataset.price, beliBtn.dataset.pricelabel);
      });
    }
  }

  /* ---------- PHOTO UPLOAD ---------- */
  function wirePhotoFrames(root = document) {
    $$(".photo-frame", root).forEach((frame) => {
      const img = $(".photo-img", frame);
      const editBtn = $(".photo-edit", frame);
      const input = $(".photo-input", frame);
      if (!editBtn || !input) return;

      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        input.click();
      });

      input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          if (img) {
            img.src = reader.result;
            img.hidden = false;
            img.classList.remove("img-missing");
          }
          showToast("Foto berhasil diperbarui.", "success");
        };
        reader.readAsDataURL(file);
      });

      if (img) {
        img.addEventListener("click", (e) => {
          e.stopPropagation();
          openLightbox(img.src, img.alt);
        });
        img.addEventListener("error", () => img.classList.add("img-missing"));
      }
    });
  }

  /* ---------- GLOBAL CLICK DELEGATION ---------- */
  document.addEventListener("click", (e) => {
    // open modal by data-modal
    const modalTrigger = e.target.closest("[data-modal]");
    if (modalTrigger) {
      e.preventDefault();
      const kind = modalTrigger.dataset.modal;
      if (kind === "daftar") openModal(tplDaftar());
      else if (kind === "masuk") openModal(tplMasuk());
      else if (kind === "ai") { openModal(tplAI()); wireAIModal(); }
      else if (["bayar-dana", "bayar-atm", "bayar-aman"].includes(kind)) openModal(tplPaymentInfo(kind));
      else if (["privasi", "syarat", "kontak"].includes(kind)) openModal(tplSimplePage(kind));
      return;
    }

    // switch between login/register inside modal
    const switchTrigger = e.target.closest("[data-switch]");
    if (switchTrigger) {
      const kind = switchTrigger.dataset.switch;
      openModal(kind === "masuk" ? tplMasuk() : tplDaftar());
      return;
    }

    // generic close
    if (e.target.closest('[data-action="close-modal"]')) { closeModal(); return; }

    // product card actions
    const actionBtn = e.target.closest("[data-action]");
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      const card = actionBtn.closest(".product-card");

      if (action === "detail" && card) {
        openModal(tplDetail(card), { wide: false });
        wireDetailModal(card);
        return;
      }
      if (action === "beli" && card) {
        startPaymentFlow(card.dataset.name, card.dataset.price, card.dataset.pricelabel);
        return;
      }
      if (action === "lihat-semua-produk") {
        e.preventDefault();
        $$(".filter-tab").forEach((t) => t.classList.toggle("active", t.dataset.filter === "semua"));
        state.activeCategory = "semua";
        state.activeSizes.clear();
        state.priceUnder100k = false;
        $$(".chip").forEach((c) => c.classList.remove("active"));
        $('.chip[data-chip="terbaru"]').classList.add("active");
        applyFilters();
        $("#produk").scrollIntoView({ behavior: "smooth" });
        return;
      }
      if (action === "lihat-semua-penjual") {
        e.preventDefault();
        showToast("Direktori penjual lengkap segera hadir.", "default");
        return;
      }
      if (action === "scroll-top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    // pay-option inside modal
    const payOption = e.target.closest(".pay-option");
    if (payOption) { handlePayOptionClick(payOption); return; }

    // stat card
    const statCard = e.target.closest(".stat-card");
    if (statCard) { showToast(statCard.dataset.fact, "default", 4200); return; }

    // seller card
    const sellerCard = e.target.closest(".seller-card");
    if (sellerCard) { openModal(tplSeller(sellerCard)); return; }

    // fitur item
    const fiturItem = e.target.closest(".fitur-item");
    if (fiturItem) { showToast(fiturItem.dataset.feature, "default", 4200); return; }

    // hero card image click without dedicated handler fallback (handled by wirePhotoFrames)
  });

  /* ---------- FORM SUBMIT DELEGATION ---------- */
  document.addEventListener("submit", (e) => {
    if (e.target.id === "formDaftar") {
      e.preventDefault();
      const name = $("#dName").value.trim() || "Pengguna Baru";
      state.user = { name, email: $("#dEmail").value.trim() };
      renderNavRight();
      closeModal();
      showToast(`Akun berhasil dibuat. Selamat datang, ${name.split(" ")[0]}!`, "success");
    }
    if (e.target.id === "formMasuk") {
      e.preventDefault();
      const email = $("#mEmail").value.trim();
      const name = email.split("@")[0].replace(/[._]/g, " ") || "Pengguna";
      state.user = { name: name.charAt(0).toUpperCase() + name.slice(1), email };
      renderNavRight();
      closeModal();
      showToast(`Berhasil masuk. Selamat datang kembali, ${state.user.name.split(" ")[0]}!`, "success");
    }
  });

  /* ---------- HAMBURGER / MOBILE NAV ---------- */
  const hamburger = $("#hamburger");
  const navLinks = $("#navLinks");
  hamburger.addEventListener("click", () => navLinks.classList.toggle("open"));
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => navLinks.classList.remove("open")));

  /* ---------- NAV ACTIVE LINK ON SCROLL ---------- */
  const sections = ["beranda", "produk", "pembayaran", "tentang"].map((id) => document.getElementById(id)).filter(Boolean);
  const navAnchors = $$("#navLinks a");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navAnchors.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
        }
      });
    },
    { rootMargin: "-40% 0px -50% 0px" }
  );
  sections.forEach((s) => observer.observe(s));

  /* ---------- INIT ---------- */
  wirePhotoFrames();
  applyFilters();
})();