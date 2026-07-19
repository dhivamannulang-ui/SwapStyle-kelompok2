/* ============================================================
   SwapStyle — script.js
   Modal, keranjang, checkout (alamat + pembayaran), status
   pesanan, ulasan bintang, dashboard penjual, filter, AI
   recommender, ganti foto, lightbox, navigasi mobile.
   ============================================================ */

(function () {
  "use strict";

  const BANKS = ["BRI", "Mandiri", "BNI", "BCA", "BSI", "CIMB Niaga"];
  const STATUS_STAGES = ["Dikemas", "Dikirim", "Tiba di Tujuan", "Selesai"];

  /* ---------- STATE ---------- */
  const state = {
    user: null, // { name, email, role: 'pembeli' | 'penjual' }
    activeCategory: "semua",
    activeSort: "terbaru",
    activeSizes: new Set(),
    priceUnder100k: false,
    cart: [], // { key, name, price, pricelabel, size, qty, img }
    orders: [], // { id, items, address, method, methodDetail, total, status, review }
    sellerBalance: 0,
    sellerSoldCount: 0,
    productCounter: 0,
  };

  let checkout = null; // { items, address, method, dana:{}, atm:{} }

  /* ---------- HELPERS ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const formatRupiah = (n) => "Rp " + Number(n).toLocaleString("id-ID");
  const uid = (prefix) => prefix + Math.floor(100000 + Math.random() * 900000);

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

  /* ---------- BADGES ---------- */
  function updateCartBadge() {
    const badge = $("#cartBadge");
    if (!badge) return;
    const count = state.cart.reduce((sum, it) => sum + it.qty, 0);
    badge.textContent = count;
    badge.hidden = count === 0;
  }
  function updateOrdersBadge() {
    const badge = $("#ordersBadge");
    if (!badge) return;
    const activeCount = state.orders.filter((o) => o.status !== "Selesai").length;
    badge.textContent = activeCount;
    badge.hidden = activeCount === 0;
  }

  /* ---------- AUTH TEMPLATES ---------- */
  function tplDaftar() {
    return `
      <p class="modal-title">Buat Akun</p>
      <p class="modal-sub">Gabung dan mulai jual-beli fashion preloved dengan aman.</p>
      <form id="formDaftar">
        <div class="form-field">
          <label>Daftar Sebagai</label>
          <div class="choice-group role-choice" data-role-group>
            <span class="choice-chip active" data-val="pembeli">🛍️ Pembeli</span>
            <span class="choice-chip" data-val="penjual">🏪 Penjual</span>
          </div>
        </div>
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

  function wireRoleChoice() {
    const group = $("[data-role-group]");
    if (!group) return;
    $$(".choice-chip", group).forEach((chip) => {
      chip.addEventListener("click", () => {
        $$(".choice-chip", group).forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
      });
    });
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
        desc: "Bayar langsung dari saldo DANA kamu dengan scan QR atau memasukkan nomor DANA. Dana masuk instan, tanpa biaya admin tambahan.",
      },
      "bayar-atm": {
        title: "🏧 Transfer ATM / Bank",
        desc: "Transfer manual ke rekening virtual account penjual lewat ATM, m-banking, atau teller. Pilih bank kamu dan masukkan nomor rekening saat checkout.",
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
        body: "SwapStyle hanya mengumpulkan data yang diperlukan untuk transaksi (nama, email, alamat pengiriman, dan riwayat pesanan). Data tidak pernah dijual ke pihak ketiga dan disimpan dengan enkripsi standar industri.",
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

  /* ---------- PRODUCT DETAIL ---------- */
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
      <div style="display:flex; gap:10px;">
        <button class="btn-outline" data-action="cart-from-detail" style="flex:1;">+ Keranjang</button>
        <button class="btn-primary" data-action="beli-from-detail" style="flex:1;">Beli Sekarang</button>
      </div>`;
  }

  function readCardItem(card) {
    const img = $(".photo-img", card);
    const sizeChoice = $("[data-detail-size] .choice-chip.active");
    return {
      key: card.dataset.name + "-" + (sizeChoice ? sizeChoice.dataset.val : card.dataset.size),
      name: card.dataset.name,
      price: Number(card.dataset.price),
      pricelabel: card.dataset.pricelabel,
      size: sizeChoice ? sizeChoice.dataset.val : card.dataset.size,
      qty: 1,
      img: img && img.src ? img.src : "",
    };
  }

  function wireDetailModal(card) {
    $$("[data-detail-size] .choice-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        $$("[data-detail-size] .choice-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
      });
    });
    const cartBtn = $('[data-action="cart-from-detail"]');
    if (cartBtn) cartBtn.addEventListener("click", () => { addToCart(readCardItem(card)); closeModal(); });
    const beliBtn = $('[data-action="beli-from-detail"]');
    if (beliBtn) beliBtn.addEventListener("click", () => startCheckout([readCardItem(card)]));
  }

  /* ---------- CART ---------- */
  function addToCart(item) {
    const existing = state.cart.find((it) => it.key === item.key);
    if (existing) existing.qty += item.qty;
    else state.cart.push(item);
    updateCartBadge();
    showToast(`"${item.name}" ditambahkan ke keranjang.`, "success");
  }

  function tplCart() {
    if (state.cart.length === 0) {
      return `<p class="modal-title">Keranjang</p><p class="cart-empty">Keranjang kamu masih kosong. Yuk mulai belanja!</p>`;
    }
    const total = state.cart.reduce((sum, it) => sum + it.price * it.qty, 0);
    return `
      <p class="modal-title">Keranjang (${state.cart.length})</p>
      <div class="cart-list">
        ${state.cart.map((it) => `
          <div class="cart-item" data-key="${it.key}">
            <div class="cart-item-photo">${it.img ? `<img src="${it.img}" alt="${it.name}" />` : ""}</div>
            <div class="cart-item-info">
              <p class="cart-item-name">${it.name}</p>
              <p class="cart-item-meta">Ukuran ${it.size} · <span class="cart-item-price">${formatRupiah(it.price)}</span></p>
              <div class="qty-control">
                <button class="qty-btn" data-action="qty-minus" data-key="${it.key}">−</button>
                <span class="qty-val">${it.qty}</span>
                <button class="qty-btn" data-action="qty-plus" data-key="${it.key}">+</button>
                <span class="cart-item-remove" data-action="cart-remove" data-key="${it.key}">Hapus</span>
              </div>
            </div>
          </div>`).join("")}
      </div>
      <div class="pay-summary">
        <div class="pay-summary-row"><span>Total</span><span>${formatRupiah(total)}</span></div>
      </div>
      <button class="btn-primary" id="btnCheckoutCart">Checkout Sekarang</button>`;
  }

  function wireCartModal() {
    $$('[data-action="qty-plus"]').forEach((b) => b.addEventListener("click", () => changeQty(b.dataset.key, 1)));
    $$('[data-action="qty-minus"]').forEach((b) => b.addEventListener("click", () => changeQty(b.dataset.key, -1)));
    $$('[data-action="cart-remove"]').forEach((b) => b.addEventListener("click", () => removeFromCart(b.dataset.key)));
    const checkoutBtn = $("#btnCheckoutCart");
    if (checkoutBtn) checkoutBtn.addEventListener("click", () => startCheckout(state.cart.slice(), true));
  }

  function changeQty(key, delta) {
    const item = state.cart.find((it) => it.key === key);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) state.cart = state.cart.filter((it) => it.key !== key);
    updateCartBadge();
    openModal(tplCart());
    wireCartModal();
  }

  function removeFromCart(key) {
    state.cart = state.cart.filter((it) => it.key !== key);
    updateCartBadge();
    openModal(tplCart());
    wireCartModal();
    showToast("Item dihapus dari keranjang.", "default");
  }

  /* ---------- CHECKOUT ---------- */
  function startCheckout(items, fromCart = false) {
    if (items.length === 0) { showToast("Keranjang masih kosong.", "error"); return; }
    checkout = { items, fromCart, address: null, method: null, dana: {}, atm: {} };
    renderCheckoutAddress();
  }

  function checkoutTotal() {
    return checkout.items.reduce((sum, it) => sum + it.price * it.qty, 0);
  }

  function tplStepper(activeStep) {
    return `<div class="checkout-steps">
      ${[1, 2, 3].map((n) => `<div class="checkout-step ${n < activeStep ? "done" : n === activeStep ? "active" : ""}"></div>`).join("")}
    </div>`;
  }

  function renderCheckoutAddress() {
    openModal(`
      ${tplStepper(1)}
      <p class="modal-title">Alamat Pengiriman</p>
      <p class="modal-sub">${checkout.items.length} item · <strong style="color:var(--primary)">${formatRupiah(checkoutTotal())}</strong></p>
      <form id="formAlamat">
        <div class="form-field">
          <label for="addrName">Nama Penerima</label>
          <input id="addrName" type="text" placeholder="Nama lengkap" required />
        </div>
        <div class="form-field">
          <label for="addrPhone">Nomor HP</label>
          <input id="addrPhone" type="tel" placeholder="08xxxxxxxxxx" pattern="[0-9]{9,14}" required />
        </div>
        <div class="form-field">
          <label for="addrFull">Alamat Lengkap</label>
          <input id="addrFull" type="text" placeholder="Jalan, nomor rumah, RT/RW" required />
        </div>
        <div class="form-field">
          <label for="addrCity">Kota / Kabupaten</label>
          <input id="addrCity" type="text" placeholder="Contoh: Batam" required />
        </div>
        <button type="submit" class="btn-primary">Lanjut ke Pembayaran</button>
      </form>`);
    $("#formAlamat").addEventListener("submit", (e) => {
      e.preventDefault();
      checkout.address = {
        name: $("#addrName").value.trim(),
        phone: $("#addrPhone").value.trim(),
        full: $("#addrFull").value.trim(),
        city: $("#addrCity").value.trim(),
      };
      renderCheckoutPayment();
    });
  }

  function renderCheckoutPayment() {
    openModal(`
      ${tplStepper(2)}
      <p class="modal-title">Metode Pembayaran</p>
      <p class="modal-sub">${checkout.items.length} item · <strong style="color:var(--primary)">${formatRupiah(checkoutTotal())}</strong></p>
      <div class="choice-group" style="margin-bottom:18px;" data-method-group>
        <span class="choice-chip" data-val="DANA">📱 DANA</span>
        <span class="choice-chip" data-val="ATM">🏧 Transfer ATM/Bank</span>
      </div>
      <div id="methodFields"></div>
      <button class="btn-primary" id="btnBayar" disabled>Pilih metode dulu</button>
      <p class="form-note">🔒 Dana ditahan aman sampai barang kamu terima</p>`);

    const methodFields = $("#methodFields");
    const bayarBtn = $("#btnBayar");

    function renderMethodFields(method) {
      if (method === "DANA") {
        methodFields.innerHTML = `
          <div class="form-field">
            <label for="danaPhone">Nomor DANA</label>
            <input id="danaPhone" type="tel" placeholder="08xxxxxxxxxx" pattern="[0-9]{9,14}" required />
          </div>`;
      } else if (method === "ATM") {
        methodFields.innerHTML = `
          <div class="form-field">
            <label>Pilih Bank</label>
            <div class="bank-select-grid" id="bankGrid">
              ${BANKS.map((b) => `<span class="bank-option" data-bank="${b}">${b}</span>`).join("")}
            </div>
          </div>
          <div class="form-field">
            <label for="atmAccount">Nomor Rekening</label>
            <input id="atmAccount" type="text" inputmode="numeric" placeholder="Nomor rekening tujuan" required />
          </div>`;
        $$(".bank-option", methodFields).forEach((opt) => {
          opt.addEventListener("click", () => {
            $$(".bank-option", methodFields).forEach((o) => o.classList.remove("active"));
            opt.classList.add("active");
            checkout.atm.bank = opt.dataset.bank;
          });
        });
      } else {
        methodFields.innerHTML = "";
      }
      bayarBtn.disabled = false;
      bayarBtn.textContent = "Bayar Sekarang";
    }

    $$('[data-method-group] .choice-chip').forEach((chip) => {
      chip.addEventListener("click", () => {
        $$('[data-method-group] .choice-chip').forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        checkout.method = chip.dataset.val;
        renderMethodFields(chip.dataset.val);
      });
    });

    bayarBtn.addEventListener("click", () => {
      if (checkout.method === "DANA") {
        const phone = $("#danaPhone").value.trim();
        if (!phone || phone.length < 9) { showToast("Masukkan nomor DANA yang valid.", "error"); return; }
        checkout.dana.phone = phone;
      } else if (checkout.method === "ATM") {
        const account = $("#atmAccount") ? $("#atmAccount").value.trim() : "";
        if (!checkout.atm.bank) { showToast("Pilih bank tujuan dulu.", "error"); return; }
        if (!account || account.length < 6) { showToast("Masukkan nomor rekening yang valid.", "error"); return; }
        checkout.atm.account = account;
      } else {
        showToast("Pilih metode pembayaran dulu.", "error");
        return;
      }
      renderCheckoutProcessing();
    });
  }

  function renderCheckoutProcessing() {
    openModal(`
      ${tplStepper(3)}
      <div style="text-align:center;">
        <div class="spinner"></div>
        <p class="modal-title" style="text-align:center;">Memproses Pembayaran…</p>
        <p class="modal-sub" style="text-align:center;">
          ${checkout.method === "DANA" ? "Menghubungkan ke DANA " + checkout.dana.phone : "Memverifikasi transfer " + checkout.atm.bank}
        </p>
      </div>`);
    setTimeout(finalizeOrder, 1500);
  }

  function finalizeOrder() {
    const total = checkoutTotal();
    const order = {
      id: uid("SW"),
      items: checkout.items,
      address: checkout.address,
      method: checkout.method,
      methodDetail: checkout.method === "DANA" ? `DANA · ${checkout.dana.phone}` : `${checkout.atm.bank} · ${checkout.atm.account}`,
      total,
      status: STATUS_STAGES[0],
      review: null,
      createdAt: Date.now(),
    };
    state.orders.unshift(order);

    if (checkout.fromCart) {
      const boughtKeys = new Set(checkout.items.map((it) => it.key));
      state.cart = state.cart.filter((it) => !boughtKeys.has(it.key));
    }
    updateCartBadge();
    updateOrdersBadge();
    scheduleOrderProgress(order);

    openModal(`
      <div style="text-align:center;">
        <div class="success-check">✓</div>
        <p class="modal-title" style="text-align:center;">Pembayaran Berhasil!</p>
        <p class="modal-sub" style="text-align:center;">Pesanan kamu sedang dikemas penjual.</p>
      </div>
      <div class="pay-summary">
        <div class="pay-summary-row"><span>ID Pesanan</span><span>${order.id}</span></div>
        <div class="pay-summary-row"><span>Dikirim ke</span><span>${order.address.name}, ${order.address.city}</span></div>
        <div class="pay-summary-row"><span>Metode</span><span>${order.methodDetail}</span></div>
        <div class="pay-summary-row"><span>Total Dibayar</span><span>${formatRupiah(order.total)}</span></div>
      </div>
      <button class="btn-primary" id="btnLihatPesanan">Lihat Pesanan Saya</button>`);
    $("#btnLihatPesanan").addEventListener("click", () => openOrdersModal());
    showToast(`Pesanan ${order.id} berhasil dibuat.`, "success");
    checkout = null;
  }

  function scheduleOrderProgress(order) {
    setTimeout(() => {
      order.status = STATUS_STAGES[1];
      showToast(`Pesanan ${order.id} sedang dikirim.`, "default");
      updateOrdersBadge();
      refreshOrdersModalIfOpen();
    }, 6000);
    setTimeout(() => {
      order.status = STATUS_STAGES[2];
      showToast(`Paket ${order.id} sudah tiba! Konfirmasi penerimaan yuk.`, "success", 4500);
      updateOrdersBadge();
      refreshOrdersModalIfOpen();
    }, 13000);
  }

  function refreshOrdersModalIfOpen() {
    if (modalOverlay.classList.contains("open") && $("#ordersRoot")) {
      openModal(tplOrders(), { wide: true });
      wireOrdersModal();
    }
  }

  /* ---------- ORDERS ---------- */
  function tplOrders() {
    if (state.orders.length === 0) {
      return `<p class="modal-title">Pesanan Saya</p><div id="ordersRoot"><p class="cart-empty">Belum ada pesanan. Yuk mulai belanja!</p></div>`;
    }
    return `
      <p class="modal-title">Pesanan Saya</p>
      <div id="ordersRoot">
        ${state.orders.map((o) => tplOrderCard(o)).join("")}
      </div>`;
  }

  function tplOrderCard(o) {
    const stepIndex = STATUS_STAGES.indexOf(o.status);
    const itemsLabel = o.items.map((it) => `${it.name} (${it.qty}x)`).join(", ");
    let actions = "";
    if (o.status === "Tiba di Tujuan") {
      actions = `<div class="order-actions"><button class="btn-primary" data-action="confirm-order" data-id="${o.id}">Konfirmasi Pesanan Diterima</button></div>`;
    } else if (o.status === "Selesai" && !o.review) {
      actions = `<div class="order-actions"><button class="btn-primary" data-action="review-order" data-id="${o.id}">Beri Ulasan ⭐</button></div>`;
    } else if (o.review) {
      actions = `<div class="review-badge">${"★".repeat(o.review.stars)}${"☆".repeat(5 - o.review.stars)}<span style="color:var(--text-muted); margin-left:6px; font-size:.78rem;">"${o.review.comment}"</span></div>`;
    }
    return `
      <div class="order-card">
        <div class="order-head">
          <span class="order-id">${o.id}</span>
          <span class="order-status-badge">${o.status}</span>
        </div>
        <p class="order-items"><span>Item:</span> ${itemsLabel}</p>
        <p class="order-items"><span>Total:</span> ${formatRupiah(o.total)} · <span>${o.methodDetail}</span></p>
        <div class="status-stepper">
          ${STATUS_STAGES.map((s, i) => `
            <div class="status-step ${i < stepIndex ? "done" : i === stepIndex ? "active" : ""}">
              <div class="dot">${i <= stepIndex ? "✓" : ""}</div>
              <div class="lbl">${s}</div>
            </div>`).join("")}
        </div>
        ${actions}
      </div>`;
  }

  function openOrdersModal() {
    openModal(tplOrders(), { wide: true });
    wireOrdersModal();
  }

  function wireOrdersModal() {
    $$('[data-action="confirm-order"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const order = state.orders.find((o) => o.id === btn.dataset.id);
        if (!order) return;
        order.status = "Selesai";
        state.sellerSoldCount += 1;
        state.sellerBalance += order.total;
        updateOrdersBadge();
        openModal(tplOrders(), { wide: true });
        wireOrdersModal();
        showToast("Pesanan diterima. Terima kasih sudah belanja di SwapStyle!", "success");
      });
    });
    $$('[data-action="review-order"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const order = state.orders.find((o) => o.id === btn.dataset.id);
        if (order) openReviewModal(order);
      });
    });
  }

  /* ---------- REVIEW ---------- */
  function openReviewModal(order) {
    let selectedStars = 5;
    openModal(`
      <p class="modal-title">Beri Ulasan</p>
      <p class="modal-sub">${order.items.map((it) => it.name).join(", ")}</p>
      <div class="star-picker" id="starPicker">
        ${[1, 2, 3, 4, 5].map((n) => `<span class="star on" data-val="${n}">★</span>`).join("")}
      </div>
      <div class="form-field">
        <label for="reviewComment">Komentar</label>
        <input id="reviewComment" type="text" placeholder="Bagaimana kualitas barangnya?" />
      </div>
      <button class="btn-primary" id="btnSubmitReview">Kirim Ulasan</button>`);

    const stars = $$("#starPicker .star");
    stars.forEach((star) => {
      star.addEventListener("click", () => {
        selectedStars = Number(star.dataset.val);
        stars.forEach((s) => s.classList.toggle("on", Number(s.dataset.val) <= selectedStars));
      });
    });

    $("#btnSubmitReview").addEventListener("click", () => {
      const comment = $("#reviewComment").value.trim() || "Barang sesuai deskripsi.";
      order.review = { stars: selectedStars, comment };
      closeModal();
      showToast("Terima kasih atas ulasannya!", "success");
    });
  }

  /* ---------- AUTH RENDER ---------- */
  function renderNavRight() {
    const navRight = $("#navRight");
    const iconsHtml = `
      <button class="icon-btn" id="ordersBtn" aria-label="Pesanan saya" title="Pesanan Saya">📦<span class="icon-badge" id="ordersBadge" hidden>0</span></button>
      <button class="icon-btn" id="cartBtn" aria-label="Keranjang" title="Keranjang">🛒<span class="icon-badge" id="cartBadge" hidden>0</span></button>`;

    if (state.user) {
      const initials = state.user.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
      navRight.innerHTML = `
        ${iconsHtml}
        ${state.user.role === "penjual" ? `<button class="btn-outline" id="btnSellerDash">🏪 Dashboard</button>` : ""}
        <div class="user-chip">
          <span class="user-avatar">${initials}</span>
          <span>${state.user.name.split(" ")[0]}</span>
        </div>
        <button class="btn-logout" id="btnLogout">Keluar</button>`;
      $("#btnLogout").addEventListener("click", () => {
        state.user = null;
        $("#sellerDash").hidden = true;
        renderNavRight();
        showToast("Kamu berhasil keluar.", "default");
      });
      if (state.user.role === "penjual") {
        $("#btnSellerDash").addEventListener("click", openSellerDashboard);
      }
    } else {
      navRight.innerHTML = `
        ${iconsHtml}
        <button class="btn-outline" data-modal="daftar">Daftar</button>
        <button class="btn-primary" data-modal="masuk">Masuk</button>`;
    }
    updateCartBadge();
    updateOrdersBadge();
    wireIconButtons();
  }

  function wireIconButtons() {
    $("#cartBtn").addEventListener("click", () => { openModal(tplCart()); wireCartModal(); });
    $("#ordersBtn").addEventListener("click", openOrdersModal);
  }

  /* ---------- SELLER DASHBOARD ---------- */
  function openSellerDashboard() {
    $("#sellerDash").hidden = false;
    renderSellerStats();
    $("#sellerDash").scrollIntoView({ behavior: "smooth" });
  }

  function renderSellerStats() {
    const grid = $("#sellerStatsGrid");
    const activeItems = $$(".product-card", $("#productsGrid")).length;
    grid.innerHTML = `
      <div class="seller-stat-card"><span class="num">${formatRupiah(state.sellerBalance)}</span><span class="lbl">Saldo</span></div>
      <div class="seller-stat-card"><span class="num">${state.sellerSoldCount}</span><span class="lbl">Total Terjual</span></div>
      <div class="seller-stat-card"><span class="num">${activeItems}</span><span class="lbl">Item Aktif</span></div>`;
  }

  function tplTambahProduk() {
    return `
      <p class="modal-title">Tambah Produk</p>
      <p class="modal-sub">Isi detail barang yang ingin kamu jual.</p>
      <form id="formTambahProduk">
        <div class="form-field">
          <label for="tpName">Nama Barang</label>
          <input id="tpName" type="text" placeholder="Contoh: Kemeja Corduroy" required />
        </div>
        <div class="form-field">
          <label for="tpKategori">Kategori</label>
          <select id="tpKategori" required>
            <option value="kemeja">Kemeja</option>
            <option value="celana">Celana</option>
            <option value="jaket">Jaket</option>
          </select>
        </div>
        <div class="form-field">
          <label for="tpUkuran">Ukuran</label>
          <select id="tpUkuran" required>
            <option value="S">S</option>
            <option value="M" selected>M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
          </select>
        </div>
        <div class="form-field">
          <label for="tpKondisi">Kondisi</label>
          <select id="tpKondisi" required>
            <option value="Sangat Baik">Sangat Baik</option>
            <option value="Baik">Baik</option>
          </select>
        </div>
        <div class="form-field">
          <label for="tpHarga">Harga (Rp)</label>
          <input id="tpHarga" type="number" min="1000" step="1000" placeholder="75000" required />
        </div>
        <div class="form-field">
          <label for="tpDesk">Deskripsi</label>
          <input id="tpDesk" type="text" placeholder="Ceritakan kondisi & detail barang" required />
        </div>
        <button type="submit" class="btn-primary">Publikasikan Produk</button>
      </form>`;
  }

  function wireTambahProdukForm() {
    $("#formTambahProduk").addEventListener("submit", (e) => {
      e.preventDefault();
      state.productCounter += 1;
      const name = $("#tpName").value.trim();
      const category = $("#tpKategori").value;
      const size = $("#tpUkuran").value;
      const cond = $("#tpKondisi").value;
      const price = Number($("#tpHarga").value);
      const desc = $("#tpDesk").value.trim();
      const priceLabel = formatRupiah(price);
      const key = "new-product-" + state.productCounter;

      const article = document.createElement("article");
      article.className = "product-card";
      article.dataset.category = category;
      article.dataset.size = size;
      article.dataset.price = String(price);
      article.dataset.name = name;
      article.dataset.pricelabel = priceLabel;
      article.dataset.cond = cond;
      article.dataset.desc = desc;
      article.innerHTML = `
        <div class="photo-frame" data-key="${key}">
          <img src="" alt="${name}" class="photo-img" hidden />
          <button class="photo-edit" type="button" aria-label="Ubah foto ${name}"><span>📷</span> Ubah foto</button>
          <input type="file" accept="image/*" class="photo-input" hidden />
        </div>
        <div class="product-info">
          <p class="product-name">${name}</p>
          <p class="product-cond">Kondisi: ${cond} · Ukuran ${size}</p>
          <div class="product-footer">
            <span class="product-price">${priceLabel}</span>
            <span class="product-pay">💳 DANA/ATM</span>
          </div>
          <div class="product-actions">
            <button class="btn-swap" data-action="detail">Detail</button>
            <button class="btn-cart" data-action="cart" aria-label="Tambah ke keranjang">🛒</button>
            <button class="btn-buy" data-action="beli">Beli</button>
          </div>
        </div>`;
      $("#productsGrid").prepend(article);
      wirePhotoFrames(article);
      applyFilters();
      renderSellerStats();
      closeModal();
      showToast(`"${name}" berhasil dipublikasikan.`, "success");
    });
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
    const modalTrigger = e.target.closest("[data-modal]");
    if (modalTrigger) {
      e.preventDefault();
      const kind = modalTrigger.dataset.modal;
      if (kind === "daftar") { openModal(tplDaftar()); wireRoleChoice(); }
      else if (kind === "masuk") openModal(tplMasuk());
      else if (kind === "ai") { openModal(tplAI()); wireAIModal(); }
      else if (["bayar-dana", "bayar-atm", "bayar-aman"].includes(kind)) openModal(tplPaymentInfo(kind));
      else if (["privasi", "syarat", "kontak"].includes(kind)) openModal(tplSimplePage(kind));
      return;
    }

    const switchTrigger = e.target.closest("[data-switch]");
    if (switchTrigger) {
      const kind = switchTrigger.dataset.switch;
      if (kind === "masuk") openModal(tplMasuk());
      else { openModal(tplDaftar()); wireRoleChoice(); }
      return;
    }

    if (e.target.closest('[data-action="close-modal"]')) { closeModal(); return; }

    if (e.target.closest("#btnTambahProduk")) {
      openModal(tplTambahProduk());
      wireTambahProdukForm();
      return;
    }

    const actionBtn = e.target.closest("[data-action]");
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      const card = actionBtn.closest(".product-card");

      if (action === "detail" && card) {
        openModal(tplDetail(card));
        wireDetailModal(card);
        return;
      }
      if (action === "cart" && card) {
        addToCart(readCardItem(card));
        return;
      }
      if (action === "beli" && card) {
        startCheckout([readCardItem(card)]);
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

    const statCard = e.target.closest(".stat-card");
    if (statCard) { showToast(statCard.dataset.fact, "default", 4200); return; }

    const sellerCard = e.target.closest(".seller-card");
    if (sellerCard) { openModal(tplSeller(sellerCard)); return; }

    const fiturItem = e.target.closest(".fitur-item");
    if (fiturItem) { showToast(fiturItem.dataset.feature, "default", 4200); return; }
  });

  /* ---------- FORM SUBMIT DELEGATION ---------- */
  document.addEventListener("submit", (e) => {
    if (e.target.id === "formDaftar") {
      e.preventDefault();
      const name = $("#dName").value.trim() || "Pengguna Baru";
      const roleChip = $('[data-role-group] .choice-chip.active');
      const role = roleChip ? roleChip.dataset.val : "pembeli";
      state.user = { name, email: $("#dEmail").value.trim(), role };
      renderNavRight();
      closeModal();
      showToast(`Akun ${role} berhasil dibuat. Selamat datang, ${name.split(" ")[0]}!`, "success");
      if (role === "penjual") setTimeout(openSellerDashboard, 400);
    }
    if (e.target.id === "formMasuk") {
      e.preventDefault();
      const email = $("#mEmail").value.trim();
      const name = email.split("@")[0].replace(/[._]/g, " ") || "Pengguna";
      state.user = { name: name.charAt(0).toUpperCase() + name.slice(1), email, role: "pembeli" };
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
  renderNavRight();
})();