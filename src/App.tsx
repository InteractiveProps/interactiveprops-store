import { useState, useMemo, useEffect, useCallback, useRef } from "react";

// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAAhBlFhTAREyeWsQBmlVD6ktVLXOUQDKU",
  authDomain: "interactiveprop-store.firebaseapp.com",
  projectId: "interactiveprop-store",
  storageBucket: "interactiveprop-store.firebasestorage.app",
  messagingSenderId: "152459636744",
  appId: "1:152459636744:web:9edadf7733fcf2b8c361bd"
};

var _db: any = null;
var _dbCallbacks: any[] = [];

function getDB(): Promise<any> {
  return new Promise(function(resolve) {
    if (_db) { resolve(_db); return; }
    _dbCallbacks.push(resolve);
  });
}

function initFirebase() {
  if (typeof window === "undefined") return;
  var s1 = document.createElement("script");
  s1.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js";
  s1.onload = function() {
    var s2 = document.createElement("script");
    s2.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js";
    s2.onload = function() {
      if (!(window as any).firebase.apps.length) { (window as any).firebase.initializeApp(FIREBASE_CONFIG); }
      _db = (window as any).firebase.firestore();
      _dbCallbacks.forEach(function(cb) { cb(_db); });
      _dbCallbacks = [];
    };
    document.head.appendChild(s2);
  };
  document.head.appendChild(s1);
}

if (typeof window !== "undefined") { initFirebase(); }

async function fsGet(collection: string, docId: string) {
  try { var db = await getDB(); var doc = await db.collection(collection).doc(docId).get(); return doc.exists ? doc.data() : null; }
  catch(e) { console.error("fsGet error:", e); return null; }
}
async function fsSet(collection: string, docId: string, data: any) {
  try { var db = await getDB(); await db.collection(collection).doc(docId).set(data); return true; }
  catch(e) { console.error("fsSet error:", e); return false; }
}
async function fsAdd(collection: string, data: any) {
  try { var db = await getDB(); var ref = await db.collection(collection).add(data); return ref.id; }
  catch(e) { console.error("fsAdd error:", e); return null; }
}
async function fsGetAll(collection: string) {
  try { var db = await getDB(); var snap = await db.collection(collection).orderBy("date","desc").get(); var r: any[] = []; snap.forEach(function(d: any){ r.push(Object.assign({_id:d.id},d.data())); }); return r; }
  catch(e) { console.error("fsGetAll error:", e); return []; }
}
function fsListen(collection: string, callback: (d: any[]) => void) {
  getDB().then(function(db) {
    db.collection(collection).orderBy("date","desc").onSnapshot(function(snap: any) {
      var r: any[] = []; snap.forEach(function(d: any){ r.push(Object.assign({_id:d.id},d.data())); }); callback(r);
    });
  });
}

async function loadProducts() {
  try { var d = await fsGet("settings","products"); if(d&&d.items) return d.items; var r = localStorage.getItem("ip-products"); return r ? JSON.parse(r) : DEFAULT_PRODUCTS; }
  catch(e) { return DEFAULT_PRODUCTS; }
}
async function saveProducts(p: any[]) {
  try { await fsSet("settings","products",{items:p,updated:new Date().toISOString()}); localStorage.setItem("ip-products",JSON.stringify(p)); }
  catch(e) { localStorage.setItem("ip-products",JSON.stringify(p)); }
}
async function loadOrders() {
  try { return await fsGetAll("orders"); }
  catch(e) { var r = localStorage.getItem("ip-orders"); return r ? JSON.parse(r) : []; }
}
async function saveOrder(order: any) {
  try { await fsAdd("orders",order); }
  catch(e) { var ex = JSON.parse(localStorage.getItem("ip-orders")||"[]"); localStorage.setItem("ip-orders",JSON.stringify([order].concat(ex))); }
}
async function loadLogo() {
  try { var d = await fsGet("settings","logo"); return d&&d.url ? d.url : LOGO_URL; }
  catch(e) { return localStorage.getItem("ip-logo")||LOGO_URL; }
}
async function saveLogo(url: string) {
  try { await fsSet("settings","logo",{url,updated:new Date().toISOString()}); localStorage.setItem("ip-logo",url); }
  catch(e) { localStorage.setItem("ip-logo",url); }
}
async function deleteLogo() {
  try { await fsSet("settings","logo",{url:LOGO_URL,updated:new Date().toISOString()}); localStorage.removeItem("ip-logo"); }
  catch(e) { localStorage.removeItem("ip-logo"); }
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const OWNER_PASSWORD = "PROPS0326";
const PAYPAL_CLIENT_ID = "AXAyGKDTl6t0rAL_b0irh3eO1VikIYBy5ROUeCEUoPBlKpG9kaiATkFZjYccbDyqcIRQ5kLVFlPRVyNT";

const CYAN  = "#00d4ff";
const CYAN2 = "#008fb5";
const PINK  = "#ff2d78";
const PINK2 = "#b01f55";
const BG    = "#050508";
const BG2   = "#08080f";
const BG3   = "#0d0d1a";
const BD    = "#1a1a30";

const CATEGORIES = ["Props","Effects","Bundles","Games","Accessories","Other"];
const EMOJIS = ["🎈","🔫","🎊","🎉","💜","📦","⚡","🌀","🎯","🔥","💥","🎆","🎇","✨","🌟","💫","🎪","🎭"];
const LOGO_URL = "https://i.postimg.cc/1X5hxnT4/Untitled-design-(36).png";

const DEFAULT_PRODUCTS = [
  { id:1, name:"Interactive Pump",         price:69.99,  type:"physical", category:"Props",   desc:"The Interactive Pump is an interactive streamer prop that lets viewers activate real-time pumping actions during live broadcasts using stream alerts, gifts, webhooks, and custom triggers. Designed to create funny, chaotic, and highly engaging reactions, it transforms your audience from passive viewers into active participants in the stream experience.", emoji:"🎈", img:"https://i.imgur.com/oblBDNn.png", stock:25, active:true },
  { id:2, name:"Interactive Blaster",      price:89.99,  type:"physical", category:"Props",   desc:"The Interactive Blaster is a live-streaming foam dart launcher that allows viewers to trigger shots in real time through gifts, donations, alerts, webhooks, and stream events. Built for creators who want high-energy audience interaction, it adds surprise, tension, and unforgettable moments directly into your livestreams.", emoji:"🔫", img:"https://i.imgur.com/jCk2vdC.png", stock:12, active:true },
  { id:3, name:"Interactive Silly String", price:69.99,  type:"physical", category:"Props",   desc:"The Interactive Silly String is a streamer-controlled prank device that lets viewers trigger real cans of silly string live during your stream through gifts, donations, alerts, webhooks, and custom events.", emoji:"🎊", img:"https://i.imgur.com/7hYKQdV.png", stock:40, active:true },
  { id:4, name:"Interactive LED Sign",     price:59.99,  type:"physical", category:"Props",   desc:"The Interactive Sign is a customizable LED streamer sign designed to bring your name, brand, or stream setup to life with dynamic lighting and interactive effects. The sign supports a maximum of 8 letters, with an additional cost of $3 per letter after 8.", emoji:"🎉", img:"https://i.imgur.com/ia02jiA.png", stock:18, active:true },
  { id:6, name:"Chaos Bundle",             price:220.00, type:"physical", category:"Bundles", desc:"The Interactive Bundle combines the Interactive Pump, Interactive Blaster, and Interactive Silly String into the ultimate all-in-one streamer setup for maximum audience interaction.", emoji:"📦", img:null, stock:8, active:true },
  { id:7, name:"Interactive Stellar Dash", price:0.99,   type:"digital",  category:"Games",   desc:"Stellar Dash is a fast-paced interactive arcade space runner where live chat controls the chaos — viewers can trigger obstacles, attacks, and difficulty changes in real time.", emoji:"🚀", img:"https://i.imgur.com/jlRiv7Q.png", stock:99, active:true },
];

const FAQ_DATA = [
  { category:"General Questions", items:[
    { q:"What is Interactive Props?", a:"Interactive Props creates interactive streaming products that allow viewers to trigger real-life effects during livestreams using gifts, donations, alerts, webhooks, and other stream integrations." },
    { q:"Who are these products made for?", a:"Our products are designed for streamers, TikTok creators, Twitch creators, Kick streamers, YouTubers, IRL content creators, gaming creators, reaction streamers, and anyone looking to create interactive live experiences." },
    { q:"Do your products work with TikTok Live?", a:"Yes. Many of our products can work with TikTok Live through supported third-party tools, webhooks, or stream automation platforms." },
    { q:"Do your products work with Twitch, Kick, or YouTube?", a:"Yes. Our products are designed to work with multiple streaming platforms depending on your setup and software integration." },
  ]},
  { category:"Product & Setup", items:[
    { q:"Are the products difficult to set up?", a:"No. We design our products to be as beginner-friendly as possible. Most setups only require Wi-Fi, a browser, and simple webhook or streaming tool integration." },
    { q:"Do I need programming experience?", a:"No programming experience is required for most basic setups. We provide guides and support to help you get started." },
    { q:"What are webhooks?", a:"Webhooks allow your stream alerts, gifts, donations, or events to trigger physical actions in real time." },
    { q:"Can viewers control the products live?", a:"Yes. Depending on your setup, viewers can trigger products through gifts, donations, channel points, stream events, chat commands, goals, and custom automation tools." },
    { q:"Do your products require Wi-Fi?", a:"Most interactive products require a Wi-Fi connection for live interaction features." },
    { q:"Can multiple products be used together?", a:"Yes. Many streamers combine multiple Interactive Props products to create larger interactive setups." },
  ]},
  { category:"Orders & Shipping", items:[
    { q:"How long does shipping take?", a:"Processing and shipping times may vary depending on product demand. Estimated delivery times are shown during checkout whenever available." },
    { q:"Do you ship internationally?", a:"International shipping availability may vary depending on the destination country and product type." },
    { q:"Will I receive tracking information?", a:"Yes. Once your order ships, tracking information will be sent to the email used during checkout." },
    { q:"Can I cancel my order?", a:"Orders can only be canceled before processing or shipment preparation begins." },
  ]},
  { category:"Returns & Warranty", items:[
    { q:"Do you accept returns?", a:"Yes. Eligible unused products may be returned within 14 days of delivery in original condition and packaging.", link:"returns" },
    { q:"What if my product arrives damaged?", a:"Please contact us within 48 hours of delivery with photos or videos of the issue so we can help resolve it quickly." },
    { q:"Do your products include a warranty?", a:"Yes. Eligible products include a limited 90-day warranty covering manufacturing defects under normal use.", link:"warranty" },
  ]},
  { category:"Safety & Usage", items:[
    { q:"Are the products safe to use indoors?", a:"Yes, when used responsibly and according to instructions. Always use products safely and avoid aiming near faces, eyes, pets, or fragile objects." },
    { q:"Can children use these products?", a:"Adult supervision is recommended for minors using or interacting with the products." },
  ]},
  { category:"Support", items:[
    { q:"How do I contact support?", a:"You can reach us anytime at interactiveprops.official@gmail.com or through our Contact page.", link:"contact" },
    { q:"Do you offer setup help?", a:"Yes. We aim to help customers get their products working properly and provide setup guidance whenever possible." },
    { q:"Will more products be released?", a:"Absolutely. We are continuously developing new interactive products and ideas for creators and livestreamers." },
  ]},
];

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const TR: Record<string,any> = {
  en: {
    home:"HOME", shop:"SHOP", about:"ABOUT US", contact:"CONTACT",
    shopNow:"SHOP NOW", addToCart:"ADD TO CART", checkout:"CHECKOUT",
    payment:"PAYMENT", orderConfirmed:"ORDER CONFIRMED!", yourCart:"YOUR CART",
    cartEmpty:"Your cart is empty", backToShop:"← BACK TO SHOP",
    heroTag:"BRING YOUR STREAMS TO LIFE", heroA:"INTERACTIVE.", heroB:"IMMERSIVE.", heroC:"UNFORGETTABLE.",
    heroSub:"Next-level interactive props that engage, entertain and make every moment unforgettable.",
    ourProducts:"OUR PRODUCTS", searchPlaceholder:"Search products...",
    trust:[
      {ic:"🛡️",t:"PREMIUM QUALITY",s:"Built to last and perform."},
      {ic:"⚡",t:"EASY TO USE",s:"Plug & play, no hassle."},
      {ic:"🎧",t:"EXPERT SUPPORT",s:"We are here to help."},
      {ic:"🚚",t:"FAST SHIPPING",s:"Quick delivery worldwide."},
    ],
    stayConnected:"STAY CONNECTED", newsletterSub:"Subscribe for special offers and more.",
    emailPlaceholder:"Enter your email", footerMission:"We create interactive experiences that captivate audiences and make every moment unforgettable.",
    footerTag:"Made for impact.", allProducts:"All Products",
    total:"Total", continuePayment:"CONTINUE TO PAYMENT",
    thankYou:"THANK YOU!", keepShopping:"KEEP SHOPPING",
    fullName:"Full Name *", email:"Email *", phone:"Phone",
    shippingAddr:"SHIPPING ADDRESS", street:"Street Address *", city:"City *", state:"State", zip:"ZIP *", country:"Country",
    customizeLED:"✨ CUSTOMIZE YOUR LED SIGN", customizeLEDSub:"What name or text would you like on your sign? (max 20 characters)",
    preview:"PREVIEW", required:"Required", validEmail:"Valid email required",
    enterLEDText:"Please enter the text for your LED Sign",
    within8:"✓ Within the 8-letter base price — no extra charge!",
    ledIncluded:"✓ Included in your total — charged together with PayPal",
    extraLetterCost:"EXTRA LETTER COST", payingAs:"Paying as",
    ledSignText:"LED Sign text:", yourLEDWillSay:"YOUR LED SIGN WILL SAY",
    confirmSentTo:"Confirmation sent to", simOrder:"SIMULATE ORDER (DEMO)",
    paypalNotConfigured:"PayPal Not Configured", back:"← Back",
    login:"LOGIN", loginSub:"Enter your password to manage the store.",
    incorrectPw:"Incorrect password",
    noOrdersYet:"No orders yet.", noProductsFound:"No products found",
    onlyLeft:"Only", inStock:"left",
    sendMessage:"SEND MESSAGE", messageSent:"MESSAGE SENT!", sendAnother:"Send Another",
    sendUs:"SEND US A MESSAGE", yourName:"YOUR NAME", emailAddress:"EMAIL ADDRESS",
    messageLabel:"MESSAGE", messagePlaceholder:"Tell us how we can help...",
    orEmailUs:"Or email us directly at interactiveprops.official@gmail.com",
    reachDirectly:"REACH US DIRECTLY", stillQuestions:"Still have questions? We are happy to help.",
    contactUs:"CONTACT US", viewPolicy:"View full policy",
  },
  es: {
    home:"INICIO", shop:"TIENDA", about:"NOSOTROS", contact:"CONTACTO",
    shopNow:"COMPRAR AHORA", addToCart:"AÑADIR AL CARRITO", checkout:"FINALIZAR COMPRA",
    payment:"PAGO", orderConfirmed:"¡PEDIDO CONFIRMADO!", yourCart:"TU CARRITO",
    cartEmpty:"Tu carrito está vacío", backToShop:"← VOLVER",
    heroTag:"DA VIDA A TUS STREAMS", heroA:"INTERACTIVO.", heroB:"INMERSIVO.", heroC:"INOLVIDABLE.",
    heroSub:"Props interactivos de próximo nivel que enganchan, entretienen y hacen cada momento inolvidable.",
    ourProducts:"NUESTROS PRODUCTOS", searchPlaceholder:"Buscar productos...",
    trust:[
      {ic:"🛡️",t:"CALIDAD PREMIUM",s:"Construido para durar."},
      {ic:"⚡",t:"FÁCIL DE USAR",s:"Plug & play, sin complicaciones."},
      {ic:"🎧",t:"SOPORTE EXPERTO",s:"Estamos aquí para ayudar."},
      {ic:"🚚",t:"ENVÍO RÁPIDO",s:"Entrega rápida mundial."},
    ],
    stayConnected:"MANTENTE CONECTADO", newsletterSub:"Suscríbete para ofertas especiales.",
    emailPlaceholder:"Tu correo electrónico", footerMission:"Creamos experiencias interactivas que cautivan audiencias y hacen cada momento inolvidable.",
    footerTag:"Hecho para impactar.", allProducts:"Todos los Productos",
    total:"Total", continuePayment:"CONTINUAR AL PAGO",
    thankYou:"¡GRACIAS!", keepShopping:"SEGUIR COMPRANDO",
    fullName:"Nombre Completo *", email:"Email *", phone:"Teléfono",
    shippingAddr:"DIRECCIÓN DE ENVÍO", street:"Calle *", city:"Ciudad *", state:"Estado", zip:"CP *", country:"País",
    customizeLED:"✨ PERSONALIZA TU LETRERO LED", customizeLEDSub:"¿Qué nombre o texto quieres en tu letrero? (máx 20 caracteres)",
    preview:"VISTA PREVIA", required:"Requerido", validEmail:"Email válido requerido",
    enterLEDText:"Ingresa el texto para tu letrero LED",
    within8:"✓ Dentro del precio base de 8 letras — ¡sin cargo extra!",
    ledIncluded:"✓ Incluido en tu total — cobrado junto con PayPal",
    extraLetterCost:"COSTO DE LETRAS EXTRA", payingAs:"Pagando como",
    ledSignText:"Texto del letrero LED:", yourLEDWillSay:"TU LETRERO LED DIRÁ",
    confirmSentTo:"Confirmación enviada a", simOrder:"SIMULAR PEDIDO (DEMO)",
    paypalNotConfigured:"PayPal No Configurado", back:"← Volver",
    login:"ACCESO", loginSub:"Ingresa tu contraseña para gestionar la tienda.",
    incorrectPw:"Contraseña incorrecta",
    noOrdersYet:"No hay pedidos aún.", noProductsFound:"No se encontraron productos",
    onlyLeft:"Solo quedan", inStock:"",
    sendMessage:"ENVIAR MENSAJE", messageSent:"¡MENSAJE ENVIADO!", sendAnother:"Enviar otro",
    sendUs:"ENVÍANOS UN MENSAJE", yourName:"TU NOMBRE", emailAddress:"CORREO ELECTRÓNICO",
    messageLabel:"MENSAJE", messagePlaceholder:"Cuéntanos cómo podemos ayudarte...",
    orEmailUs:"O escríbenos a interactiveprops.official@gmail.com",
    reachDirectly:"CONTÁCTANOS DIRECTAMENTE", stillQuestions:"¿Aún tienes preguntas? Con gusto ayudamos.",
    contactUs:"CONTÁCTANOS", viewPolicy:"Ver política completa",
  }
};

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;800;900&family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Rajdhani',sans-serif;background:#050508}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:#050508}
::-webkit-scrollbar-thumb{background:#00d4ff;border-radius:2px}

/* ── Glitch ── */
.glitch{position:relative;display:inline-block}
.glitch::before,.glitch::after{content:attr(data-text);position:absolute;top:0;left:0;width:100%;height:100%}
.glitch::before{color:#ff2d78;animation:glitch1 5s infinite}
.glitch::after{color:#00d4ff;animation:glitch2 5s infinite 0.2s}
@keyframes glitch1{
  0%,85%,100%{clip-path:inset(0 0 100% 0);transform:translate(0)}
  86%{clip-path:inset(20% 0 50% 0);transform:translate(-5px,2px)}
  87%{clip-path:inset(60% 0 10% 0);transform:translate(5px,-2px)}
  88%{clip-path:inset(40% 0 30% 0);transform:translate(-3px,1px)}
  89%{clip-path:inset(70% 0 5% 0);transform:translate(4px,-1px)}
  90%{clip-path:inset(10% 0 75% 0);transform:translate(-5px,2px)}
  91%,99%{clip-path:inset(0 0 100% 0);transform:translate(0)}
}
@keyframes glitch2{
  0%,83%,100%{clip-path:inset(0 0 100% 0);transform:translate(0)}
  84%{clip-path:inset(50% 0 20% 0);transform:translate(5px,-2px)}
  85%{clip-path:inset(15% 0 65% 0);transform:translate(-5px,2px)}
  86%{clip-path:inset(75% 0 5% 0);transform:translate(3px,0)}
  87%{clip-path:inset(35% 0 40% 0);transform:translate(-3px,1px)}
  88%,99%{clip-path:inset(0 0 100% 0);transform:translate(0)}
}

/* ── Hero grid ── */
.hero-grid{
  position:absolute;inset:0;
  background-image:linear-gradient(rgba(0,212,255,0.06) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,212,255,0.06) 1px,transparent 1px);
  background-size:60px 60px;
  animation:gridScroll 8s linear infinite;
}
@keyframes gridScroll{0%{background-position:0 0}100%{background-position:60px 60px}}

/* ── Scanlines ── */
.scanlines{
  position:fixed;inset:0;pointer-events:none;z-index:9999;
  background:repeating-linear-gradient(0deg,transparent 0px,transparent 2px,rgba(0,212,255,0.012) 2px,rgba(0,212,255,0.012) 4px);
}

/* ── Neon pulses ── */
@keyframes neonCyan{
  0%,100%{text-shadow:0 0 10px #00d4ff,0 0 20px #00d4ff,0 0 40px rgba(0,212,255,0.4)}
  50%{text-shadow:0 0 20px #00d4ff,0 0 40px #00d4ff,0 0 80px rgba(0,212,255,0.6)}
}
@keyframes neonPink{
  0%,100%{text-shadow:0 0 10px #ff2d78,0 0 20px #ff2d78,0 0 40px rgba(255,45,120,0.4)}
  50%{text-shadow:0 0 20px #ff2d78,0 0 40px #ff2d78,0 0 80px rgba(255,45,120,0.6)}
}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes borderPulse{
  0%,100%{box-shadow:0 0 6px rgba(0,212,255,0.3),inset 0 0 6px rgba(0,212,255,0.05)}
  50%{box-shadow:0 0 16px rgba(0,212,255,0.5),inset 0 0 12px rgba(0,212,255,0.1)}
}

/* ── Product card ── */
.product-card{transition:transform 0.3s ease,box-shadow 0.3s ease,border-color 0.3s ease}
.product-card:hover{transform:translateY(-8px) !important;box-shadow:0 0 30px rgba(0,212,255,0.25),0 24px 48px rgba(0,0,0,0.6) !important;border-color:rgba(0,212,255,0.7) !important}

/* ── Buttons ── */
.neon-btn{transition:all 0.25s;cursor:pointer;font-family:'Rajdhani',sans-serif}
.neon-btn:hover{box-shadow:0 0 15px rgba(0,212,255,0.5),inset 0 0 10px rgba(0,212,255,0.08)}
.neon-btn-pink:hover{box-shadow:0 0 15px rgba(255,45,120,0.5),inset 0 0 10px rgba(255,45,120,0.08)}
.neon-btn-fill:hover{box-shadow:0 0 20px rgba(255,45,120,0.4),0 0 40px rgba(0,212,255,0.2);transform:translateY(-2px)}

/* ── Scroll reveal ── */
.reveal{opacity:0;transform:translateY(28px);transition:opacity 0.7s ease,transform 0.7s ease}
.reveal.visible{opacity:1;transform:translateY(0)}

/* ── Cyber corners ── */
.cc{position:relative}
.cc::before,.cc::after,.cc .cc2::before,.cc .cc2::after{content:'';position:absolute;width:12px;height:12px}
.cc::before{top:0;left:0;border-top:1px solid ${CYAN};border-left:1px solid ${CYAN}}
.cc::after{top:0;right:0;border-top:1px solid ${CYAN};border-right:1px solid ${CYAN}}
.cc .cc2::before{bottom:0;left:0;border-bottom:1px solid ${CYAN};border-left:1px solid ${CYAN}}
.cc .cc2::after{bottom:0;right:0;border-bottom:1px solid ${CYAN};border-right:1px solid ${CYAN}}

/* ── Trust bar ── */
.trust-item{border-right:1px solid ${BD}}
.trust-item:last-child{border-right:none}

/* ── Orbitron headings ── */
.orbitron{font-family:'Orbitron',sans-serif}
.mono{font-family:'Share Tech Mono',monospace}
`;

// ─── PARTICLE CANVAS ──────────────────────────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(function() {
    var canvas = ref.current;
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    var colors = [CYAN, PINK, "#ffffff"];
    var particles: any[] = [];
    for (var i = 0; i < 70; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(Math.random() * 0.4 + 0.15),
        r: Math.random() * 1.4 + 0.3,
        a: Math.random() * 0.7 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    var animId: number;
    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(function(p) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = p.a * 0.5;
        ctx!.fill();
        p.x += p.vx; p.y += p.vy; p.a -= 0.001;
        if (p.a <= 0 || p.y < 0) {
          p.x = Math.random() * canvas!.width;
          p.y = canvas!.height + 5;
          p.a = Math.random() * 0.7 + 0.2;
          p.vy = -(Math.random() * 0.4 + 0.15);
          p.vx = (Math.random() - 0.5) * 0.3;
        }
      });
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    }
    draw();
    return function() { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:1}} />;
}

// ─── SCROLL REVEAL HOOK ───────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(function() {
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.1 });
    document.querySelectorAll(".reveal").forEach(function(el) { obs.observe(el); });
    return function() { obs.disconnect(); };
  });
}

// ─── PAYPAL HOOK ──────────────────────────────────────────────────────────────
function usePayPal(clientId: string) {
  const [loaded, setLoaded] = useState(false);
  useEffect(function() {
    if (clientId === "YOUR_PAYPAL_CLIENT_ID") return;
    if ((window as any).paypal) { setLoaded(true); return; }
    var script = document.createElement("script");
    script.src = "https://www.paypal.com/sdk/js?client-id=" + clientId + "&currency=USD";
    script.onload = function() { setLoaded(true); };
    document.body.appendChild(script);
    return function() { try { document.body.removeChild(script); } catch(e) {} };
  }, [clientId]);
  return loaded;
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("shop");
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [orders, setOrders] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [lang, setLang] = useState<"en"|"es">("en");
  const paypalLoaded = usePayPal(PAYPAL_CLIENT_ID);
  const t = TR[lang];

  useScrollReveal();

  useEffect(function() { loadProducts().then(setProducts); loadOrders().then(setOrders); }, []);
  useEffect(function() { fsListen("orders", function(live) { setOrders(live); }); }, []);

  const persistProducts = useCallback(async function(p: any[]) { setProducts(p); await saveProducts(p); }, []);
  const addOrder = useCallback(async function(order: any) {
    await saveOrder(order);
    setOrders(function(prev) { return [order].concat(prev); });
  }, []);

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Rajdhani',sans-serif",color:"#fff"}}>
      <style>{GLOBAL_CSS}</style>
      <div className="scanlines" />
      <Header view={view} setView={setView} isOwner={isOwner} setIsOwner={setIsOwner} lang={lang} setLang={setLang} t={t} />
      {view==="shop"    && <ShopView products={products.filter(function(p){ return p.active; })} paypalLoaded={paypalLoaded} paypalClientId={PAYPAL_CLIENT_ID} addOrder={addOrder} setView={setView} t={t} />}
      {view==="about"   && <AboutView setView={setView} t={t} />}
      {view==="contact" && <ContactView setView={setView} t={t} />}
      {view==="faq"     && <FAQView setView={setView} t={t} />}
      {view==="returns" && <PolicyView type="returns" setView={setView} t={t} />}
      {view==="warranty"&& <PolicyView type="warranty" setView={setView} t={t} />}
      {view==="shipping"&& <PolicyView type="shipping" setView={setView} t={t} />}
      {view==="login"   && <LoginView onLogin={function(){ setIsOwner(true); setView("admin"); }} ownerPassword={OWNER_PASSWORD} t={t} />}
      {view==="admin" && isOwner && <AdminView products={products} orders={orders} persistProducts={persistProducts} />}
    </div>
  );
}

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function LogoSVG(props: any) {
  var sz = props.size || 52;
  const [src, setSrc] = useState((window as any).__ipLogo || LOGO_URL);
  useEffect(function() {
    loadLogo().then(function(url) { setSrc(url); (window as any).__ipLogo = url; });
    var iv = setInterval(function() {
      var cur = (window as any).__ipLogo || LOGO_URL;
      setSrc(function(prev: string) { return prev !== cur ? cur : prev; });
    }, 600);
    return function() { clearInterval(iv); };
  }, []);
  return <img src={src} alt="Interactive Props" style={{width:sz,height:sz,objectFit:"contain"}} />;
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header(props: any) {
  var {view, setView, isOwner, setIsOwner, lang, setLang, t} = props;
  const [scrolled, setScrolled] = useState(false);
  useEffect(function() {
    function onScroll() { setScrolled(window.scrollY > 40); }
    window.addEventListener("scroll", onScroll);
    return function() { window.removeEventListener("scroll", onScroll); };
  }, []);

  var hdr: any = {
    position:"sticky", top:0, zIndex:100,
    background: scrolled ? "rgba(5,5,8,0.97)" : "transparent",
    borderBottom: scrolled ? `1px solid ${BD}` : "1px solid transparent",
    backdropFilter: scrolled ? "blur(20px)" : "none",
    transition: "background 0.4s, border-color 0.4s, backdrop-filter 0.4s",
  };
  var inner: any = {maxWidth:1200,margin:"0 auto",padding:"0 28px",height:68,display:"flex",alignItems:"center",gap:20};
  var nl: any = {background:"none",border:"none",borderBottom:"2px solid transparent",cursor:"pointer",fontSize:11,fontWeight:700,color:"#666",padding:"6px 16px",letterSpacing:3,fontFamily:"'Rajdhani',sans-serif",transition:"color 0.2s,border-color 0.2s"};
  var na: any = {color:CYAN,borderBottom:`2px solid ${CYAN}`};

  return (
    <header style={hdr}>
      <div style={inner}>
        <button style={{background:"none",border:"none",cursor:"pointer",padding:0,flexShrink:0}} onClick={function(){ setView("shop"); }}>
          <LogoSVG size={50} />
        </button>
        <nav style={{display:"flex",gap:2,flex:1,justifyContent:"center"}}>
          {[["shop",t.shop],["about",t.about],["contact",t.contact]].map(function([v,label]) {
            return <button key={v} style={Object.assign({},nl,view===v?na:{})} className="neon-btn" onClick={function(){ setView(v); window.scrollTo(0,0); }}>{label}</button>;
          })}
        </nav>
        <div style={{display:"flex",gap:6,alignItems:"center",marginLeft:"auto"}}>
          {/* Language toggle */}
          <div style={{display:"flex",border:`1px solid ${BD}`,borderRadius:6,overflow:"hidden",fontSize:11,fontWeight:700,letterSpacing:1}}>
            <button onClick={function(){ setLang("en"); }} style={{background:lang==="en"?CYAN:"transparent",color:lang==="en"?"#000":"#555",border:"none",padding:"5px 10px",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",transition:"all 0.2s"}}>EN</button>
            <button onClick={function(){ setLang("es"); }} style={{background:lang==="es"?PINK:"transparent",color:lang==="es"?"#fff":"#555",border:"none",padding:"5px 10px",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",transition:"all 0.2s"}}>ES</button>
          </div>
          {isOwner
            ? <>
                <button style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:view==="admin"?CYAN:"#555",padding:7}} onClick={function(){ setView("admin"); }}>⚙️</button>
                <button style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#555",padding:7}} onClick={function(){ setIsOwner(false); setView("shop"); }}>🚪</button>
              </>
            : <button style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#555",padding:7}} onClick={function(){ setView("login"); }}>👤</button>
          }
        </div>
      </div>
    </header>
  );
}

// ─── SHOP VIEW ────────────────────────────────────────────────────────────────
function ShopView(props: any) {
  var {products, paypalLoaded, paypalClientId, addOrder, setView, t} = props;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<any[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toast, setToast] = useState<string|null>(null);

  var allCats = ["All"].concat(Array.from(new Set(products.map(function(p: any){ return p.category; }))) as string[]);
  var filtered = useMemo(function() {
    return products.filter(function(p: any) {
      var ms = p.name.toLowerCase().includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase());
      return ms && (category==="All" || p.category===category);
    });
  }, [products, search, category]);

  var cartCount = cart.reduce(function(s: number,i: any){ return s+i.qty; }, 0);
  var cartTotal = cart.reduce(function(s: number,i: any){ return s+i.price*i.qty; }, 0);

  function addToCart(p: any) {
    setCart(function(prev) {
      var ex = prev.find(function(i){ return i.id===p.id; });
      if (ex) return prev.map(function(i){ return i.id===p.id ? Object.assign({},i,{qty:i.qty+1}) : i; });
      return prev.concat([Object.assign({},p,{qty:1})]);
    });
    showToast(p.name + " added!");
  }
  function showToast(msg: string) { setToast(msg); setTimeout(function(){ setToast(null); },2200); }
  function handleOrderComplete(orderData: any, shipping: any, signText: string, finalTotal: number) {
    var extraLetters = signText ? Math.max(0, signText.replace(/ /g,"").length-8) : 0;
    var extraCost = extraLetters * 3;
    var orderId = "ORD-"+Date.now();
    var orderDate = new Date().toISOString();
    addOrder({id:orderId,date:orderDate,items:cart,total:finalTotal,shipping,signText:signText||null,signExtraCost:extraCost>0?extraCost:null,paypal:orderData,status:"paid"});
    fetch("https://hook.us2.make.com/mbkm6kji0gsdnebf7wnoa9wojox2yo9h",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        event:"order.completed",order_id:orderId,date:orderDate,
        customer:{name:shipping.name,email:shipping.email,phone:shipping.phone||""},
        shipping:{address:shipping.address||"",city:shipping.city||"",state:shipping.state||"",zip:shipping.zip||"",country:shipping.country||"US"},
        items:cart.map(function(i: any){ return {id:i.id,name:i.name,price:i.price,quantity:i.qty,type:i.type}; }),
        sign_text:signText||null,sign_extra_cost:extraCost>0?extraCost:null,
        subtotal:cartTotal,total:finalTotal,payment_method:"PayPal"
      })
    }).catch(function(e){ console.log("Webhook error:",e); });
    setCart([]); setCheckoutOpen(false); showToast("Order complete! Thank you.");
  }

  return (
    <span>
      {/* ── HERO ── */}
      <section style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",padding:"80px 28px",textAlign:"center"}}>
        <div className="hero-grid" />
        {/* Radial glows */}
        <div style={{position:"absolute",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,212,255,0.08) 0%,transparent 65%)",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none"}} />
        <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,45,120,0.1) 0%,transparent 65%)",bottom:"10%",right:"5%",pointerEvents:"none"}} />
        <ParticleCanvas />
        <div style={{position:"relative",zIndex:2,maxWidth:760}}>
          <p className="mono reveal" style={{fontSize:11,letterSpacing:5,color:CYAN,fontWeight:700,marginBottom:20,display:"block"}}>{t.heroTag}</p>
          <h1 style={{display:"flex",flexDirection:"column",gap:4,marginBottom:24}}>
            <span className="glitch orbitron reveal" data-text={t.heroA} style={{fontSize:"clamp(40px,6vw,76px)",fontWeight:900,lineHeight:1,color:"#e8eaed"}}>{t.heroA}</span>
            <span className="glitch orbitron reveal" data-text={t.heroB} style={{fontSize:"clamp(40px,6vw,76px)",fontWeight:900,lineHeight:1,color:"#e8eaed"}}>{t.heroB}</span>
            <span className="orbitron reveal" style={{fontSize:"clamp(40px,6vw,76px)",fontWeight:900,lineHeight:1,color:CYAN,animation:"neonCyan 3s ease-in-out infinite"}}>{t.heroC}</span>
          </h1>
          <p className="reveal" style={{fontSize:16,color:"#5a6a7a",lineHeight:1.8,marginBottom:36,maxWidth:560,margin:"0 auto 36px"}}>{t.heroSub}</p>
          <div className="reveal" style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
            <button
              className="neon-btn neon-btn-fill orbitron"
              style={{background:`linear-gradient(135deg,${PINK},${CYAN})`,color:"#fff",border:"none",borderRadius:4,padding:"14px 36px",fontSize:12,fontWeight:700,letterSpacing:3}}
              onClick={function(){ var el=document.getElementById("shop-section"); if(el) el.scrollIntoView({behavior:"smooth"}); }}
            >{t.shopNow}</button>
            <button
              className="neon-btn orbitron"
              style={{background:"transparent",color:CYAN,border:`1px solid ${CYAN}`,borderRadius:4,padding:"14px 36px",fontSize:12,fontWeight:700,letterSpacing:3,position:"relative"}}
              onClick={function(){ setCartOpen(true); }}
            >
              CART {cartCount > 0 && <span style={{background:PINK,borderRadius:"50%",width:18,height:18,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,marginLeft:8}}>{cartCount}</span>}
            </button>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div style={{background:BG2,borderTop:`1px solid ${BD}`,borderBottom:`1px solid ${BD}`,display:"flex",flexWrap:"wrap"}}>
        {t.trust.map(function(item: any, i: number) {
          return (
            <div key={i} className="trust-item" style={{flex:"1 1 220px",display:"flex",alignItems:"center",gap:14,padding:"22px 28px"}}>
              <span style={{fontSize:26}}>{item.ic}</span>
              <div>
                <div className="mono" style={{fontSize:11,fontWeight:700,letterSpacing:2,color:CYAN,marginBottom:3}}>{item.t}</div>
                <div style={{fontSize:13,color:"#3a4a5a"}}>{item.s}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── PRODUCTS ── */}
      <section id="shop-section" style={{paddingTop:72,paddingBottom:100}}>
        <h2 className="orbitron reveal" style={{textAlign:"center",fontSize:"clamp(24px,4vw,44px)",fontWeight:900,letterSpacing:6,color:"#fff",marginBottom:8}}>{t.ourProducts}</h2>
        <div style={{width:60,height:2,background:`linear-gradient(90deg,${PINK},${CYAN})`,margin:"0 auto 12px",borderRadius:2}} />
        <p className="mono reveal" style={{textAlign:"center",color:"#3a4a5a",fontSize:12,letterSpacing:3,marginBottom:40}}>INTERACTIVE PROPS STORE</p>

        {/* Filters */}
        <div style={{maxWidth:1200,margin:"0 auto 32px",padding:"0 28px",display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
          <input
            className="mono"
            style={{flex:1,minWidth:200,padding:"10px 18px",borderRadius:4,border:`1px solid ${BD}`,fontSize:12,background:BG2,outline:"none",color:CYAN,letterSpacing:1}}
            placeholder={t.searchPlaceholder} value={search} onChange={function(e){ setSearch(e.target.value); }}
          />
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {allCats.map(function(c: string) {
              var active = category===c;
              return (
                <button key={c} className="neon-btn" style={{padding:"7px 14px",borderRadius:4,border:`1px solid ${active?CYAN:BD}`,background:active?`rgba(0,212,255,0.1)`:"transparent",cursor:"pointer",fontSize:11,color:active?CYAN:"#444",fontWeight:700,letterSpacing:1,fontFamily:"'Share Tech Mono',monospace"}} onClick={function(){ setCategory(c); }}>{c}</button>
              );
            })}
          </div>
          <button className="neon-btn" style={{display:"flex",alignItems:"center",gap:8,background:`rgba(0,212,255,0.08)`,color:CYAN,border:`1px solid ${CYAN}`,borderRadius:4,padding:"9px 20px",cursor:"pointer",fontWeight:700,fontSize:12,letterSpacing:2,marginLeft:"auto",fontFamily:"'Share Tech Mono',monospace"}} onClick={function(){ setCartOpen(true); }}>
            [{t.yourCart} {cartCount > 0 && <span style={{background:PINK,borderRadius:"50%",width:18,height:18,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>{cartCount}</span>}]
          </button>
        </div>

        <div style={{maxWidth:1200,margin:"0 auto",padding:"0 28px 60px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:24}}>
          {filtered.length===0 && <div style={{gridColumn:"1/-1",textAlign:"center",color:"#2a3a4a",fontSize:16,padding:60}}>{t.noProductsFound}</div>}
          {filtered.map(function(p: any) { return <ProductCard key={p.id} product={p} onAdd={function(){ addToCart(p); }} t={t} />; })}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{background:BG2,borderTop:`1px solid ${BD}`,paddingTop:60}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"0 28px 52px",display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr 1fr 1.4fr",gap:40}}>
          <div>
            <div style={{marginBottom:16}}><LogoSVG size={64} /></div>
            <p style={{color:"#2a3a4a",fontSize:13,lineHeight:1.8,maxWidth:240,marginBottom:20}}>{t.footerMission}</p>
          </div>
          <div>
            <div className="mono" style={{fontSize:10,fontWeight:700,letterSpacing:3,color:CYAN,marginBottom:16}}>SHOP</div>
            <div style={{fontSize:13,color:"#2a3a4a",marginBottom:10,cursor:"pointer"}} onClick={function(){ setView("shop"); window.scrollTo(0,0); }}>{t.allProducts}</div>
            {products.filter(function(p: any){ return p.active; }).map(function(p: any) {
              return <div key={p.id} style={{fontSize:13,color:"#2a3a4a",marginBottom:10,cursor:"pointer",transition:"color 0.2s"}} onMouseEnter={function(e){ (e.target as any).style.color=CYAN; }} onMouseLeave={function(e){ (e.target as any).style.color="#2a3a4a"; }} onClick={function(){ setView("shop"); setTimeout(function(){ var el=document.getElementById("p"+p.id); if(el) el.scrollIntoView({behavior:"smooth",block:"center"}); },100); }}>{p.name}</div>;
            })}
          </div>
          <div>
            <div className="mono" style={{fontSize:10,fontWeight:700,letterSpacing:3,color:CYAN,marginBottom:16}}>COMPANY</div>
            {[["about",t.about],["contact",t.contact]].map(function([v,label]) {
              return <div key={v} style={{fontSize:13,color:"#2a3a4a",marginBottom:10,cursor:"pointer",transition:"color 0.2s"}} onMouseEnter={function(e){ (e.target as any).style.color=CYAN; }} onMouseLeave={function(e){ (e.target as any).style.color="#2a3a4a"; }} onClick={function(){ setView(v); window.scrollTo(0,0); }}>{label}</div>;
            })}
          </div>
          <div>
            <div className="mono" style={{fontSize:10,fontWeight:700,letterSpacing:3,color:CYAN,marginBottom:16}}>SUPPORT</div>
            {[["shipping","Shipping"],["returns","Returns & Refunds"],["warranty","Warranty"],["faq","FAQs"]].map(function([v,label]) {
              return <div key={v} style={{fontSize:13,color:"#2a3a4a",marginBottom:10,cursor:"pointer",transition:"color 0.2s"}} onMouseEnter={function(e){ (e.target as any).style.color=CYAN; }} onMouseLeave={function(e){ (e.target as any).style.color="#2a3a4a"; }} onClick={function(){ setView(v); window.scrollTo(0,0); }}>{label}</div>;
            })}
          </div>
          <div>
            <div className="mono" style={{fontSize:10,fontWeight:700,letterSpacing:3,color:CYAN,marginBottom:16}}>{t.stayConnected}</div>
            <p style={{color:"#2a3a4a",fontSize:13,marginBottom:14,lineHeight:1.7}}>{t.newsletterSub}</p>
            <div style={{display:"flex",border:`1px solid ${BD}`,borderRadius:4,overflow:"hidden"}}>
              <input className="mono" style={{flex:1,padding:"10px 14px",background:BG3,border:"none",color:CYAN,fontSize:12,outline:"none"}} placeholder={t.emailPlaceholder} />
              <button className="neon-btn" style={{background:`rgba(0,212,255,0.12)`,color:CYAN,border:"none",borderLeft:`1px solid ${BD}`,padding:"0 16px",cursor:"pointer",fontSize:16}}>→</button>
            </div>
          </div>
        </div>
        <div style={{borderTop:`1px solid ${BD}`,padding:"20px 28px",maxWidth:1200,margin:"0 auto",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12,fontSize:12}}>
          <span className="mono" style={{color:"#1a2a3a"}}>© 2025 Interactive Props. All rights reserved.</span>
          <span className="mono" style={{color:PINK,animation:"neonPink 4s ease-in-out infinite"}}>{t.footerTag}</span>
          <span className="mono" style={{color:"#1a2a3a"}}>Terms of Service | Privacy Policy</span>
        </div>
      </footer>

      {/* ── CART DRAWER ── */}
      {cartOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:200,display:"flex",justifyContent:"flex-end"}} onClick={function(){ setCartOpen(false); }}>
          <div style={{background:BG2,borderLeft:`1px solid ${CYAN}`,boxShadow:`-4px 0 30px rgba(0,212,255,0.1)`,width:"100%",maxWidth:400,display:"flex",flexDirection:"column",overflowY:"auto"}} onClick={function(e){ e.stopPropagation(); }}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${BD}`,position:"sticky",top:0,background:BG2,zIndex:1}}>
              <span className="orbitron" style={{fontSize:13,fontWeight:800,letterSpacing:3,color:CYAN}}>{t.yourCart}</span>
              <button className="neon-btn" style={{background:"none",border:`1px solid ${BD}`,borderRadius:4,padding:"4px 10px",fontSize:13,cursor:"pointer",color:"#444",fontFamily:"inherit"}} onClick={function(){ setCartOpen(false); }}>✕</button>
            </div>
            {cart.length===0
              ? <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#2a3a4a",fontSize:15}}>{t.cartEmpty}</div>
              : <>
                  <div style={{flex:1,overflowY:"auto",padding:"16px 22px"}}>
                    {cart.map(function(item: any) {
                      return (
                        <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,paddingBottom:16,borderBottom:`1px solid ${BD}`}}>
                          {item.img ? <img src={item.img} alt={item.name} style={{width:42,height:42,objectFit:"contain",borderRadius:6,border:`1px solid ${BD}`}} /> : <span style={{fontSize:28}}>{item.emoji}</span>}
                          <div style={{flex:1}}>
                            <div style={{fontWeight:600,fontSize:13,color:"#ccc"}}>{item.name}</div>
                            <div className="mono" style={{color:CYAN,fontSize:12}}>${item.price}</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <button className="neon-btn" style={{width:26,height:26,borderRadius:3,border:`1px solid ${BD}`,background:BG3,cursor:"pointer",fontSize:14,color:"#aaa",fontFamily:"inherit"}} onClick={function(){ setCart(function(c){ return c.map(function(i: any){ return i.id===item.id ? Object.assign({},i,{qty:Math.max(0,i.qty-1)}) : i; }).filter(function(i: any){ return i.qty>0; }); }); }}>-</button>
                            <span className="mono" style={{color:"#fff",fontWeight:700,minWidth:18,textAlign:"center"}}>{item.qty}</span>
                            <button className="neon-btn" style={{width:26,height:26,borderRadius:3,border:`1px solid ${BD}`,background:BG3,cursor:"pointer",fontSize:14,color:"#aaa",fontFamily:"inherit"}} onClick={function(){ setCart(function(c){ return c.map(function(i: any){ return i.id===item.id ? Object.assign({},i,{qty:i.qty+1}) : i; }); }); }}>+</button>
                          </div>
                          <span className="mono" style={{color:CYAN,fontWeight:700,minWidth:56,textAlign:"right"}}>${(item.price*item.qty).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{padding:"16px 22px",borderTop:`1px solid ${BD}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                      <span style={{color:"#aaa",fontWeight:600}}>{t.total}</span>
                      <span className="mono" style={{color:CYAN,fontSize:22,fontWeight:800}}>${cartTotal.toFixed(2)}</span>
                    </div>
                    <button className="neon-btn neon-btn-fill orbitron" style={{width:"100%",background:`linear-gradient(135deg,${PINK},${CYAN})`,color:"#fff",border:"none",borderRadius:4,padding:"13px 20px",cursor:"pointer",fontWeight:700,fontSize:12,letterSpacing:3}} onClick={function(){ setCartOpen(false); setCheckoutOpen(true); }}>{t.checkout}</button>
                  </div>
                </>
            }
          </div>
        </div>
      )}

      {checkoutOpen && <CheckoutModal cart={cart} cartTotal={cartTotal} paypalLoaded={paypalLoaded} paypalClientId={paypalClientId} onClose={function(){ setCheckoutOpen(false); }} onComplete={handleOrderComplete} t={t} />}
      {toast && <div className="mono" style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:`linear-gradient(135deg,${PINK},${CYAN})`,color:"#fff",padding:"11px 28px",borderRadius:30,fontSize:12,fontWeight:700,zIndex:999,whiteSpace:"nowrap",letterSpacing:2}}>{toast}</div>}
    </span>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard(props: any) {
  var {product: p, onAdd, t} = props;
  return (
    <div id={"p"+p.id} className="product-card reveal" style={{background:BG2,border:`1px solid ${BD}`,borderRadius:4,overflow:"hidden",display:"flex",flexDirection:"column",position:"relative"}}>
      {/* Category badge */}
      <div style={{height:210,display:"flex",alignItems:"center",justifyContent:"center",background:`radial-gradient(ellipse at center,rgba(0,212,255,0.08) 0%,${BG2} 70%)`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at center,rgba(0,212,255,0.05),transparent 65%)`}} />
        <span className="mono" style={{position:"absolute",top:12,left:12,background:`rgba(0,212,255,0.1)`,border:`1px solid rgba(0,212,255,0.3)`,color:CYAN,fontSize:9,fontWeight:700,letterSpacing:3,borderRadius:2,padding:"3px 10px"}}>{p.category.toUpperCase()}</span>
        {p.type==="digital" && <span className="mono" style={{position:"absolute",top:12,right:12,background:`rgba(255,45,120,0.1)`,border:`1px solid rgba(255,45,120,0.3)`,color:PINK,fontSize:9,fontWeight:700,letterSpacing:2,borderRadius:2,padding:"3px 8px"}}>DIGITAL</span>}
        {p.img
          ? <img src={p.img} alt={p.name} style={{height:160,maxWidth:"88%",objectFit:"contain",position:"relative",zIndex:1,filter:`drop-shadow(0 0 16px rgba(0,212,255,0.35))`}} />
          : <span style={{fontSize:80,filter:`drop-shadow(0 0 20px rgba(0,212,255,0.4))`,position:"relative",zIndex:1}}>{p.emoji}</span>
        }
      </div>
      <div style={{padding:"18px 20px 10px",flex:1}}>
        <div className="mono" style={{fontSize:10,color:CYAN2,letterSpacing:3,fontWeight:700,marginBottom:4}}>INTERACTIVE</div>
        <div className="orbitron" style={{fontSize:20,fontWeight:900,color:"#e8eaed",letterSpacing:1,marginBottom:8,lineHeight:1.1}}>{p.name.replace("Interactive ","").toUpperCase()}</div>
        <div style={{fontSize:13,color:"#3a4a5a",lineHeight:1.65}}>{p.desc}</div>
        {p.stock < 15 && <div className="mono" style={{fontSize:10,color:PINK,fontWeight:600,marginTop:8,letterSpacing:2}}>{t.onlyLeft} {p.stock} {t.inStock}</div>}
      </div>
      <div style={{padding:"14px 20px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",borderTop:`1px solid ${BD}`}}>
        <span className="mono" style={{fontSize:24,fontWeight:800,color:"#fff"}}>${p.price}</span>
        <button className="neon-btn neon-btn-pink orbitron" style={{background:"transparent",color:PINK,border:`1px solid ${PINK}`,borderRadius:4,padding:"9px 18px",cursor:"pointer",fontWeight:700,fontSize:10,letterSpacing:2}} onClick={onAdd}>{t.addToCart}</button>
      </div>
    </div>
  );
}

// ─── CHECKOUT MODAL ───────────────────────────────────────────────────────────
function CheckoutModal(props: any) {
  var {cart, cartTotal, paypalLoaded, paypalClientId, onClose, onComplete, t} = props;
  const [step, setStep] = useState("shipping");
  const [shipping, setShipping] = useState({name:"",email:"",phone:"",address:"",city:"",state:"",zip:"",country:"US"});
  const [errors, setErrors] = useState<any>({});
  const [signText, setSignText] = useState("");

  var hasPhysical = cart.some(function(i: any){ return i.type==="physical"; });
  var hasLEDSign = cart.some(function(i: any){ return i.name==="Interactive LED Sign"; });
  var extraLetters = hasLEDSign && signText ? Math.max(0, signText.replace(/ /g,"").length-8) : 0;
  var extraCost = extraLetters * 3;
  var finalTotal = cartTotal + extraCost;

  var inp: any = {padding:"10px 14px",borderRadius:4,border:`1px solid ${BD}`,fontSize:13,outline:"none",width:"100%",background:BG3,color:"#e0e0e0",fontFamily:"'Rajdhani',sans-serif"};
  var bigBtn: any = {width:"100%",background:`linear-gradient(135deg,${PINK},${CYAN})`,color:"#fff",border:"none",borderRadius:4,padding:"13px 20px",cursor:"pointer",fontWeight:700,fontSize:12,letterSpacing:3,fontFamily:"'Orbitron',sans-serif"};
  var lbl: any = {display:"flex",flexDirection:"column",gap:5,fontSize:11,fontWeight:700,color:"#3a4a5a",letterSpacing:2,fontFamily:"'Share Tech Mono',monospace"};

  function validate() {
    var e: any = {};
    if (!shipping.name.trim()) e.name = t.required;
    if (!shipping.email.trim() || !shipping.email.includes("@")) e.email = t.validEmail;
    if (hasPhysical) {
      if (!shipping.address.trim()) e.address = t.required;
      if (!shipping.city.trim()) e.city = t.required;
      if (!shipping.zip.trim()) e.zip = t.required;
    }
    if (hasLEDSign && !signText.trim()) e.signText = t.enterLEDText;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  useEffect(function() {
    if (step!=="payment" || !paypalLoaded || paypalClientId==="YOUR_PAYPAL_CLIENT_ID") return;
    var container = document.getElementById("paypal-btn-container");
    if (!container || container.childNodes.length>0) return;
    var items = cart.map(function(i: any) {
      return {name:i.name,unit_amount:{value:i.price.toFixed(2),currency_code:"USD"},quantity:String(i.qty),sku:String(i.id),category:i.type==="digital"?"DIGITAL_GOODS":"PHYSICAL_GOODS"};
    });
    if (extraCost > 0) {
      items.push({name:"Interactive LED Sign - Extra Letters ("+extraLetters+" x $3.00)",unit_amount:{value:extraCost.toFixed(2),currency_code:"USD"},quantity:"1",category:"PHYSICAL_GOODS"});
    }
    (window as any).paypal.Buttons({
      createOrder: function(data: any, actions: any) {
        return actions.order.create({purchase_units:[{description:"Interactive Props Order",amount:{value:finalTotal.toFixed(2),currency_code:"USD",breakdown:{item_total:{value:finalTotal.toFixed(2),currency_code:"USD"}}},items}]});
      },
      onApprove: async function(data: any, actions: any) { var order = await actions.order.capture(); onComplete(order,shipping,signText,finalTotal); setStep("done"); },
      onError: function() { alert("Payment failed. Please try again."); },
      style:{layout:"vertical",color:"black",shape:"rect",label:"pay"},
    }).render("#paypal-btn-container");
  }, [step, paypalLoaded]);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",justifyContent:"center",alignItems:"center"}} onClick={onClose}>
      <div style={{background:BG2,border:`1px solid ${CYAN}`,boxShadow:`0 0 40px rgba(0,212,255,0.15)`,width:"100%",maxWidth:520,margin:"auto",borderRadius:4,maxHeight:"92vh",overflowY:"auto"}} onClick={function(e){ e.stopPropagation(); }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${BD}`,position:"sticky",top:0,background:BG2,zIndex:1}}>
          <span className="orbitron" style={{fontSize:12,fontWeight:800,letterSpacing:4,color:CYAN}}>{step==="done"?t.orderConfirmed:step==="payment"?t.payment:t.checkout}</span>
          <button className="neon-btn" style={{background:"none",border:`1px solid ${BD}`,borderRadius:3,padding:"4px 10px",fontSize:13,cursor:"pointer",color:"#444",fontFamily:"inherit"}} onClick={onClose}>✕</button>
        </div>

        {/* Order summary */}
        <div style={{margin:"16px 24px 0",background:BG3,borderRadius:4,padding:"14px 18px",border:`1px solid ${BD}`}}>
          {cart.map(function(i: any) {
            return <div key={i.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"3px 0",color:"#666"}}>
              <span>{i.emoji} {i.name} x{i.qty}</span>
              <span className="mono" style={{color:CYAN,fontWeight:700}}>${(i.price*i.qty).toFixed(2)}</span>
            </div>;
          })}
          {extraCost > 0 && (
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"3px 0",color:"#555"}}>
              <span>✨ LED extra letters ({extraLetters} x $3.00)</span>
              <span className="mono" style={{color:CYAN,fontWeight:700}}>+${extraCost.toFixed(2)}</span>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,borderTop:`1px solid ${BD}`,paddingTop:10,marginTop:6}}>
            <span style={{color:"#aaa"}}>{t.total}</span>
            <span className="mono" style={{color:CYAN,fontSize:18}}>${finalTotal.toFixed(2)}</span>
          </div>
        </div>

        {step==="shipping" && (
          <div style={{padding:"20px 24px 28px",display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <label style={lbl}>{t.fullName}<input style={Object.assign({},inp,errors.name?{borderColor:PINK}:{})} value={shipping.name} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{name:e.target.value}); }); }} placeholder="Jane Smith" />{errors.name&&<span style={{color:PINK,fontSize:11}}>{errors.name}</span>}</label>
              <label style={lbl}>{t.email}<input style={Object.assign({},inp,errors.email?{borderColor:PINK}:{})} type="email" value={shipping.email} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{email:e.target.value}); }); }} placeholder="jane@email.com" />{errors.email&&<span style={{color:PINK,fontSize:11}}>{errors.email}</span>}</label>
            </div>
            <label style={lbl}>{t.phone}<input style={inp} value={shipping.phone} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{phone:e.target.value}); }); }} placeholder="+1 555 000 0000" /></label>
            {hasPhysical && (
              <>
                <div className="mono" style={{fontSize:10,letterSpacing:3,color:CYAN,fontWeight:700,marginTop:4}}>{t.shippingAddr}</div>
                <label style={lbl}>{t.street}<input style={Object.assign({},inp,errors.address?{borderColor:PINK}:{})} value={shipping.address} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{address:e.target.value}); }); }} placeholder="123 Main St" /></label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  <label style={lbl}>{t.city}<input style={inp} value={shipping.city} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{city:e.target.value}); }); }} placeholder="New York" /></label>
                  <label style={lbl}>{t.state}<input style={inp} value={shipping.state} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{state:e.target.value}); }); }} placeholder="NY" /></label>
                  <label style={lbl}>{t.zip}<input style={inp} value={shipping.zip} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{zip:e.target.value}); }); }} placeholder="10001" /></label>
                </div>
                <label style={lbl}>{t.country}<select style={inp} value={shipping.country} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{country:e.target.value}); }); }}><option value="US">United States</option><option value="CA">Canada</option><option value="GB">United Kingdom</option><option value="AU">Australia</option><option value="OTHER">Other</option></select></label>
              </>
            )}
            {hasLEDSign && (
              <div style={{background:`linear-gradient(135deg,rgba(0,212,255,0.06),rgba(255,45,120,0.06))`,border:`1px solid rgba(0,212,255,0.25)`,borderRadius:4,padding:"18px 20px"}}>
                <div className="mono" style={{fontSize:10,letterSpacing:3,color:CYAN,fontWeight:700,marginBottom:10}}>{t.customizeLED}</div>
                <div style={{fontSize:13,color:"#4a5a6a",marginBottom:10}}>{t.customizeLEDSub}</div>
                <input className="mono" style={Object.assign({},inp,errors.signText?{borderColor:PINK}:{borderColor:CYAN},{letterSpacing:4,fontWeight:700,fontSize:16,textAlign:"center",color:CYAN})} value={signText} maxLength={20} onChange={function(e){ setSignText(e.target.value.toUpperCase()); }} placeholder="MAX GAMER" />
                <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                  {errors.signText && <span style={{color:PINK,fontSize:11}}>{errors.signText}</span>}
                  <span className="mono" style={{color:"#3a4a5a",fontSize:11,marginLeft:"auto"}}>{signText.length}/20</span>
                </div>
                {signText.replace(/ /g,"").length>8 && (
                  <div style={{marginTop:10,background:`rgba(0,212,255,0.05)`,border:`1px solid rgba(0,212,255,0.2)`,borderRadius:4,padding:"10px 14px"}}>
                    <div className="mono" style={{fontSize:10,color:"#3a4a5a",marginBottom:4}}>{t.extraLetterCost}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:13,color:"#888"}}>{signText.replace(/ /g,"").length-8} extra × $3.00</span>
                      <span className="mono" style={{fontSize:16,fontWeight:800,color:CYAN}}>+${((signText.replace(/ /g,"").length-8)*3).toFixed(2)}</span>
                    </div>
                    <div className="mono" style={{fontSize:10,color:"#3a8a3a",marginTop:6}}>{t.ledIncluded}</div>
                  </div>
                )}
                {signText.replace(/ /g,"").length>0 && signText.replace(/ /g,"").length<=8 && (
                  <div className="mono" style={{marginTop:8,fontSize:11,color:"#3a8a3a"}}>{t.within8}</div>
                )}
                {signText && (
                  <div style={{marginTop:12,textAlign:"center",background:BG3,borderRadius:4,padding:"10px",border:`1px solid ${BD}`}}>
                    <div className="mono" style={{fontSize:10,color:"#3a4a5a",marginBottom:6}}>{t.preview}</div>
                    <div style={{fontSize:22,fontWeight:900,letterSpacing:5,background:"linear-gradient(90deg,#ff0000,#ff8800,#ffff00,#00ff00,#0088ff,#8800ff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{signText}</div>
                  </div>
                )}
              </div>
            )}
            <button className="neon-btn neon-btn-fill orbitron" style={bigBtn} onClick={function(){ if(validate()) setStep("payment"); }}>{t.continuePayment}</button>
          </div>
        )}

        {step==="payment" && (
          <div style={{padding:"20px 24px 28px"}}>
            <div style={{marginBottom:16,fontSize:13,color:"#4a5a6a"}}>{t.payingAs} <span style={{color:CYAN}}>{shipping.email}</span></div>
            {hasLEDSign && signText && (
              <div style={{marginBottom:16,background:BG3,border:`1px solid rgba(0,212,255,0.2)`,borderRadius:4,padding:"10px 14px",fontSize:13}}>
                <span style={{color:"#4a5a6a"}}>{t.ledSignText} </span>
                <span className="mono" style={{color:CYAN,fontWeight:700,letterSpacing:3}}>{signText}</span>
              </div>
            )}
            {paypalClientId==="YOUR_PAYPAL_CLIENT_ID"
              ? <div style={{background:BG3,border:`1px solid ${BD}`,borderRadius:4,padding:"28px 24px",textAlign:"center"}}>
                  <div style={{fontSize:40,marginBottom:12}}>🔑</div>
                  <div className="orbitron" style={{fontWeight:700,color:"#fff",marginBottom:10,fontSize:14}}>{t.paypalNotConfigured}</div>
                  <div style={{fontSize:13,color:"#4a5a6a",lineHeight:1.8}}>1. Create a PayPal Business account<br />2. Go to developer.paypal.com<br />3. Replace YOUR_PAYPAL_CLIENT_ID at the top of the file</div>
                  <button className="neon-btn neon-btn-fill orbitron" style={Object.assign({},bigBtn,{marginTop:20})} onClick={function(){ onComplete({demo:true},shipping,signText,finalTotal); setStep("done"); }}>{t.simOrder}</button>
                </div>
              : <div id="paypal-btn-container" />
            }
            <button className="neon-btn" style={Object.assign({},bigBtn,{background:"transparent",border:`1px solid ${BD}`,color:"#444",marginTop:12})} onClick={function(){ setStep("shipping"); }}>{t.back}</button>
          </div>
        )}

        {step==="done" && (
          <div style={{padding:"48px 32px",textAlign:"center"}}>
            <div style={{fontSize:64,marginBottom:16,animation:"float 2s ease-in-out infinite"}}>🎉</div>
            <h2 className="orbitron" style={{fontSize:30,color:CYAN,letterSpacing:4,marginBottom:10,animation:"neonCyan 3s ease-in-out infinite"}}>{t.thankYou}</h2>
            <p style={{color:"#4a5a6a",fontSize:14,lineHeight:1.8,marginBottom:16}}>{t.confirmSentTo} <span style={{color:CYAN}}>{shipping.email}</span>.</p>
            {hasLEDSign && signText && (
              <div style={{background:BG3,border:`1px solid rgba(0,212,255,0.3)`,borderRadius:4,padding:"14px 20px",marginBottom:24,display:"inline-block"}}>
                <div className="mono" style={{fontSize:10,color:"#4a5a6a",marginBottom:6,letterSpacing:3}}>{t.yourLEDWillSay}</div>
                <div className="orbitron" style={{fontSize:22,fontWeight:900,letterSpacing:5,color:CYAN,animation:"neonCyan 2s ease-in-out infinite"}}>{signText}</div>
              </div>
            )}
            <button className="neon-btn neon-btn-fill orbitron" style={bigBtn} onClick={onClose}>{t.keepShopping}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PAGE SHELL ───────────────────────────────────────────────────────────────
function PageShell(props: any) {
  var {title, setView, children, t} = props;
  return (
    <div style={{background:BG,minHeight:"calc(100vh - 68px)",padding:"60px 28px"}}>
      <div style={{maxWidth:820,margin:"0 auto"}}>
        <button className="neon-btn mono" onClick={function(){ setView("shop"); window.scrollTo(0,0); }} style={{background:"none",border:"none",color:CYAN,cursor:"pointer",fontSize:11,fontWeight:700,letterSpacing:3,marginBottom:32,fontFamily:"'Share Tech Mono',monospace"}}>
          {t.backToShop}
        </button>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:40}}>
          <div style={{width:3,height:48,background:`linear-gradient(180deg,${PINK},${CYAN})`,borderRadius:2}} />
          <h1 className="orbitron" style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:900,letterSpacing:4,color:"#fff"}}>{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── ABOUT VIEW ───────────────────────────────────────────────────────────────
function AboutView(props: any) {
  var {setView, t} = props;
  return (
    <PageShell title="ABOUT US" setView={setView} t={t}>
      <div style={{background:BG2,border:`1px solid ${BD}`,borderRadius:4,padding:"40px 48px",lineHeight:1.9}}>
        <p className="orbitron" style={{fontSize:15,color:CYAN,fontWeight:700,marginBottom:24,animation:"neonCyan 4s ease-in-out infinite"}}>Welcome to Interactive Props — where streaming becomes truly interactive.</p>
        <p style={{color:"#4a5a6a",fontSize:15,marginBottom:20}}>We created Interactive Props with one goal in mind: to help streamers turn their content into unforgettable live experiences. As creators ourselves, we know how hard it can be to keep streams exciting, stand out from thousands of channels, and create moments that viewers actually remember.</p>
        <p style={{color:"#4a5a6a",fontSize:15,marginBottom:20}}>From the Interactive Blaster firing foam darts during live events, to the Interactive Silly String launching chaos on stream, and the Interactive Pump creating hilarious audience-triggered moments, every product is designed to connect your viewers directly to your stream in a physical, real-life way.</p>
        <p style={{color:"#4a5a6a",fontSize:15,marginBottom:20}}>Our products work with livestream platforms, webhooks, goals, donations, gifts, and custom triggers, allowing viewers to become part of the show instead of just watching it.</p>
        <ul style={{color:"#4a5a6a",fontSize:15,paddingLeft:24,marginBottom:24,lineHeight:2.2}}>
          {["Easy setup for streamers","Real-time audience interaction","Unique stream moments that increase engagement","Reliable integrations with modern streaming tools","Products built specifically for content creators"].map(function(item,i){
            return <li key={i} style={{marginBottom:4}}><span style={{color:CYAN,marginRight:8}}>▶</span>{item}</li>;
          })}
        </ul>
        <p className="orbitron" style={{color:PINK,fontSize:14,fontWeight:700,animation:"neonPink 4s ease-in-out infinite"}}>Because streaming should be more than watching. It should be interactive.</p>
      </div>
      <div style={{marginTop:40,textAlign:"center"}}>
        <button className="neon-btn neon-btn-fill orbitron" style={{background:`linear-gradient(135deg,${PINK},${CYAN})`,color:"#fff",border:"none",borderRadius:4,padding:"14px 40px",cursor:"pointer",fontWeight:700,fontSize:12,letterSpacing:3}} onClick={function(){ setView("shop"); }}>{t.shopNow}</button>
      </div>
    </PageShell>
  );
}

// ─── CONTACT VIEW ─────────────────────────────────────────────────────────────
function ContactView(props: any) {
  var {setView, t} = props;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  var inp: any = {padding:"10px 14px",borderRadius:4,border:`1px solid ${BD}`,fontSize:13,outline:"none",width:"100%",background:BG3,color:"#e0e0e0",fontFamily:"'Rajdhani',sans-serif"};
  var bigBtn: any = {width:"100%",background:`linear-gradient(135deg,${PINK},${CYAN})`,color:"#fff",border:"none",borderRadius:4,padding:"13px 20px",cursor:"pointer",fontWeight:700,fontSize:12,letterSpacing:3,fontFamily:"'Orbitron',sans-serif"};
  var lbl: any = {display:"flex",flexDirection:"column",gap:5,fontSize:11,fontWeight:700,color:"#3a4a5a",letterSpacing:2,fontFamily:"'Share Tech Mono',monospace"};
  return (
    <PageShell title="CONTACT US" setView={setView} t={t}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:28}}>
        <div style={{background:BG2,border:`1px solid ${BD}`,borderRadius:4,padding:"36px 32px"}}>
          <p style={{color:"#4a5a6a",fontSize:15,lineHeight:1.9,marginBottom:20}}>Have questions about our products, setup help, partnerships, or your order? We would love to hear from you.</p>
          <p style={{color:"#4a5a6a",fontSize:15,lineHeight:1.9,marginBottom:20}}>At Interactive Props, we are passionate about helping creators build unforgettable interactive streaming experiences.</p>
          <div style={{background:BG3,border:`1px solid rgba(0,212,255,0.25)`,borderRadius:4,padding:"20px 24px",marginBottom:24}}>
            <div className="mono" style={{fontSize:10,letterSpacing:3,color:CYAN,fontWeight:700,marginBottom:8}}>{t.reachDirectly}</div>
            <div className="mono" style={{fontSize:14,color:CYAN,fontWeight:700,animation:"neonCyan 4s ease-in-out infinite"}}>interactiveprops.official@gmail.com</div>
          </div>
          <p style={{color:"#2a3a4a",fontSize:13,lineHeight:1.8}}>We aim to respond as quickly as possible. Please include your order number if applicable.</p>
        </div>
        <div style={{background:BG2,border:`1px solid ${BD}`,borderRadius:4,padding:"36px 32px"}}>
          {sent
            ? <div style={{textAlign:"center",padding:"40px 0"}}>
                <div style={{fontSize:56,marginBottom:16}}>✅</div>
                <h3 className="orbitron" style={{fontSize:24,color:CYAN,letterSpacing:3,marginBottom:10}}>{t.messageSent}</h3>
                <p style={{color:"#4a5a6a",fontSize:14,lineHeight:1.7}}>Thanks! We will get back to you at <span style={{color:CYAN}}>{email}</span>.</p>
                <button className="neon-btn neon-btn-fill orbitron" style={Object.assign({},bigBtn,{marginTop:24})} onClick={function(){ setSent(false); setName(""); setEmail(""); setMsg(""); }}>{t.sendAnother}</button>
              </div>
            : <>
                <div className="mono" style={{fontSize:10,letterSpacing:3,color:CYAN,fontWeight:700,marginBottom:20}}>{t.sendUs}</div>
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <label style={lbl}>{t.yourName}<input style={inp} value={name} onChange={function(e){ setName(e.target.value); }} placeholder="Jane Smith" /></label>
                  <label style={lbl}>{t.emailAddress}<input style={inp} type="email" value={email} onChange={function(e){ setEmail(e.target.value); }} placeholder="jane@email.com" /></label>
                  <label style={lbl}>{t.messageLabel}<textarea style={Object.assign({},inp,{minHeight:130,resize:"vertical"})} value={msg} onChange={function(e){ setMsg(e.target.value); }} placeholder={t.messagePlaceholder} /></label>
                  <button className="neon-btn neon-btn-fill orbitron" style={bigBtn} onClick={function(){ if(name&&email&&msg) setSent(true); }}>{t.sendMessage}</button>
                  <p className="mono" style={{color:"#2a3a4a",fontSize:10,textAlign:"center"}}>{t.orEmailUs}</p>
                </div>
              </>
          }
        </div>
      </div>
    </PageShell>
  );
}

// ─── FAQ VIEW ─────────────────────────────────────────────────────────────────
function FAQView(props: any) {
  var {setView, t} = props;
  const [open, setOpen] = useState<number|null>(null);
  var idx = 0;
  return (
    <PageShell title="FAQs" setView={setView} t={t}>
      <p className="mono" style={{color:"#2a3a4a",fontSize:11,letterSpacing:2,marginBottom:48}}>EVERYTHING YOU NEED TO KNOW ABOUT INTERACTIVE PROPS</p>
      {FAQ_DATA.map(function(section) {
        return (
          <div key={section.category} style={{marginBottom:40}}>
            <h2 className="orbitron" style={{fontSize:14,fontWeight:800,letterSpacing:4,color:CYAN,textTransform:"uppercase",marginBottom:16}}>{section.category}</h2>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              {section.items.map(function(item: any) {
                var myIdx = idx++;
                var isOpen = open===myIdx;
                return (
                  <div key={myIdx} style={{background:isOpen?BG3:BG2,border:`1px solid ${isOpen?CYAN:BD}`,borderRadius:4,overflow:"hidden",transition:"border-color 0.2s",boxShadow:isOpen?`0 0 12px rgba(0,212,255,0.1)`:""}}>
                    <button onClick={function(){ setOpen(isOpen?null:myIdx); }} style={{width:"100%",background:"none",border:"none",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",gap:12,textAlign:"left",fontFamily:"'Rajdhani',sans-serif"}}>
                      <span style={{fontSize:14,fontWeight:600,color:isOpen?CYAN:"#aaa",lineHeight:1.4}}>{item.q}</span>
                      <span className="mono" style={{color:CYAN,fontSize:16,flexShrink:0,fontWeight:700}}>{isOpen?"−":"+"}</span>
                    </button>
                    {isOpen && (
                      <div style={{padding:"0 20px 18px",borderTop:`1px solid ${BD}`}}>
                        <p style={{color:"#4a5a6a",fontSize:14,lineHeight:1.8,marginTop:14}}>{item.a}</p>
                        {item.link && <button onClick={function(){ setView(item.link); }} className="neon-btn mono" style={{marginTop:10,background:"none",border:"none",color:CYAN,cursor:"pointer",fontSize:11,fontWeight:700,letterSpacing:2,padding:0,fontFamily:"inherit"}}>{t.viewPolicy}</button>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{background:BG2,border:`1px solid ${BD}`,borderRadius:4,padding:"28px 32px",textAlign:"center",marginTop:20}}>
        <p style={{color:"#4a5a6a",fontSize:14,marginBottom:16}}>{t.stillQuestions}</p>
        <button className="neon-btn neon-btn-fill orbitron" style={{background:`linear-gradient(135deg,${PINK},${CYAN})`,color:"#fff",border:"none",borderRadius:4,padding:"12px 36px",cursor:"pointer",fontWeight:700,fontSize:12,letterSpacing:3}} onClick={function(){ setView("contact"); }}>{t.contactUs}</button>
      </div>
    </PageShell>
  );
}

// ─── POLICY VIEW ──────────────────────────────────────────────────────────────
function PolicyView(props: any) {
  var {type, setView, t} = props;
  var title = type==="returns"?"RETURNS & REFUNDS":type==="warranty"?"WARRANTY POLICY":"SHIPPING & DELIVERY";
  var sections = type==="shipping" ? [
    {h:null,b:"At Interactive Props, we work hard to process and ship orders as quickly and safely as possible so you can start creating unforgettable interactive stream moments."},
    {h:"Order Processing",b:"Most orders are processed within 2 to 5 business days. Some products may require additional processing time due to customization, testing, or high demand. Once your order has been processed and shipped, you will receive a confirmation email with tracking information."},
    {h:"Shipping Times",b:"Estimated delivery times may vary depending on:",bullets:["Product availability","Customization requirements","Shipping carrier delays","Destination location"],footer:"Domestic orders typically arrive within 3 to 10 business days after shipment, while international delivery times may vary by country."},
    {h:"International Shipping",b:"We may offer international shipping to select countries. Customers are responsible for any customs fees, import taxes, duties, or additional charges required by their country."},
    {h:"Tracking Information",b:"Tracking details will be sent to the email provided during checkout once your order ships."},
    {h:"Incorrect Addresses",b:"Customers are responsible for providing accurate shipping information. Interactive Props is not responsible for delays, lost packages, or additional shipping charges caused by incorrect or incomplete addresses."},
    {h:"Delayed or Lost Packages",b:"If your package appears lost or significantly delayed, please contact us and we will do our best to assist you."},
    {h:"Damaged Deliveries",b:"If your order arrives damaged, please contact us within 48 hours of delivery with photos of the packaging and product."},
  ] : type==="returns" ? [
    {h:null,b:"At Interactive Props, we want you to be happy with your purchase. Because many of our products are electronic, customized, or designed specifically for streaming setups, please review our return and refund policy carefully before placing an order."},
    {h:"Return Eligibility",b:"We accept returns within 14 days of delivery for unused items in their original condition and packaging.",bullets:["The item must not show signs of use, damage, or modification","Proof of purchase is required"]},
    {h:"Non-Returnable Items",b:"The following items are non-refundable unless they arrive damaged or defective:",bullets:["Customized or made-to-order products","Modified electronic devices","Digital downloads or software"]},
    {h:"Damaged or Defective Products",b:"If your order arrives damaged or defective, please contact us within 48 hours of delivery with:",bullets:["Your order number","Photos or videos showing the issue","A brief description of the problem"],footer:"We will review the issue and offer a replacement, repair, store credit, or refund depending on the situation."},
    {h:"Refund Process",b:"Once we receive and inspect the returned item, we will notify you. Approved refunds are issued back to the original payment method within 5 to 10 business days."},
    {h:"Return Shipping",b:"Customers are responsible for return shipping costs unless the product arrived damaged or incorrect."},
    {h:"Order Cancellations",b:"Orders may only be canceled before they are processed or shipped."},
    {h:"Contact Us",b:"If you have any questions about returns or refunds, please contact us through the contact page on our website."},
  ] : [
    {h:null,b:"At Interactive Props, we stand behind the quality of our products. Our products are designed and tested for streaming environments and interactive entertainment use."},
    {h:"Limited Warranty Coverage",b:"All eligible Interactive Props products include a limited 90-day warranty from the date of delivery against manufacturing defects under normal use. This warranty covers:",bullets:["Electrical or hardware failures caused by manufacturing defects","Internal component issues not caused by misuse","Defective assembly or workmanship","Products that stop functioning under normal operating conditions"]},
    {h:"What Is Not Covered",b:"This warranty does not cover:",bullets:["Damage caused by misuse, abuse, accidents, drops, or improper handling","Damage caused by liquids, fire, excessive heat, or unauthorized modifications","Normal cosmetic wear and tear","User modifications, repairs, or disassembly","Consumable or refillable materials","Software, third-party integrations, or external streaming platform issues"]},
    {h:"Warranty Claims",b:"To submit a warranty claim, please contact us with:",bullets:["Your order number","A description of the issue","Photos or videos showing the problem","Any troubleshooting steps already attempted"]},
    {h:"Resolution Options",b:"If a product is determined to be defective under warranty, Interactive Props may choose to:",bullets:["Repair the product","Replace the product with the same or equivalent model","Issue store credit","Provide a partial or full refund if replacement is not possible"]},
    {h:"Warranty Limitations",b:"This warranty is limited to the original purchaser and is non-transferable. Interactive Props is not responsible for indirect, incidental, or consequential damages."},
    {h:"Contact Us",b:"For warranty support, please contact us through our website contact page."},
  ];
  return (
    <PageShell title={title} setView={setView} t={t}>
      <div style={{background:BG2,border:`1px solid ${BD}`,borderRadius:4,padding:"40px 48px"}}>
        {sections.map(function(sec: any, i: number) {
          return (
            <div key={i} style={{marginBottom:32}}>
              {sec.h && <h2 className="orbitron" style={{fontSize:16,fontWeight:800,color:CYAN,letterSpacing:3,marginBottom:12,textTransform:"uppercase"}}>{sec.h}</h2>}
              {sec.b && <p style={{color:"#4a5a6a",fontSize:14,lineHeight:1.9,marginBottom:12}}>{sec.b}</p>}
              {sec.bullets && <ul style={{color:"#4a5a6a",fontSize:14,paddingLeft:24,marginBottom:12,lineHeight:2.1}}>{sec.bullets.map(function(b: string,j: number){ return <li key={j} style={{marginBottom:4}}><span style={{color:CYAN,marginRight:8}}>▶</span>{b}</li>; })}</ul>}
              {sec.footer && <p style={{color:"#4a5a6a",fontSize:14,lineHeight:1.9}}>{sec.footer}</p>}
            </div>
          );
        })}
      </div>
      <div style={{marginTop:40,textAlign:"center"}}>
        <button className="neon-btn neon-btn-fill orbitron" style={{background:`linear-gradient(135deg,${PINK},${CYAN})`,color:"#fff",border:"none",borderRadius:4,padding:"14px 40px",cursor:"pointer",fontWeight:700,fontSize:12,letterSpacing:3}} onClick={function(){ setView("shop"); }}>{t.backToShop}</button>
      </div>
    </PageShell>
  );
}

// ─── LOGIN VIEW ───────────────────────────────────────────────────────────────
function LoginView(props: any) {
  var {onLogin, ownerPassword, t} = props;
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  function handle() {
    if (pw.trim()===ownerPassword) { onLogin(); }
    else { setErr(true); setTimeout(function(){ setErr(false); },1800); }
  }
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"calc(100vh - 68px)",background:BG,padding:24,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:`radial-gradient(circle,rgba(0,212,255,0.06) 0%,transparent 65%)`,top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none"}} />
      <div style={{background:BG2,border:`1px solid ${CYAN}`,boxShadow:`0 0 60px rgba(0,212,255,0.1)`,borderRadius:4,padding:"48px 40px",maxWidth:380,width:"100%",textAlign:"center",position:"relative",zIndex:1}}>
        <LogoSVG size={80} />
        <h2 className="orbitron" style={{fontSize:32,letterSpacing:6,color:CYAN,marginBottom:6,marginTop:16,animation:"neonCyan 3s ease-in-out infinite"}}>{t.login}</h2>
        <p className="mono" style={{color:"#2a3a4a",fontSize:11,marginBottom:28,letterSpacing:2}}>{t.loginSub}</p>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <input type="password" className="mono" style={{padding:"12px 14px",borderRadius:4,border:`1px solid ${err?PINK:BD}`,fontSize:18,letterSpacing:8,textAlign:"center",outline:"none",width:"100%",background:BG3,color:CYAN,transition:"border-color 0.2s"}}
            placeholder="••••••••" value={pw} onChange={function(e){ setPw(e.target.value); }} onKeyDown={function(e){ if(e.key==="Enter") handle(); }} autoFocus />
          {err && <div className="mono" style={{color:PINK,fontSize:11,letterSpacing:2}}>{t.incorrectPw}</div>}
          <button className="neon-btn neon-btn-fill orbitron" style={{width:"100%",background:`linear-gradient(135deg,${PINK},${CYAN})`,color:"#fff",border:"none",borderRadius:4,padding:"13px 20px",cursor:"pointer",fontWeight:700,fontSize:12,letterSpacing:3}} onClick={handle}>{t.login}</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN VIEW ───────────────────────────────────────────────────────────────
function AdminView(props: any) {
  var {products, orders, persistProducts} = props;
  const [tab, setTab] = useState("products");
  const [editId, setEditId] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [toast, setToast] = useState<string|null>(null);
  const [logoSrc, setLogoSrc] = useState<string|null>(null);
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(function() {
    loadLogo().then(function(url) {
      setLogoSrc(url!==LOGO_URL ? url : null);
      (window as any).__ipLogo = url;
    });
  }, []);

  function handleSaveLogo(src: string) {
    setLogoSrc(src);
    (window as any).__ipLogo = src;
    saveLogo(src).catch(function(){});
    st("Logo updated!");
  }
  function removeLogo() {
    setLogoSrc(LOGO_URL);
    (window as any).__ipLogo = LOGO_URL;
    deleteLogo().catch(function(){});
    st("Logo removed");
  }
  function st(msg: string) { setToast(msg); setTimeout(function(){ setToast(null); },2000); }
  function sideActive(id: string) { return tab===id || (tab==="add"&&id==="products") || (tab==="edit"&&id==="products"); }
  function saveForm() {
    if (!form.name.trim() || !form.price) { st("Name and price required"); return; }
    var updated: any[];
    if (editId) { updated = products.map(function(p: any){ return p.id===editId ? Object.assign({},form,{price:Number(form.price),stock:Number(form.stock)}) : p; }); st("Updated!"); }
    else { updated = products.concat([Object.assign({},form,{price:Number(form.price),stock:Number(form.stock)})]); st("Added!"); }
    persistProducts(updated); setTab("products"); setForm(null); setEditId(null);
  }

  var bigBtn: any = {background:`linear-gradient(135deg,${PINK},${CYAN})`,color:"#fff",border:"none",borderRadius:4,padding:"13px 20px",cursor:"pointer",fontWeight:700,fontSize:12,letterSpacing:2,fontFamily:"'Orbitron',sans-serif"};
  var inp: any = {padding:"10px 14px",borderRadius:4,border:`1px solid ${BD}`,fontSize:13,outline:"none",width:"100%",background:BG3,color:"#e0e0e0",fontFamily:"'Rajdhani',sans-serif"};
  var tabs = [{id:"products",lbl:"Products"},{id:"orders",lbl:"Orders"},{id:"branding",lbl:"Branding"}];

  return (
    <div style={{display:"flex",minHeight:"calc(100vh - 68px)",background:BG}}>
      {/* Sidebar */}
      <div style={{width:220,background:BG2,borderRight:`1px solid ${BD}`,padding:"28px 0",display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
        <div className="mono" style={{fontSize:10,fontWeight:700,letterSpacing:4,padding:"0 24px 20px",color:CYAN}}>ADMIN</div>
        {tabs.map(function(tb) {
          return <button key={tb.id} className="neon-btn" style={{background:sideActive(tb.id)?`rgba(0,212,255,0.07)`:"none",border:"none",color:sideActive(tb.id)?CYAN:"#3a4a5a",cursor:"pointer",fontSize:13,padding:"11px 24px",textAlign:"left",fontFamily:"'Rajdhani',sans-serif",letterSpacing:1,borderLeft:sideActive(tb.id)?`2px solid ${CYAN}`:"2px solid transparent",transition:"all 0.2s"}} onClick={function(){ setTab(tb.id); }}>{tb.lbl}</button>;
        })}
      </div>

      {/* Content */}
      <div style={{flex:1,padding:"32px 36px",overflowY:"auto"}}>

        {tab==="products" && (
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <h2 className="orbitron" style={{fontSize:22,fontWeight:900,letterSpacing:4,color:"#fff"}}>PRODUCTS ({products.length})</h2>
              <button style={Object.assign({},bigBtn,{width:"auto",padding:"10px 24px"})} className="neon-btn neon-btn-fill" onClick={function(){ setForm({id:Date.now(),name:"",price:"",type:"physical",category:"Props",desc:"",emoji:EMOJIS[5],img:null,stock:1,active:true}); setEditId(null); setTab("add"); }}>+ Add Product</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {products.map(function(p: any) {
                return (
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:14,background:BG2,padding:"14px 18px",borderRadius:4,border:`1px solid ${BD}`,opacity:p.active?1:0.4}}>
                    {p.img ? <img src={p.img} alt={p.name} style={{width:36,height:36,objectFit:"contain"}} /> : <span style={{fontSize:26}}>{p.emoji}</span>}
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:14,color:"#e0e0e0"}}>{p.name}</div>
                      <div className="mono" style={{fontSize:11,color:"#2a3a4a",letterSpacing:1}}>{p.category} — {p.stock} in stock</div>
                    </div>
                    <span className="mono" style={{fontWeight:800,fontSize:15,color:CYAN,minWidth:72}}>${p.price}</span>
                    <div style={{display:"flex",gap:6}}>
                      <button className="neon-btn" style={{background:BG3,border:`1px solid ${BD}`,borderRadius:4,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600,color:"#888",fontFamily:"inherit"}} onClick={function(){ setForm(Object.assign({},p)); setEditId(p.id); setTab("edit"); }}>Edit</button>
                      <button className="neon-btn" style={{background:p.active?"transparent":"rgba(0,212,255,0.05)",border:`1px solid ${BD}`,borderRadius:4,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600,color:p.active?"#888":CYAN,fontFamily:"inherit"}} onClick={function(){ persistProducts(products.map(function(x: any){ return x.id===p.id ? Object.assign({},x,{active:!x.active}) : x; })); }}>{p.active?"Hide":"Show"}</button>
                      <button className="neon-btn neon-btn-pink" style={{background:"rgba(255,45,120,0.05)",border:`1px solid rgba(255,45,120,0.2)`,borderRadius:4,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600,color:PINK,fontFamily:"inherit"}} onClick={function(){ if(window.confirm("Delete?")){ persistProducts(products.filter(function(x: any){ return x.id!==p.id; })); st("Deleted"); } }}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {(tab==="add"||tab==="edit") && form && (
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <h2 className="orbitron" style={{fontSize:22,fontWeight:900,letterSpacing:4,color:"#fff"}}>{editId?"EDIT PRODUCT":"NEW PRODUCT"}</h2>
              <button className="neon-btn" style={{background:"transparent",border:`1px solid ${BD}`,borderRadius:4,padding:"10px 20px",cursor:"pointer",color:"#3a4a5a",fontSize:13,fontFamily:"inherit"}} onClick={function(){ setTab("products"); setForm(null); }}>Cancel</button>
            </div>
            <div style={{background:BG2,border:`1px solid ${BD}`,borderRadius:4,padding:28,display:"flex",flexDirection:"column",gap:16,maxWidth:640}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:11,fontWeight:700,color:"#3a4a5a",letterSpacing:2,fontFamily:"'Share Tech Mono',monospace"}}>PRODUCT NAME *<input style={inp} value={form.name} onChange={function(e){ setForm(function(f: any){ return Object.assign({},f,{name:e.target.value}); }); }} placeholder="My Product" /></label>
                <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:11,fontWeight:700,color:"#3a4a5a",letterSpacing:2,fontFamily:"'Share Tech Mono',monospace"}}>PRICE (USD) *<input style={inp} type="number" min="0" step="0.01" value={form.price} onChange={function(e){ setForm(function(f: any){ return Object.assign({},f,{price:e.target.value}); }); }} placeholder="29.99" /></label>
              </div>
              <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:11,fontWeight:700,color:"#3a4a5a",letterSpacing:2,fontFamily:"'Share Tech Mono',monospace"}}>DESCRIPTION<textarea style={Object.assign({},inp,{minHeight:72,resize:"vertical"})} value={form.desc} onChange={function(e){ setForm(function(f: any){ return Object.assign({},f,{desc:e.target.value}); }); }} placeholder="Describe your product..." /></label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:11,fontWeight:700,color:"#3a4a5a",letterSpacing:2,fontFamily:"'Share Tech Mono',monospace"}}>CATEGORY<select style={inp} value={form.category} onChange={function(e){ setForm(function(f: any){ return Object.assign({},f,{category:e.target.value}); }); }}>{CATEGORIES.map(function(c){ return <option key={c}>{c}</option>; })}</select></label>
                <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:11,fontWeight:700,color:"#3a4a5a",letterSpacing:2,fontFamily:"'Share Tech Mono',monospace"}}>TYPE<select style={inp} value={form.type} onChange={function(e){ setForm(function(f: any){ return Object.assign({},f,{type:e.target.value}); }); }}><option value="physical">Physical</option><option value="digital">Digital</option></select></label>
                <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:11,fontWeight:700,color:"#3a4a5a",letterSpacing:2,fontFamily:"'Share Tech Mono',monospace"}}>STOCK<input style={inp} type="number" min="0" value={form.stock} onChange={function(e){ setForm(function(f: any){ return Object.assign({},f,{stock:e.target.value}); }); }} /></label>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <span className="mono" style={{fontSize:10,fontWeight:700,color:"#3a4a5a",letterSpacing:2}}>PRODUCT IMAGE</span>
                <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                  <div style={{width:90,height:90,borderRadius:4,border:`1px solid ${BD}`,background:BG3,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                    {form.img ? <img src={form.img} alt="preview" style={{width:"100%",height:"100%",objectFit:"contain"}} /> : <span style={{fontSize:36}}>{form.emoji}</span>}
                  </div>
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
                    <label style={{display:"flex",alignItems:"center",gap:10,background:BG3,border:`1px dashed rgba(0,212,255,0.3)`,borderRadius:4,padding:"10px 16px",cursor:"pointer"}}>
                      <span className="neon-btn mono" style={{fontSize:12,color:CYAN,fontWeight:600,cursor:"pointer"}}>Upload image from device</span>
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={function(e){ var file=(e.target as any).files[0]; if(!file) return; var reader=new FileReader(); reader.onload=function(ev){ setForm(function(f: any){ return Object.assign({},f,{img:(ev.target as any).result}); }); }; reader.readAsDataURL(file); }} />
                    </label>
                    <div style={{display:"flex",gap:8}}>
                      <input style={Object.assign({},inp,{fontSize:12})} value={form.imgUrl||""} onChange={function(e){ setForm(function(f: any){ return Object.assign({},f,{imgUrl:e.target.value}); }); }} placeholder="Or paste image URL: https://..." />
                      <button className="neon-btn" style={{background:`rgba(0,212,255,0.1)`,border:`1px solid ${CYAN}`,borderRadius:4,padding:"10px 14px",cursor:"pointer",color:CYAN,fontSize:12,fontWeight:700,whiteSpace:"nowrap",fontFamily:"inherit"}} onClick={function(){ if(form.imgUrl) setForm(function(f: any){ return Object.assign({},f,{img:f.imgUrl,imgUrl:""}); }); }}>Use URL</button>
                    </div>
                    {form.img && <button className="neon-btn neon-btn-pink" style={{background:"rgba(255,45,120,0.05)",border:`1px solid rgba(255,45,120,0.2)`,borderRadius:4,padding:"6px 14px",cursor:"pointer",color:PINK,fontSize:12,fontWeight:600,fontFamily:"inherit"}} onClick={function(){ setForm(function(f: any){ return Object.assign({},f,{img:null}); }); }}>Remove image</button>}
                  </div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <span className="mono" style={{fontSize:10,fontWeight:700,color:"#3a4a5a",letterSpacing:2}}>EMOJI (shown when no image)</span>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {EMOJIS.map(function(em){ return <button key={em} style={{width:38,height:38,borderRadius:4,border:`1px solid ${form.emoji===em?CYAN:BD}`,background:form.emoji===em?`rgba(0,212,255,0.1)`:BG3,cursor:"pointer",fontSize:18,transition:"all 0.2s"}} onClick={function(){ setForm(function(f: any){ return Object.assign({},f,{emoji:em}); }); }}>{em}</button>; })}
                </div>
              </div>
              <label style={{display:"flex",gap:10,alignItems:"center",fontSize:13,color:"#3a4a5a",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif"}}>
                <input type="checkbox" checked={form.active} onChange={function(e){ setForm(function(f: any){ return Object.assign({},f,{active:(e.target as any).checked}); }); }} /> Visible in store
              </label>
              <button className="neon-btn neon-btn-fill orbitron" style={Object.assign({},bigBtn,{width:"100%"})} onClick={saveForm}>{editId?"SAVE CHANGES":"ADD PRODUCT"}</button>
            </div>
          </>
        )}

        {tab==="orders" && (
          <>
            <h2 className="orbitron" style={{fontSize:22,fontWeight:900,letterSpacing:4,color:"#fff",marginBottom:24}}>ORDERS ({orders.length})</h2>
            {orders.length===0
              ? <div className="mono" style={{color:"#2a3a4a",fontSize:14,padding:40,letterSpacing:2}}>NO ORDERS YET.</div>
              : orders.map(function(o: any) {
                  return (
                    <div key={o.id} style={{background:BG2,border:`1px solid ${BD}`,borderRadius:4,padding:"16px 20px",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                        <span className="mono" style={{fontWeight:700,color:CYAN,fontSize:12}}>{o.id}</span>
                        <span className="mono" style={{background:"rgba(0,212,255,0.08)",color:CYAN,border:`1px solid rgba(0,212,255,0.3)`,fontSize:10,fontWeight:700,padding:"2px 10px",borderRadius:20,letterSpacing:2}}>{o.status}</span>
                        <span className="mono" style={{color:"#2a3a4a",fontSize:11}}>{new Date(o.date).toLocaleString()}</span>
                        <span className="mono" style={{fontWeight:800,color:CYAN,marginLeft:"auto"}}>${o.total.toFixed(2)}</span>
                      </div>
                      <div style={{fontSize:13,color:"#3a4a5a",marginTop:6}}>
                        {o.shipping.name} — {o.shipping.email}
                        {o.shipping.address && " — "+o.shipping.address+", "+o.shipping.city+" "+o.shipping.zip}
                      </div>
                      {o.signText && (
                        <div style={{marginTop:8,background:`rgba(0,212,255,0.05)`,border:`1px solid rgba(0,212,255,0.2)`,borderRadius:4,padding:"8px 14px",display:"inline-flex",alignItems:"center",gap:8}}>
                          <span className="mono" style={{fontSize:11,color:"#3a4a5a",letterSpacing:2}}>LED Sign:</span>
                          <span className="mono" style={{fontSize:14,fontWeight:900,color:CYAN,letterSpacing:4}}>{o.signText}</span>
                          {o.signExtraCost>0 && <span className="mono" style={{fontSize:11,color:PINK,fontWeight:700,marginLeft:8}}>+${o.signExtraCost.toFixed(2)} extra</span>}
                        </div>
                      )}
                      <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                        {o.items.map(function(i: any){ return <span key={i.id} className="mono" style={{background:BG3,border:`1px solid ${BD}`,borderRadius:20,padding:"3px 12px",fontSize:11,color:"#3a4a5a",letterSpacing:1}}>{i.emoji} {i.name} ×{i.qty}</span>; })}
                      </div>
                    </div>
                  );
                })
            }
          </>
        )}

        {tab==="branding" && (
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <h2 className="orbitron" style={{fontSize:22,fontWeight:900,letterSpacing:4,color:"#fff"}}>BRANDING</h2>
            </div>
            <div style={{background:BG2,border:`1px solid ${BD}`,borderRadius:4,padding:28,maxWidth:540,display:"flex",flexDirection:"column",gap:20}}>
              <div className="mono" style={{fontSize:10,letterSpacing:4,color:CYAN,fontWeight:700}}>STORE LOGO</div>
              <div style={{display:"flex",alignItems:"center",gap:20}}>
                <div style={{width:100,height:100,borderRadius:4,border:`1px solid ${BD}`,background:BG3,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                  {logoSrc ? <img src={logoSrc} alt="Logo" style={{width:"100%",height:"100%",objectFit:"contain"}} /> : <LogoSVG size={80} />}
                </div>
                <div>
                  <div style={{color:"#e0e0e0",fontWeight:600,fontSize:14,marginBottom:4}}>{logoSrc?"Custom logo active":"Using default logo"}</div>
                  <div style={{color:"#2a3a4a",fontSize:12,lineHeight:1.6}}>Appears in the header and footer. Recommended: square image, 200×200px or larger.</div>
                </div>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:10,background:BG3,border:`1px dashed rgba(0,212,255,0.3)`,borderRadius:4,padding:"12px 18px",cursor:"pointer"}}>
                <div>
                  <div className="neon-btn mono" style={{fontSize:12,color:CYAN,fontWeight:700,cursor:"pointer"}}>Upload logo from device</div>
                  <div className="mono" style={{fontSize:10,color:"#2a3a4a",letterSpacing:1}}>JPG, PNG, SVG or WebP</div>
                </div>
                <input type="file" accept="image/*" style={{display:"none"}} onChange={function(e){ var file=(e.target as any).files[0]; if(!file) return; var reader=new FileReader(); reader.onload=function(ev){ handleSaveLogo((ev.target as any).result); }; reader.readAsDataURL(file); }} />
              </label>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div className="mono" style={{fontSize:10,fontWeight:700,color:"#3a4a5a",letterSpacing:2}}>OR PASTE AN IMAGE URL</div>
                <div style={{display:"flex",gap:8}}>
                  <input style={inp} value={logoUrl} onChange={function(e){ setLogoUrl(e.target.value); }} placeholder="https://example.com/logo.png" />
                  <button className="neon-btn" style={{background:`rgba(0,212,255,0.1)`,border:`1px solid ${CYAN}`,borderRadius:4,padding:"10px 16px",cursor:"pointer",color:CYAN,fontSize:12,fontWeight:700,whiteSpace:"nowrap",fontFamily:"inherit"}} onClick={function(){ if(logoUrl.trim()){ handleSaveLogo(logoUrl.trim()); setLogoUrl(""); } }}>Apply</button>
                </div>
              </div>
              {logoSrc && <button className="neon-btn neon-btn-pink" style={{background:"rgba(255,45,120,0.05)",border:`1px solid rgba(255,45,120,0.2)`,borderRadius:4,padding:"9px 18px",cursor:"pointer",color:PINK,fontSize:13,fontWeight:600,alignSelf:"flex-start",fontFamily:"inherit"}} onClick={removeLogo}>Remove custom logo</button>}
              <p className="mono" style={{color:"#1a2a3a",fontSize:10,lineHeight:1.8,borderTop:`1px solid ${BD}`,paddingTop:16,letterSpacing:1}}>The logo is saved in your browser. When you deploy to your website, add your hosted image URL as the logo source for a permanent change.</p>
            </div>
          </>
        )}

      </div>
      {toast && <div className="mono" style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:`linear-gradient(135deg,${PINK},${CYAN})`,color:"#fff",padding:"11px 28px",borderRadius:30,fontSize:12,fontWeight:700,zIndex:999,whiteSpace:"nowrap",letterSpacing:2}}>{toast}</div>}
    </div>
  );
}
