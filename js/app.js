/* =========================================================
   TecnoVision.vzla - Lógica de la tienda
   Precios base en USD + conversión a Bs. (tasa BCV oficial)
   ========================================================= */

// ---------- Estado ----------
const state = {
  category: "todos",
  query: "",
  sort: "default",
  cart: JSON.parse(localStorage.getItem("tvzla_cart") || "[]"),
  rate: null,   // Bs. por 1 USD
  rateSource: null,
};

// ← Tu número de WhatsApp (formato internacional sin +)
const WHATSAPP_NUM = "584128445744";

// Tasa de respaldo si las APIs fallan (actualízala manualmente aquí si hace falta)
const DEFAULT_BCV_RATE = 881.07;

// Caché de la tasa: 1 hora
const RATE_CACHE_KEY = "tvzla_rate_cache";
const RATE_CACHE_TTL = 60 * 60 * 1000;

// ---------- Catálogo dinámico (base + ediciones del admin) ----------
// Versión del catálogo base: al cambiarla se descartan ediciones viejas
// guardadas en el navegador que ya no correspondan a esta base.
const CATALOG_VERSION = 2;
const CATALOG_VERSION_KEY = "tvzla_catalog_version";

(function migrateCatalogStorage() {
  try {
    const saved = parseInt(localStorage.getItem(CATALOG_VERSION_KEY) || "0", 10);
    if (saved !== CATALOG_VERSION) {
      // Base nueva: limpiar overrides/agregados/eliminados antiguos
      // para no arrastrar datos que oculten las imágenes nuevas.
      localStorage.removeItem("tvzla_overrides");
      localStorage.removeItem("tvzla_added");
      localStorage.removeItem("tvzla_deleted");
      localStorage.setItem(CATALOG_VERSION_KEY, String(CATALOG_VERSION));
    }
  } catch (_) { /* almacenamiento no disponible */ }
})();

const ADMIN_DATA = {
  overrides: (() => { try { return JSON.parse(localStorage.getItem("tvzla_overrides")) || {}; } catch (_) { return {}; } })(),
  added:     (() => { try { return JSON.parse(localStorage.getItem("tvzla_added")) || []; } catch (_) { return []; } })(),
  deleted:   (() => { try { return JSON.parse(localStorage.getItem("tvzla_deleted")) || []; } catch (_) { return []; } })(),
};

let CATALOG = [];

function rebuildCatalog() {
  CATALOG = PRODUCTS
    .filter((p) => !ADMIN_DATA.deleted.includes(p.id))
    .map((p) => Object.assign({}, p, ADMIN_DATA.overrides[p.id] || {}))
    .concat(ADMIN_DATA.added.slice());
}

rebuildCatalog();

// ---------- Utilidades ----------
const $ = (sel) => document.querySelector(sel);

function formatUSD(n) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toBs(usd) {
  return usd * (state.rate || DEFAULT_BCV_RATE);
}

function formatBs(usd) {
  return "Bs. " + toBs(usd).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function stars(rating) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

// Imagen personalizada (del catálogo o subida por el admin) o emoji del producto
function mediaHtml(p) {
  if (!p.image) return `<span>${p.icon}</span>`;
  // Si la imagen no carga, se reemplaza por el emoji (onerror)
  return `<img class="prod-img" src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy"
    onerror="this.outerHTML='&lt;span&gt;${p.icon}&lt;/span&gt;'" />`;
}

// Botón de edición visible solo con sesión de administrador
function adminEditHtml(id) {
  return window.TVAdmin && TVAdmin.isLoggedIn()
    ? `<button class="btn-view btn-edit" data-edit="${id}" title="Editar producto">✏️</button>`
    : "";
}

function categoryLabel(id) {
  const cat = CATEGORIES.find((c) => c.id === id);
  return cat ? cat.label : id;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
  );
}

function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2800);
}

// ---------- Tasa BCV (dólar oficial en bolívares) ----------
async function fetchRate(force = false) {
  const dot = $("#rateDot");
  const refreshBtn = $("#rateRefresh");

  // Usar caché válida
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(RATE_CACHE_KEY) || "null");
      if (cached && Date.now() - cached.time < RATE_CACHE_TTL && cached.rate > 0) {
        applyRate(cached.rate, cached.source, true);
        return;
      }
    } catch (_) { /* ignorar */ }
  }

  refreshBtn.classList.add("loading");
  dot.style.background = "var(--amber)";
  dot.style.boxShadow = "0 0 8px var(--amber)";

  let rate = null;
  let source = null;

  // Fuente 1: dolarapi Venezuela (oficial BCV)
  try {
    const r = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", { cache: "no-store" });
    const j = await r.json();
    const v = Number(j.promedio || j.venta);
    if (v > 0) { rate = v; source = "dolarapi/BCV"; }
  } catch (_) { /* siguiente fuente */ }

  // Fuente 2: open.er-api (referencia de mercado)
  if (!rate) {
    try {
      const r = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
      const j = await r.json();
      const v = Number(j.rates && j.rates.VES);
      if (v > 0) { rate = v; source = "open.er-api"; }
    } catch (_) { /* respaldo manual */ }
  }

  // Fuente 3: valor manual de respaldo
  if (!rate) {
    rate = DEFAULT_BCV_RATE;
    source = "manual";
  }

  applyRate(rate, source, false);
  try {
    localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({ rate, source, time: Date.now() }));
  } catch (_) { /* almacenamiento no disponible */ }

  refreshBtn.classList.remove("loading");
}

function applyRate(rate, source, fromCache) {
  state.rate = rate;
  state.rateSource = source;

  $("#rateValue").textContent =
    "Bs. " + rate.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const dot = $("#rateDot");
  const color = source === "manual" ? "var(--amber)" : "var(--green)";
  dot.style.background = color;
  dot.style.boxShadow = "0 0 8px " + color;

  const labels = {
    "dolarapi/BCV": "oficial BCV",
    "open.er-api": "referencia",
    "manual": "manual (revisar)",
  };
  $("#rateRefresh").title =
    `Tasa ${labels[source] || source} — ${fromCache ? "caché local" : "actualizada ahora"}. USD 1 = Bs. ${rate.toFixed(2)}`;

  // Repintar precios con la nueva tasa
  renderProducts();
  renderCart();
}

// ---------- Categorías ----------
function renderCategories() {
  const bar = $("#categoryBar");
  bar.innerHTML = CATEGORIES.map((cat) => {
    const count = cat.id === "todos"
      ? CATALOG.length
      : CATALOG.filter((p) => p.category === cat.id).length;
    return `
      <button class="chip ${state.category === cat.id ? "active" : ""}" data-cat="${cat.id}">
        <span>${cat.icon}</span> ${cat.label}
        <span style="opacity:.65">(${count})</span>
      </button>`;
  }).join("");

  bar.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.category = chip.dataset.cat;
      renderCategories();
      renderProducts();
    });
  });
}

// ---------- Productos filtrados ----------
function getFiltered() {
  let list = [...CATALOG];

  if (state.category !== "todos") {
    list = list.filter((p) => p.category === state.category);
  }

  if (state.query.trim()) {
    const q = state.query.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        categoryLabel(p.category).toLowerCase().includes(q)
    );
  }

  switch (state.sort) {
    case "price-asc":  list.sort((a, b) => a.price - b.price); break;
    case "price-desc": list.sort((a, b) => b.price - a.price); break;
    case "rating":     list.sort((a, b) => b.rating - a.rating); break;
    case "name":       list.sort((a, b) => a.name.localeCompare(b.name, "es")); break;
  }

  return list;
}

// ---------- Render de la cuadrícula ----------
function renderProducts() {
  const grid = $("#productGrid");
  if (!grid) return;

  const list = getFiltered();

  $("#resultsCount").innerHTML =
    `Mostrando <strong>${list.length}</strong> de <strong>${CATALOG.length}</strong> productos` +
    (state.category !== "todos" ? ` en <strong>${categoryLabel(state.category)}</strong>` : "") +
    (state.query ? ` para "<strong>${escapeHtml(state.query)}</strong>"` : "");

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty">
        <div class="e-icon">🔍</div>
        <h3>No encontramos productos</h3>
        <p>Prueba con otra búsqueda o selecciona otra categoría.</p>
      </div>`;
    return;
  }

  grid.innerHTML = list
    .map(
      (p, i) => `
      <article class="card" style="animation-delay:${Math.min(i * 30, 300)}ms">
        <div class="card-media" style="background:${CATEGORY_COLORS[p.category]}">
          ${p.badge ? `<span class="badge ${p.badge === "Nuevo" ? "new" : ""}">${p.badge}</span>` : ""}
          <span class="stock-tag">📦 ${p.stock} disp.</span>
          ${mediaHtml(p)}
        </div>
        <div class="card-body">
          <span class="card-cat">${categoryLabel(p.category)}</span>
          <h3 class="card-title">${p.name}</h3>
          <div class="stars">${stars(p.rating)}<span class="rev">${p.rating} (${p.reviews})</span></div>
          <div class="price-row">
            <span class="price">${p.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            ${p.oldPrice ? `<span class="price-old">${p.oldPrice.toFixed(2)}</span>` : ""}
            <span class="price-bs">≈ <b>${formatBs(p.price)}</b> a tasa BCV</span>
          </div>
          <div class="card-actions">
            <button class="btn-add" data-add="${p.id}">🛒 Agregar</button>
            <button class="btn-view" data-view="${p.id}">👁️ Ver</button>
            ${adminEditHtml(p.id)}
          </div>
        </div>
      </article>`
    )
    .join("");

  grid.querySelectorAll("[data-add]").forEach((btn) =>
    btn.addEventListener("click", () => addToCart(Number(btn.dataset.add)))
  );
  grid.querySelectorAll("[data-view]").forEach((btn) =>
    btn.addEventListener("click", () => openModal(Number(btn.dataset.view)))
  );
  grid.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => window.TVAdmin && TVAdmin.openEditor(Number(btn.dataset.edit)))
  );
}

// ---------- Modal de producto ----------
function openModal(id) {
  const p = CATALOG.find((x) => x.id === id);
  if (!p) return;

  $("#modalMedia").style.background = CATEGORY_COLORS[p.category];
  $("#modalMedia").innerHTML = mediaHtml(p);

  $("#modalBody").innerHTML = `
    <span class="card-cat">${categoryLabel(p.category)} ${p.badge ? "• " + p.badge : ""}</span>
    <h3>${p.name}</h3>
    <div class="stars">${stars(p.rating)}<span class="rev">${p.rating} — ${p.reviews} reseñas</span></div>
    <p class="desc">${p.desc}</p>
    <div class="modal-meta">
      <span class="ok">✔ En stock (${p.stock} disponibles)</span>
      <span>🛡️ Garantía 12 meses</span>
      <span>🚚 Envío a todo el país</span>
    </div>
    <div class="price-row">
      <span class="price" style="font-size:1.6rem">${p.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
      ${p.oldPrice ? `<span class="price-old">${p.oldPrice.toFixed(2)}</span>` : ""}
      <span class="price-bs">≈ <b>${formatBs(p.price)}</b> a tasa BCV (${(state.rate || DEFAULT_BCV_RATE).toFixed(2)} Bs./USD)</span>
    </div>
    <button class="btn btn-primary" data-add="${p.id}" style="margin-top:8px">🛒 Agregar al carrito</button>
  `;

  $("#modalBody [data-add]").addEventListener("click", () => {
    addToCart(p.id);
    closeModal();
  });

  $("#modalOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  $("#modalOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

// ---------- Carrito ----------
function saveCart() {
  localStorage.setItem("tvzla_cart", JSON.stringify(state.cart));
  renderCart();
}

function addToCart(id) {
  const p = CATALOG.find((x) => x.id === id);
  if (!p) return;

  const item = state.cart.find((x) => x.id === id);
  if (item) {
    if (item.qty >= p.stock) {
      showToast(`⚠️ Solo hay ${p.stock} unidades disponibles de ${p.name}`);
      return;
    }
    item.qty++;
  } else {
    state.cart.push({ id, qty: 1 });
  }

  saveCart();
  showToast(`✅ "${p.name}" agregado — ${formatUSD(p.price)}`);
  const count = $("#cartCount");
  count.classList.remove("bump");
  void count.offsetWidth; // reinicia la animación
  count.classList.add("bump");
}

function changeQty(id, delta) {
  const item = state.cart.find((x) => x.id === id);
  if (!item) return;

  const p = CATALOG.find((x) => x.id === id);
  const next = item.qty + delta;

  if (next < 1) {
    removeItem(id);
    return;
  }
  if (next > p.stock) {
    showToast(`⚠️ Solo hay ${p.stock} unidades disponibles`);
    return;
  }

  item.qty = next;
  saveCart();
}

function removeItem(id) {
  state.cart = state.cart.filter((x) => x.id !== id);
  saveCart();
}

function cartTotals() {
  return state.cart.reduce(
    (acc, item) => {
      const p = CATALOG.find((x) => x.id === item.id);
      if (!p) return acc;
      acc.qty += item.qty;
      acc.total += p.price * item.qty;
      return acc;
    },
    { qty: 0, total: 0 }
  );
}

function renderCart() {
  const box = $("#drawerItems");
  if (!box) return;

  // Quitar del carrito productos que ya no existen en el catálogo
  const before = state.cart.length;
  state.cart = state.cart.filter((it) => CATALOG.find((p) => p.id === it.id));
  if (state.cart.length !== before) {
    localStorage.setItem("tvzla_cart", JSON.stringify(state.cart));
  }

  const { qty, total } = cartTotals();

  $("#cartCount").textContent = qty;
  $("#subtotal").textContent = formatUSD(total);
  $("#grandTotal").childNodes[0].nodeValue = formatUSD(total);
  $("#grandTotalBs").textContent = "≈ " + formatBs(total) + " a tasa BCV";

  if (state.cart.length === 0) {
    box.innerHTML = `
      <div class="cart-empty">
        <div class="e-icon">🛒</div>
        <p>Tu carrito está vacío</p>
        <p style="font-size:.78rem;margin-top:6px">¡Agrega productos del catálogo!</p>
      </div>`;
    return;
  }

  box.innerHTML = state.cart
    .map((item) => {
      const p = CATALOG.find((x) => x.id === item.id);
      return `
        <div class="cart-item">
          <div class="ci-icon" style="background:${CATEGORY_COLORS[p.category]}">${mediaHtml(p)}</div>
          <div>
            <div class="ci-name">${p.name}</div>
            <div class="ci-price">${formatUSD(p.price * item.qty)}<small>≈ ${formatBs(p.price * item.qty)}</small></div>
            <div class="qty">
              <button data-dec="${p.id}" aria-label="Restar">−</button>
              <span>${item.qty}</span>
              <button data-inc="${p.id}" aria-label="Sumar">+</button>
            </div>
          </div>
          <button class="ci-remove" data-del="${p.id}" aria-label="Eliminar">🗑️</button>
        </div>`;
    })
    .join("");

  box.querySelectorAll("[data-inc]").forEach((b) =>
    b.addEventListener("click", () => changeQty(Number(b.dataset.inc), 1))
  );
  box.querySelectorAll("[data-dec]").forEach((b) =>
    b.addEventListener("click", () => changeQty(Number(b.dataset.dec), -1))
  );
  box.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => removeItem(Number(b.dataset.del)))
  );
}

function openDrawer() {
  $("#drawer").classList.add("open");
  $("#drawerOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  $("#drawer").classList.remove("open");
  $("#drawerOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

// ---------- Pedido por WhatsApp ----------
function checkout() {
  if (state.cart.length === 0) {
    showToast("🛒 Tu carrito está vacío");
    return;
  }

  const rate = state.rate || DEFAULT_BCV_RATE;

  const lines = state.cart.map((item, i) => {
    const p = CATALOG.find((x) => x.id === item.id);
    const sub = p.price * item.qty;
    return (
      `${i + 1}. ${p.name}\n` +
      `   ${item.qty} x ${formatUSD(p.price)} = ${formatUSD(sub)}  (≈ Bs. ${(sub * rate).toLocaleString("es-VE", { maximumFractionDigits: 2 })})`
    );
  });

  const { total } = cartTotals();

  const msg =
    `*🛍️ NUEVO PEDIDO — TecnoVision.vzla*\n\n` +
    `*Productos:*\n${lines.join("\n")}\n\n` +
    `*Total: ${formatUSD(total)}*  (≈ Bs. ${(total * rate).toLocaleString("es-VE", { maximumFractionDigits: 2 })})\n` +
    `_Tasa BCV aplicada: 1 USD = Bs. ${rate.toFixed(2)}_\n\n` +
    `_Quedo atento a la confirmación y el envío._`;

  window.open(`https://wa.me/${WHATSAPP_NUM}?text=${encodeURIComponent(msg)}`, "_blank");
}

// ---------- Eventos globales ----------
function bindEvents() {
  // Búsqueda
  $("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.query = $("#searchInput").value;
    renderProducts();
    document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
  });

  $("#searchInput").addEventListener("input", (e) => {
    state.query = e.target.value;
    renderProducts();
  });

  // Orden
  $("#sortSelect").addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderProducts();
  });

  // Carrito
  $("#cartOpen").addEventListener("click", openDrawer);
  $("#drawerClose").addEventListener("click", closeDrawer);
  $("#drawerOverlay").addEventListener("click", closeDrawer);
  $("#clearCart").addEventListener("click", () => {
    if (state.cart.length && confirm("¿Seguro que quieres vaciar el carrito?")) {
      state.cart = [];
      saveCart();
      showToast("🗑️ Carrito vaciado");
    }
  });
  $("#checkoutBtn").addEventListener("click", checkout);

  // Modal
  $("#modalClose").addEventListener("click", closeModal);
  $("#modalOverlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeDrawer();
    }
  });

  // Tasa
  $("#rateRefresh").addEventListener("click", () => fetchRate(true));

  // CTA del hero y enlaces del footer
  document.querySelectorAll("[data-category]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      state.category = el.dataset.category;
      renderCategories();
      renderProducts();
      document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
    })
  );

  document.querySelectorAll("[data-scroll]").forEach((el) =>
    el.addEventListener("click", () =>
      document.getElementById(el.dataset.scroll).scrollIntoView({ behavior: "smooth" })
    )
  );
}

// ---------- API para el panel de administración ----------
window.TVApp = {
  getCatalog: () => CATALOG,
  getAdminStore: () => ADMIN_DATA,
  persistAdmin() {
    try {
      localStorage.setItem("tvzla_overrides", JSON.stringify(ADMIN_DATA.overrides));
      localStorage.setItem("tvzla_added", JSON.stringify(ADMIN_DATA.added));
      localStorage.setItem("tvzla_deleted", JSON.stringify(ADMIN_DATA.deleted));
    } catch (_) {
      showToast("⚠️ No se pudo guardar: espacio de almacenamiento lleno");
    }
    rebuildCatalog();
    renderAll();
  },
  renderAll() {
    renderCategories();
    renderProducts();
    renderCart();
  },
};

// ---------- Inicio ----------
renderCategories();
renderProducts();
renderCart();
bindEvents();
fetchRate(); // carga tasa BCV (caché o API)
