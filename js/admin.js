/* =========================================================
   TecnoVision.vzla - Panel de administración
   Registro de cuenta propio (el usuario crea su usuario y contraseña)
   - Agregar productos nuevos (con imagen propia comprimida)
   - Editar precio, imagen, categoría, stock, etc. de cualquier producto
   - Eliminar productos y restablecer el catálogo
   Los cambios se guardan en el navegador (localStorage).
   ========================================================= */

(function () {
  const $ = (s) => document.querySelector(s);

  const IMG_MAX = 512; // px máximo de las imágenes subidas (se comprimen)

  const ACCOUNT_KEY = "tvzla_admin_account"; // { user, hash, hint }

  let editingId = null;   // id en edición, null = modo agregar
  let pendingImage = null; // dataURL de la imagen seleccionada

  const app = () => window.TVApp;
  const flash = (m) => window.showToast(m);

  // ---------- Cuenta de administrador ----------
  // La contraseña se guarda como hash (no en texto plano).
  async function hashPass(user, pass) {
    const data = new TextEncoder().encode("tvzla::" + user.toLowerCase() + "::" + pass);
    if (window.crypto && window.crypto.subtle) {
      try {
        const buf = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      } catch (_) { /* sigue al respaldo */ }
    }
    // Respaldo simple (navegadores sin crypto.subtle fuera de contexto seguro)
    let h = 0;
    const s = "tvzla::" + user.toLowerCase() + "::" + pass;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return "fb" + (h >>> 0).toString(16);
  }

  function getAccount() {
    try {
      const a = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
      if (a && a.user && a.hash) return a;
    } catch (_) { /* ignorar */ }
    return null;
  }

  function saveAccount(acc) {
    try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(acc)); } catch (_) { /* no disponible */ }
  }

  // Verifica contra la cuenta registrada (no hay usuario de fábrica)
  async function checkCredentials(user, pass) {
    const acc = getAccount();
    if (!acc) return false;
    const h = await hashPass(acc.user, pass);
    return user.toLowerCase() === acc.user.toLowerCase() && h === acc.hash;
  }

  async function registerAccount(user, pass, hint) {
    const acc = { user, hash: await hashPass(user, pass), hint: hint || "" };
    saveAccount(acc);
    return acc;
  }

  // ---------- Sesión ----------
  function logged() {
    return sessionStorage.getItem("tvzla_admin") === "1" || sessionStorage.getItem("tvzla_admin_token");
  }

  function refreshUI() {
    const panelBtn = $("#adminPanelBtn");
    if (panelBtn) panelBtn.style.display = logged() ? "flex" : "none";
    const link = $("#adminLoginBtn");
    if (link) link.textContent = logged() ? "⚙️ Panel admin" : "🔐 Admin";
  }

  // ---------- Login / Registro ----------
  function showTab(which) {
    const isLogin = which === "login";
    $("#tabLogin").classList.toggle("active", isLogin);
    $("#tabRegister").classList.toggle("active", !isLogin);
    $("#adminLoginForm").style.display = isLogin ? "" : "none";
    $("#adminRegisterForm").style.display = isLogin ? "none" : "";
    $("#adminCardIcon").textContent = isLogin ? "🔐" : "📝";
    $("#adminCardTitle").textContent = isLogin ? "Acceso administrador" : "Crear mi cuenta";
    $("#adminLoginErr").textContent = "";
    $("#adminRegErr").textContent = "";
    setTimeout(() => (isLogin ? $("#adminUser") : $("#regUser")).focus(), 80);
  }

  function applyTabsVisibility() {
    // Registro deshabilitado: solo inicio de sesión
  }

  function openLogin() {
    $("#adminLoginErr").textContent = "";
    $("#adminUser").value = "";
    $("#adminPass").value = "";
    $("#adminLoginOverlay").classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(() => $("#adminUser").focus(), 80);
  }

  function closeLogin() {
    $("#adminLoginOverlay").classList.remove("open");
    document.body.style.overflow = "";
  }

  async function login(e) {
    e.preventDefault();
    const u = $("#adminUser").value.trim();
    const p = $("#adminPass").value;
    if (!u || !p) {
      $("#adminLoginErr").textContent = "Escribe usuario y contraseña.";
      return;
    }
    // Intentar login contra API
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.token) {
        sessionStorage.setItem("tvzla_admin", "1");
        sessionStorage.setItem("tvzla_admin_token", data.token);
        sessionStorage.setItem("tvzla_admin_user", data.user || u);
        closeLogin();
        refreshUI();
        if (typeof app === "function" && app().renderAll) app().renderAll();
        if (typeof loadCategoriesFromAPI === "function") loadCategoriesFromAPI();
        welcomeThenPanel();
        return;
      }
      if (data.error) {
        $("#adminLoginErr").textContent = data.error;
        $("#adminPass").value = "";
        return;
      }
    } catch (_) {
      // fallback a local
    }
    if (await checkCredentials(u, p)) {
      sessionStorage.setItem("tvzla_admin", "1");
      closeLogin();
      refreshUI();
      if (typeof app === "function" && app().renderAll) app().renderAll();
      welcomeThenPanel();
    } else {
      $("#adminLoginErr").textContent = "Usuario o contraseña incorrectos.";
      $("#adminPass").value = "";
    }
  }

  // Registro deshabilitado (solo admin fijo)
  async function register(e) {
    if (e && e.preventDefault) e.preventDefault();
    if ($("#adminRegErr")) $("#adminRegErr").textContent = "Registro deshabilitado.";
  }

  // ---------- Animación del CEO (bienvenida y despedida, 6 s) ----------
  let ceoTimer = null;

  function playCeoAnimation(opts) {
    const overlay = $("#ceoOverlay");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!overlay || reduced) {
      if (opts.onDone) opts.onDone();
      return;
    }

    $("#ceoEyebrow").textContent = opts.eyebrow;
    $("#ceoTitle").textContent = opts.title;
    $("#ceoSub").textContent = opts.sub;
    $("#ceoHint").textContent = opts.hint || "clic para continuar";

    const finish = () => {
      if (!overlay.classList.contains("show")) return;
      clearTimeout(ceoTimer);
      overlay.removeEventListener("click", finish);
      overlay.classList.remove("show");
      document.body.style.overflow = "";
      if (opts.onDone) opts.onDone();
    };

    overlay.addEventListener("click", finish);
    overlay.classList.add("show");
    document.body.style.overflow = "hidden";
    ceoTimer = setTimeout(finish, 6000);
  }

  function welcomeThenPanel() {
    playCeoAnimation({
      eyebrow: "Acceso autorizado",
      title: "¡Bienvenido, CEO!",
      sub: "TecnoVision.vzla · Panel de administración",
      hint: "Abriendo panel... · clic para continuar",
      onDone: openPanel,
    });
  }

  function goodbyeThenExit() {
    closePanel();
    sessionStorage.removeItem("tvzla_admin");
    refreshUI();
    app().renderAll();

    playCeoAnimation({
      eyebrow: "Sesión finalizada",
      title: "¡Hasta pronto, CEO!",
      sub: "Gracias por tu trabajo en TecnoVision.vzla",
      hint: "Cerrando sesión... · clic para continuar",
      onDone: () => flash("👋 Sesión de administrador cerrada"),
    });
  }

  function logout() {
    try {
      sessionStorage.removeItem("tvzla_admin_token");
      sessionStorage.removeItem("tvzla_admin_user");
    } catch (_) {}
    goodbyeThenExit();
  }

  // ---------- Gestión de categorías ----------
  function renderAdminCategories() {
    const listEl = $("#admCatsList");
    if (!listEl) return;
    if (typeof rebuildCategories === "function") rebuildCategories();
    const cats = (window.TVApp && TVApp.getCategories ? TVApp.getCategories() : (typeof CATEGORIES !== "undefined" ? CATEGORIES : []))
      .filter(c => c.id !== "todos");
    const custom = typeof getCustomCategories === "function" ? getCustomCategories() : [];
    if (cats.length === 0) {
      listEl.innerHTML = '<span class="adm-empty">Sin categorías adicionales.</span>';
      return;
    }
    listEl.innerHTML = cats.map(c => {
      const isCustom = custom.find(x => x.id === c.id);
      return `<div class="adm-cat-chip">
        <span>${c.icon || "🏷️"} ${escapeHtml(c.label)}</span>
        ${isCustom ? `<button type="button" class="adm-cat-del" data-delcat="${c.id}" title="Eliminar categoría">✕</button>` : `<span class="adm-cat-base" title="Categoría base">Base</span>`}
      </div>`;
    }).join("");
    listEl.querySelectorAll("[data-delcat]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.delcat;
        if (window.TVApp && TVApp.removeCustomCategory) {
          TVApp.removeCustomCategory(id);
        }
        renderAdminCategories();
        // actualizar selects
        if (typeof populateCategorySelect === "function") populateCategorySelect();
        if (typeof app === "function" && app().renderAll) app().renderAll();
        flash("Categoría eliminada");
      });
    });
  }

  function addAdminCategory() {
    const labelEl = $("#admCatLabel");
    const iconEl = $("#admCatIcon");
    const label = labelEl ? labelEl.value : "";
    const icon = iconEl ? iconEl.value : "";
    if (!label || !label.trim()) {
      flash("Escribe el nombre de la categoría");
      return;
    }
    const cat = { label: label.trim(), icon: icon.trim() || "🏷️" };
    if (window.TVApp && TVApp.addCustomCategory) {
      const ok = TVApp.addCustomCategory(cat);
      if (!ok) {
        flash("No se pudo agregar la categoría (ya existe)");
        return;
      }
    }
    if (labelEl) labelEl.value = "";
    if (iconEl) iconEl.value = "";
    renderAdminCategories();
    if (typeof populateCategorySelect === "function") populateCategorySelect();
    if (typeof app === "function" && app().renderAll) app().renderAll();
    flash("Categoría agregada");
  }

  function populateCategorySelect() {
    const sel = $("#fCat");
    if (!sel) return;
    if (typeof rebuildCategories === "function") rebuildCategories();
    const cats = (window.TVApp && TVApp.getCategories ? TVApp.getCategories() : (typeof CATEGORIES !== "undefined" ? CATEGORIES : []))
      .filter(c => c.id !== "todos");
    const current = sel.value;
    sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.icon || "🏷️"} ${escapeHtml(c.label)}</option>`).join("");
    if (cats.find(c => c.id === current)) {
      sel.value = current;
    }
  }

  // ---------- Panel ----------
  function openPanel() {
    if (!logged()) { openLogin(); return; }
    $("#adminPanelOverlay").classList.add("open");
    document.body.style.overflow = "hidden";
    renderStats();
    renderList();
    renderAdminCategories();
    populateCategorySelect();
  }

  function closePanel() {
    $("#adminPanelOverlay").classList.remove("open");
    document.body.style.overflow = "";
  }

  function renderStats() {
    const cat = app().getCatalog();
    const ofertas = cat.filter((p) => p.badge === "Oferta").length;
    const nuevos = cat.filter((p) => p.badge === "Nuevo").length;
    $("#admStats").innerHTML =
      `<span><b>${cat.length}</b> productos</span>` +
      `<span><b>${ofertas}</b> en oferta</span>` +
      `<span><b>${nuevos}</b> nuevos</span>` +
      `<span><b>${new Set(cat.map((p) => p.category)).size}</b> categorías activas</span>`;
  }

  // ---------- Lista de productos ----------
  function renderList() {
    const q = ($("#admSearch").value || "").toLowerCase().trim();
    const list = app()
      .getCatalog()
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.includes(q));

    $("#admList").innerHTML =
      list
        .map(
          (p) => `
      <div class="adm-row ${editingId === p.id ? "editing" : ""}">
        <div class="adm-thumb" style="background:${CATEGORY_COLORS[p.category] || "#1b2138"}">
          ${p.image ? `<img src="${p.image}" alt="" />` : p.icon}
        </div>
        <div class="adm-row-info">
          <span class="adm-row-name">${escapeHtml(p.name)}</span>
          <span class="adm-row-meta">$${p.price.toFixed(2)} · ${categoryLabel(p.category)} · stock ${p.stock}${p.badge ? " · " + p.badge : ""}</span>
        </div>
        <div class="adm-row-actions">
          <button class="adm-btn" data-edit="${p.id}" title="Editar">✏️</button>
          <button class="adm-btn adm-btn-danger" data-del="${p.id}" title="Eliminar">🗑️</button>
        </div>
      </div>`
        )
        .join("") || `<p class="adm-empty">Sin resultados para "${escapeHtml(q)}".</p>`;

    $("#admList").querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () => startEdit(Number(b.dataset.edit)))
    );
    $("#admList").querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => removeProduct(Number(b.dataset.del)))
    );
  }

  // ---------- Formulario (agregar / editar) ----------
  function fillForm(p) {
    $("#fName").value = p ? p.name : "";
    $("#fCat").value = p ? p.category : "tecnologia";
    $("#fPrice").value = p ? p.price : "";
    $("#fOld").value = p && p.oldPrice ? p.oldPrice : "";
    $("#fStock").value = p ? p.stock : 10;
    $("#fBadge").value = p && p.badge ? p.badge : "";
    $("#fRating").value = p ? p.rating : 4.5;
    $("#fIcon").value = p ? p.icon : "📦";
    $("#fDesc").value = p ? p.desc : "";
    pendingImage = p && p.image ? p.image : null;
    updatePreview();
  }

  function updatePreview() {
    const box = $("#admPreview");
    const cat = $("#fCat").value;
    box.style.background = CATEGORY_COLORS[cat] || "#1b2138";
    box.innerHTML = pendingImage
      ? `<img src="${pendingImage}" alt="preview" />`
      : ($("#fIcon").value.trim() || "📦");
  }

  function startEdit(id) {
    const p = app().getCatalog().find((x) => x.id === id);
    if (!p) return;
    editingId = id;
    fillForm(p);
    $("#admFormTitle").textContent = "✏️ Editando: " + p.name;
    $("#admSave").textContent = "💾 Guardar cambios";
    $("#admCancel").style.display = "inline-block";
    $("#admForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    editingId = null;
    $("#admFormTitle").textContent = "➕ Nuevo producto";
    $("#admSave").textContent = "➕ Agregar producto";
    $("#admCancel").style.display = "none";
    $("#admForm").reset();
    $("#fStock").value = 10;
    $("#fRating").value = 4.5;
    $("#fIcon").value = "📦";
    pendingImage = null;
    updatePreview();
    renderList();
  }

  function nextId() {
    const ids = app().getCatalog().map((p) => p.id);
    return ids.length ? Math.max.apply(null, ids) + 1 : 1;
  }

  async function saveProduct(e) {
    e.preventDefault();
    const name = $("#fName").value.trim();
    const price = parseFloat($("#fPrice").value);
    if (!name || !(price > 0)) {
      flash("⚠️ El nombre y un precio válido son obligatorios");
      return;
    }

    const data = {
      name,
      category: $("#fCat").value,
      price,
      oldPrice: parseFloat($("#fOld").value) || null,
      stock: Math.max(0, parseInt($("#fStock").value, 10) || 0),
      badge: $("#fBadge").value || null,
      rating: Math.min(5, Math.max(1, parseFloat($("#fRating").value) || 4.5)),
      icon: $("#fIcon").value.trim() || "📦",
      desc: $("#fDesc").value.trim() || "Sin descripción.",
      image: pendingImage || null,
    };

    const token = sessionStorage.getItem("tvzla_admin_token");
    if (token && typeof CATALOG_LOADED_FROM_API !== "undefined" && window.CATALOG_LOADED_FROM_API) {
      try {
        if (editingId === null) {
          const res = await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify(data)
          });
          const jd = await res.json().catch(() => ({}));
          if (!res.ok) { flash(jd.error || "Error al guardar"); return; }
          flash(`✅ "${name}" agregado al catálogo`);
        } else {
          const res = await fetch("/api/products/" + editingId, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify(data)
          });
          const jd = await res.json().catch(() => ({}));
          if (!res.ok) { flash(jd.error || "Error al guardar"); return; }
          flash(`✅ "${name}" actualizado`);
        }
        cancelEdit();
        if (typeof loadCatalogFromAPI === "function") await loadCatalogFromAPI();
        if (typeof app === "function" && app().renderAll) app().renderAll();
        renderStats();
        renderList();
        return;
      } catch (err) {
        flash("Error al guardar en base de datos");
        return;
      }
    }

    const store = app().getAdminStore();

    if (editingId === null) {
      store.added.push(Object.assign({ id: nextId(), reviews: 0 }, data));
      app().persistAdmin();
      flash(`✅ "${name}" agregado al catálogo`);
    } else {
      const inAdded = store.added.find((x) => x.id === editingId);
      if (inAdded) {
        Object.assign(inAdded, data);
      } else {
        store.overrides[editingId] = Object.assign({}, store.overrides[editingId], data);
      }
      app().persistAdmin();
      flash(`✅ "${name}" actualizado`);
    }

    cancelEdit();
    renderStats();
  }

  async function removeProduct(id) {
    const p = app().getCatalog().find((x) => x.id === id);
    if (!p) return;
    if (!confirm(`¿Eliminar "${p.name}" del catálogo?\n(Puedes restablecer el catálogo después)`)) return;

    const token = sessionStorage.getItem("tvzla_admin_token");
    if (token && typeof CATALOG_LOADED_FROM_API !== "undefined" && window.CATALOG_LOADED_FROM_API) {
      try {
        const res = await fetch("/api/products/" + id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + token }
        });
        const jd = await res.json().catch(() => ({}));
        if (!res.ok) { flash(jd.error || "Error al eliminar"); return; }
        if (editingId === id) cancelEdit();
        if (typeof loadCatalogFromAPI === "function") await loadCatalogFromAPI();
        if (typeof app === "function" && app().renderAll) app().renderAll();
        renderStats();
        renderList();
        flash("🗑️ Producto eliminado del catálogo");
        return;
      } catch (err) {
        flash("Error al eliminar");
        return;
      }
    }

    const store = app().getAdminStore();
    const i = store.added.findIndex((x) => x.id === id);
    if (i >= 0) store.added.splice(i, 1);
    else if (!store.deleted.includes(id)) store.deleted.push(id);
    delete store.overrides[id];

    if (editingId === id) cancelEdit();
    app().persistAdmin();
    renderStats();
    renderList();
    flash("🗑️ Producto eliminado del catálogo");
  }

  // ---------- Imagen ----------
  function handleImage(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      flash("⚠️ Selecciona un archivo de imagen válido");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, IMG_MAX / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        pendingImage = c.toDataURL(
          file.type === "image/png" ? "image/png" : "image/jpeg",
          0.82
        );
        updatePreview();
        flash("🖼️ Imagen lista — recuerda guardar los cambios");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // ---------- Cambiar credenciales ----------
  function openCred() {
    const acc = getAccount();
    $("#credCurrent").value = "";
    $("#credUser").value = acc ? acc.user : "";
    $("#credNew").value = "";
    $("#credNew2").value = "";
    $("#credHint").value = acc && acc.hint ? acc.hint : "";
    $("#adminCredErr").textContent = "";
    $("#adminCredOverlay").classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(() => $("#credCurrent").focus(), 80);
  }

  function closeCred() {
    $("#adminCredOverlay").classList.remove("open");
    document.body.style.overflow = "";
  }

  async function saveCred(e) {
    e.preventDefault();
    const acc = getAccount();
    const current = $("#credCurrent").value;
    const user = $("#credUser").value.trim();
    const pass = $("#credNew").value;
    const pass2 = $("#credNew2").value;
    const hint = $("#credHint").value.trim();

    if (!user || user.length < 3) { $("#adminCredErr").textContent = "El usuario debe tener al menos 3 caracteres."; return; }
    if (!/^[A-Za-z0-9._-]+$/.test(user)) { $("#adminCredErr").textContent = "El usuario solo admite letras, números, punto, guion y guion bajo."; return; }

    // Verificar la contraseña actual
    const currentUser = acc ? acc.user : "";
    const currentPassStr = current;
    if (!(await checkCredentials(currentUser, currentPassStr))) {
      $("#adminCredErr").textContent = "La contraseña actual es incorrecta.";
      return;
    }

    if (pass || pass2) {
      if (pass.length < 4) { $("#adminCredErr").textContent = "La contraseña nueva debe tener al menos 4 caracteres."; return; }
      if (pass !== pass2) { $("#adminCredErr").textContent = "Las contraseñas nuevas no coinciden."; return; }
    }

    const finalAcc = await registerAccount(user, pass || current, hint);
    saveAccount(finalAcc);
    flash("✅ Credenciales actualizadas");
    closeCred();
  }

  // ---------- Utilidades del panel ----------
  function exportJSON() {
    const data = JSON.stringify(app().getCatalog(), null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    a.download = "tecnovision-catalogo.json";
    a.click();
    URL.revokeObjectURL(a.href);
    flash("📤 Catálogo exportado (respaldo JSON)");
  }

  function resetAll() {
    if (!confirm("¿Restablecer el catálogo original de 21 productos?\nSe borrarán productos agregados y todas las ediciones.")) return;
    const store = app().getAdminStore();
    store.overrides = {};
    store.added = [];
    store.deleted = [];
    app().persistAdmin();
    cancelEdit();
    renderStats();
    renderList();
    flash("♻️ Catálogo restablecido al original");
  }

  // ---------- Inicio ----------
  function init() {
    // Select de categorías del formulario
    if (typeof populateCategorySelect === "function") {
      populateCategorySelect();
    } else if ($("#fCat")) {
      if (typeof rebuildCategories === "function") rebuildCategories();
      const cats = (typeof CATEGORIES !== "undefined" ? CATEGORIES : []).filter((c) => c.id !== "todos");
      $("#fCat").innerHTML = cats.map((c) => `<option value="${c.id}">${c.icon || "🏷️"} ${c.label}</option>`).join("");
    }

    // Login
    $("#adminLoginBtn").addEventListener("click", () => (logged() ? openPanel() : openLogin()));
    $("#adminLoginClose").addEventListener("click", closeLogin);
    $("#adminLoginForm").addEventListener("submit", login);
    if ($("#adminRegisterForm")) $("#adminRegisterForm").addEventListener("submit", register);
    if ($("#tabLogin")) $("#tabLogin").addEventListener("click", () => {});
    if ($("#tabRegister")) $("#tabRegister").addEventListener("click", () => {});
    $("#adminLoginOverlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeLogin();
    });

    // Panel
    $("#adminPanelBtn").addEventListener("click", openPanel);
    $("#adminPanelClose").addEventListener("click", closePanel);
    $("#admLogout").addEventListener("click", logout);
    $("#admExport").addEventListener("click", exportJSON);
    $("#admReset").addEventListener("click", resetAll);
    if ($("#admCredentials")) $("#admCredentials").addEventListener("click", openCred);

    // Cambiar credenciales (oculto/deshabilitado)
    if ($("#adminCredClose")) $("#adminCredClose").addEventListener("click", closeCred);
    if ($("#adminCredForm")) $("#adminCredForm").addEventListener("submit", (e)=>{ e.preventDefault(); flash("Credenciales fijas"); closeCred(); });
    if ($("#adminCredOverlay")) $("#adminCredOverlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeCred();
    });

    // Categorías personalizadas
    const catAddBtn = $("#admCatAdd");
    if (catAddBtn) catAddBtn.addEventListener("click", addAdminCategory);
    const catLabelIn = $("#admCatLabel");
    if (catLabelIn) catLabelIn.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addAdminCategory();
      }
    });
    const catIconIn = $("#admCatIcon");
    if (catIconIn) catIconIn.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addAdminCategory();
      }
    });

    // Formulario
    $("#admForm").addEventListener("submit", saveProduct);
    $("#admCancel").addEventListener("click", cancelEdit);
    $("#fImage").addEventListener("change", (e) => handleImage(e.target.files[0]));
    $("#fCat").addEventListener("change", updatePreview);
    $("#fIcon").addEventListener("input", updatePreview);
    $("#admSearch").addEventListener("input", renderList);

    // Escape cierra los paneles
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if ($("#adminCredOverlay").classList.contains("open")) closeCred();
        else if ($("#adminPanelOverlay").classList.contains("open")) closePanel();
        else if ($("#adminLoginOverlay").classList.contains("open")) closeLogin();
      }
    });

    // API para app.js (botón ✏️ en las tarjetas)
    window.TVAdmin = {
      isLoggedIn: logged,
      openEditor: (id) => { openPanel(); startEdit(id); },
      hasAccount: () => !!getAccount(),
      currentUser: () => { const a = getAccount(); return a ? a.user : ""; },
    };

    refreshUI();
    updatePreview();
    app().renderAll(); // refresca por si ya había sesión iniciada
  }

  init();
})();
