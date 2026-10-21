/* =========================================================
   TecnoVision.vzla - Catálogo de productos
   19 productos reales con fotografía propia (tema negro),
   distribuidos en 5 categorías:
   Tecnología (7) | Hogar (3) | Herramientas (4) | Audífonos (2) | Cámaras (3)
   PRECIOS BASE EN DÓLARES (USD). La conversión a Bs. se hace
   en app.js con la tasa BCV oficial del día.
   ========================================================= */

const CATEGORIES = [
  { id: "todos",        label: "Todos",        icon: "🛍️" },
  { id: "tecnologia",   label: "Tecnología",   icon: "💻" },
  { id: "hogar",        label: "Hogar",        icon: "🏠" },
  { id: "herramientas", label: "Herramientas", icon: "🔧" },
  { id: "audifonos",    label: "Audífonos",    icon: "🎧" },
  { id: "camaras",      label: "Cámaras",      icon: "📷" },
];

const CATEGORY_COLORS = {
  tecnologia:   "linear-gradient(135deg, #00f0ff, #0066ff)",
  hogar:        "linear-gradient(135deg, #ffb400, #ff5e3a)",
  herramientas: "linear-gradient(135deg, #39ff88, #00b36b)",
  audifonos:    "linear-gradient(135deg, #ff2ea6, #8b5cf6)",
  camaras:      "linear-gradient(135deg, #00f0ff, #a855f7)",
};

const PRODUCTS = [
  /* ---------------- TECNOLOGÍA (7) ---------------- */
  { id: 1,  name: "Walkie Talkie Baofeng Radio UHF/VHF", category: "tecnologia", price: 38, oldPrice: 45, rating: 4.6, reviews: 41, icon: "📻", badge: "Oferta", stock: 15, image: "img/productos/1745291569467.webp", desc: "Radio de dos vías con canales UHF/VHF, alta potencia y batería recargable. Incluye cargador y antena. Ideal para seguridad, eventos y trabajo." },
  { id: 2,  name: "Aro de Luz RGB 10\" con Trípode", category: "tecnologia", price: 24, oldPrice: 30, rating: 4.5, reviews: 63, icon: "💡", badge: "Oferta", stock: 22, image: "img/productos/1745291569519.webp", desc: "Anillo LED RGB de 10 pulgadas con 3 modos de luz y varios niveles de brillo. Incluye soporte y trípode. Perfecto para streaming, videos y fotos." },
  { id: 3,  name: "Repetidor WiFi 300 Mbps Amplificador de Señal", category: "tecnologia", price: 26, oldPrice: null, rating: 4.4, reviews: 58, icon: "📡", badge: null, stock: 18, image: "img/productos/1745291570384.webp", desc: "Amplificador de señal WiFi de hasta 300 Mbps en 2.4–2.4835 GHz. Extiende la cobertura a cuartos y zonas lejanas. Configuración sencilla." },
  { id: 4,  name: "Control Inalámbrico PS4 Certificado Bluetooth", category: "tecnologia", price: 32, oldPrice: 39, rating: 4.6, reviews: 84, icon: "🎮", badge: "Oferta", stock: 20, image: "img/productos/IMG-20260116-WA0244.webp", desc: "Control para PlayStation 4 con conexión Bluetooth, vibración dual y batería recargable. Compatible con PS4 y PC. Producto certificado." },
  { id: 5,  name: "Teclado + Mouse Inalámbricos Bluetooth", category: "tecnologia", price: 35, oldPrice: null, rating: 4.5, reviews: 72, icon: "⌨️", badge: null, stock: 16, image: "img/productos/-tecnovision-vzla_20251103_072209_0000.webp", desc: "Combo inalámbrico Bluetooth de teclado y mouse, ambos livianos y de bajo consumo. Compatible con Windows, macOS, Android y Smart TV." },
  { id: 6,  name: "Pocket Video Light LED 150° Recargable", category: "tecnologia", price: 19, oldPrice: 25, rating: 4.5, reviews: 39, icon: "🔆", badge: "Oferta", stock: 26, image: "img/productos/IMG-20260428-WA0028.webp", desc: "Luz LED portátil para video y fotografía con apertura de 150°, temperatura regulable y batería recargable. Se monta en cámara o celular." },
  { id: 7,  name: "Cinta LED RGB 16 Colores 5 Metros", category: "tecnologia", price: 15, oldPrice: 20, rating: 4.7, reviews: 118, icon: "🌈", badge: "Oferta", stock: 40, image: "img/productos/-tecnovision-vzla_20251228_115752_0000.webp", desc: "Tira LED de 5 metros con 16 colores, control remoto y varios modos de iluminación. Adhesivo para pared, TV o muebles. Muy fácil de instalar." },

  /* ---------------- HOGAR (3) ---------------- */
  { id: 8,  name: "Pistola Masajeadora de Percusión con Cabezales", category: "hogar", price: 42, oldPrice: 55, rating: 4.7, reviews: 91, icon: "💆", badge: "Oferta", stock: 14, image: "img/productos/1745291569501.webp", desc: "Masajeador de percusión con 1.200–3.200 pulsaciones por minuto, 3 a 5 niveles de intensidad y cabezales intercambiables. Batería recargable de 2–6 h." },
  { id: 9,  name: "Cinta LED de Pared Multicolor", category: "hogar", price: 16, oldPrice: null, rating: 4.5, reviews: 46, icon: "✨", badge: null, stock: 30, image: "img/productos/1788793869503.webp", desc: "Iluminación LED decorativa para pared con múltiples colores y efectos. Da vida a tu sala, cuarto o negocio con luz suave y moderna." },
  { id: 10, name: "Aire Acondicionado / Ventilador Portátil Frío", category: "hogar", price: 29, oldPrice: 36, rating: 4.4, reviews: 52, icon: "❄️", badge: "Oferta", stock: 21, image: "img/productos/1787160093487.webp", desc: "Climatizador portátil que enfría, humidifica y purifica el aire. Bajo consumo y silencioso. Ideal para escritorio, cuarto o dormitorio." },

  /* ---------------- HERRAMIENTAS (4) ---------------- */
  { id: 11, name: "Compresor de Aire Portátil 12V para Neumáticos", category: "herramientas", price: 34, oldPrice: 42, rating: 4.6, reviews: 77, icon: "🌀", badge: "Oferta", stock: 17, image: "img/productos/1745291570025.webp", desc: "Compresor portátil de 13.20 cm x 11.43 cm que infla neumáticos, balones y colchones. Se conecta al encendedor 12V del carro. Con manómetro." },
  { id: 12, name: "Juego de Ratchet 46 Piezas con Dados", category: "herramientas", price: 39, oldPrice: 49, rating: 4.7, reviews: 88, icon: "🔧", badge: "Oferta", stock: 19, image: "img/productos/1745291570082.webp", desc: "Maletín con 46 piezas: rache, dados, extensiones y puntas en acero al cromo vanadio. Perfecto para mecánica y mantenimiento del hogar." },
  { id: 13, name: "Taladro Percutor Eléctrico 2 Baterías + Maletín", category: "herramientas", price: 59, oldPrice: 75, rating: 4.8, reviews: 102, icon: "🔩", badge: "Oferta", stock: 12, image: "img/productos/Mini-secador-de-cabello_20250731_112736_0000.webp", desc: "Taladro inalámbrico con función percutor, 2 baterías recargables, cargador y accesorios en maletín. Potente y liviano para taladrar concreto, madera y metal." },
  { id: 14, name: "Juego de Raches 53 Piezas 1/4\" Profesional", category: "herramientas", price: 44, oldPrice: 55, rating: 4.7, reviews: 64, icon: "🧰", badge: "Oferta", stock: 15, image: "img/productos/-tecnovision-vzla_20251229_145027_0000.webp", desc: "Set profesional de 53 piezas con rache de 1/4\", cuadrantes, dados y puntas de acero resistente. Organizado en práctico estuche." },
  { id: 15, name: "Esmeril Eléctrico Angular 2 Baterías", category: "herramientas", price: 68, oldPrice: 85, rating: 4.6, reviews: 55, icon: "⚙️", badge: "Oferta", stock: 10, image: "img/productos/-tecnovision-vzla_20251014_081758_0000.webp", desc: "Esmeriladora angular inalámbrica con 2 baterías recargables. Ideal para corte y pulido de metal y piedra. Incluye disco y empuñadura." },

  /* ---------------- AUDÍFONOS (2) ---------------- */
  { id: 16, name: "Audífonos Bluetooth AirMax Pro Recargables", category: "audifonos", price: 22, oldPrice: 28, rating: 4.5, reviews: 96, icon: "🎧", badge: "Oferta", stock: 24, image: "img/productos/IMG-20260113-WA0048.webp", desc: "Audífonos inalámbricos Bluetooth 5.1 con batería de 600 mAh y hasta 5 horas de música. Recargables, cable ligeros y con excelente sonido." },
  { id: 17, name: "AirPods Pro 5 con Estuche de Carga", category: "audifonos", price: 45, oldPrice: 55, rating: 4.7, reviews: 128, icon: "🎵", badge: "Oferta", stock: 20, image: "img/productos/Screenshot_2026-08-27-12-53-55-819_cn-wps-moffic.webp", desc: "Audífonos inalámbricos tipo AirPods Pro 5 con estuche de carga, controles táctiles, cancelación de ruido y sonido de alta calidad." },

  /* ---------------- CÁMARAS (3) ---------------- */
  { id: 18, name: "Mini Cámara A9 WiFi 1080p Visión Nocturna", category: "camaras", price: 18, oldPrice: 25, rating: 4.4, reviews: 110, icon: "📷", badge: "Oferta", stock: 35, image: "img/productos/1745291569997.webp", desc: "Mini cámara WiFi Full HD con visión nocturna, detección de movimiento y app móvil. Compacta, ideal para el hogar, oficina o negocio." },
  { id: 19, name: "Cámara IP Tipo Bombillo 360° WiFi Visión Nocturna", category: "camaras", price: 27, oldPrice: 34, rating: 4.6, reviews: 87, icon: "📸", badge: "Oferta", stock: 18, image: "img/productos/1745291570140.webp", desc: "Cámara inalámbrica en formato bombillo con rotación 360°, visión nocturna y conexión WiFi. Fácil instalación: solo se enrosca. App para el celular." },
  { id: 20, name: "Cámara de Seguridad V380 IP66 Exterior", category: "camaras", price: 38, oldPrice: 48, rating: 4.7, reviews: 73, icon: "🛡️", badge: "Oferta", stock: 16, image: "img/productos/Mini-secador-de-cabello_20250808_125021_0000.webp", desc: "Cámara de seguridad V380 diseñada para exteriores con protección IP66 resistente al agua. Visión nocturna y monitoreo desde el celular." },
  { id: 21, name: "Cámara de Acción Go Pro 4K Resistente al Agua 30m", category: "camaras", price: 46, oldPrice: 59, rating: 4.5, reviews: 68, icon: "🎥", badge: "Oferta", stock: 13, image: "img/productos/1745291570330.webp", desc: "Cámara de acción tipo Go Pro que graba en 4K, resistente al agua hasta 30 metros. Soporta tarjeta microSD hasta 64 GB (no incluida). Incluye accesorios." },
];
