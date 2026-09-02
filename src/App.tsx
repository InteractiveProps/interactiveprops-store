import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import Lenis from "lenis";
import "./landing.css";

// ─── FIREBASE ─────────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAAhBlFhTAREyeWsQBmlVD6ktVLXOUQDKU",
  authDomain: "interactiveprop-store.firebaseapp.com",
  projectId: "interactiveprop-store",
  storageBucket: "interactiveprop-store.firebasestorage.app",
  messagingSenderId: "152459636744",
  appId: "1:152459636744:web:9edadf7733fcf2b8c361bd"
};
var _db: any = null, _dbCbs: any[] = [];
var _auth: any = null, _authCbs: any[] = [];
function getDB(): Promise<any> { return new Promise(r => { if (_db) { r(_db); return; } _dbCbs.push(r); }); }
function getAuth(): Promise<any> { return new Promise(r => { if (_auth) { r(_auth); return; } _authCbs.push(r); }); }
function loadScript(src: string): Promise<void> {
  return new Promise(res => { const s = document.createElement("script"); s.src = src; s.onload = () => res(); document.head.appendChild(s); });
}
function initFirebase() {
  if (typeof window === "undefined") return;
  const B = "https://www.gstatic.com/firebasejs/10.7.1/";
  loadScript(B + "firebase-app-compat.js")
    .then(() => Promise.all([loadScript(B + "firebase-firestore-compat.js"), loadScript(B + "firebase-auth-compat.js")]))
    .then(() => {
      const fb = (window as any).firebase;
      if (!fb.apps.length) fb.initializeApp(FIREBASE_CONFIG);
      _db = fb.firestore(); _dbCbs.forEach(c => c(_db)); _dbCbs = [];
      _auth = fb.auth(); _authCbs.forEach(c => c(_auth)); _authCbs = [];
    });
}
if (typeof window !== "undefined") initFirebase();

// ─── ADMIN AUTH (Firebase Authentication — no password lives in this code) ────
async function adminSignIn(email: string, password: string) {
  const auth = await getAuth();
  await auth.signInWithEmailAndPassword(email.trim(), password);
}
async function adminSignOut() { try { const auth = await getAuth(); await auth.signOut(); } catch (e) { /* noop */ } }
function onAdminAuth(cb: (user: any) => void) { getAuth().then(auth => auth.onAuthStateChanged(cb)); }
async function fsGet(col: string, id: string) { try { const db=await getDB(),d=await db.collection(col).doc(id).get(); return d.exists?d.data():null; } catch(e){return null;} }
async function fsSet(col: string, id: string, data: any) { try { const db=await getDB(); await db.collection(col).doc(id).set(data); return true; } catch(e){return false;} }
async function fsAdd(col: string, data: any) { try { const db=await getDB(),r=await db.collection(col).add(data); return r.id; } catch(e){return null;} }
async function fsGetAll(col: string) { try { const db=await getDB(),s=await db.collection(col).orderBy("date","desc").get(); const r:any[]=[]; s.forEach((d:any)=>r.push({_id:d.id,...d.data()})); return r; } catch(e){return[];} }
function fsListen(col: string, cb: (d:any[])=>void) { getDB().then(db=>{ db.collection(col).orderBy("date","desc").onSnapshot((s:any)=>{ const r:any[]=[]; s.forEach((d:any)=>r.push({_id:d.id,...d.data()})); cb(r); }); }); }
// Fotos nuevas de producto (2026). Firestore todavia guarda las URLs viejas de
// imgur; este mapa las cambia por los archivos locales al cargar. Solo pisa esas
// URLs exactas: en cuanto cambies una imagen desde el panel de admin, el valor
// nuevo ya no coincide con ninguna clave y el mapa se aparta solo.
const IMG_NUEVAS: Record<string,string> = {
  "https://i.imgur.com/oblBDNn.png": "/productos/pump.webp",
  "https://i.imgur.com/jCk2vdC.png": "/productos/blaster.webp",
  "https://i.imgur.com/7hYKQdV.png": "/productos/silly-string.webp",
};
function conFotosNuevas(items:any[]) {
  return items.map((p:any)=> (p && IMG_NUEVAS[p.img]) ? {...p, img:IMG_NUEVAS[p.img]} : p);
}
async function loadProducts() { try { const d=await fsGet("settings","products"); if(d?.items) return conFotosNuevas(d.items); const r=localStorage.getItem("ip-products"); return r?conFotosNuevas(JSON.parse(r)):DEFAULT_PRODUCTS; } catch(e){return DEFAULT_PRODUCTS;} }
async function saveProducts(p:any[]) { try { await fsSet("settings","products",{items:p,updated:new Date().toISOString()}); localStorage.setItem("ip-products",JSON.stringify(p)); } catch(e){localStorage.setItem("ip-products",JSON.stringify(p));} }
async function loadOrders() { try { return await fsGetAll("orders"); } catch(e){ const r=localStorage.getItem("ip-orders"); return r?JSON.parse(r):[]; } }
async function saveOrder(o:any) { try { await fsAdd("orders",o); } catch(e){ const ex=JSON.parse(localStorage.getItem("ip-orders")||"[]"); localStorage.setItem("ip-orders",JSON.stringify([o,...ex])); } }
async function loadLogo() { try { const d=await fsGet("settings","logo"); return d?.url??LOGO_URL; } catch(e){ return localStorage.getItem("ip-logo")||LOGO_URL; } }
async function saveLogo(url:string) { try { await fsSet("settings","logo",{url,updated:new Date().toISOString()}); localStorage.setItem("ip-logo",url); } catch(e){localStorage.setItem("ip-logo",url);} }
async function deleteLogo() { try { await fsSet("settings","logo",{url:LOGO_URL,updated:new Date().toISOString()}); localStorage.removeItem("ip-logo"); } catch(e){localStorage.removeItem("ip-logo");} }

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// Admin credentials are NOT stored in this codebase. Sign-in is handled by
// Firebase Authentication (the user lives in the Firebase console).
// El client-id de PayPal es PUBLICO por diseño (viaja en el navegador). Se puede
// sobreescribir con VITE_PAYPAL_CLIENT_ID en Vercel para probar en sandbox sin
// tocar el codigo. El SECRETO nunca vive aqui: solo en api/comprar.js.
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID
  || "AXAyGKDTl6t0rAL_b0irh3eO1VikIYBy5ROUeCEUoPBlKpG9kaiATkFZjYccbDyqcIRQ5kLVFlPRVyNT";
const LOGO_URL = "https://i.postimg.cc/1X5hxnT4/Untitled-design-(36).png";
const CATEGORIES = ["Props","Effects","Bundles","Games","Accessories","Other"];
const EMOJIS = ["🎈","🔫","🎊","🎉","💜","📦","⚡","🌀","🎯","🔥","💥","🎆","🎇","✨","🌟","💫","🎪","🎭"];

// Design tokens
const C  = "#00d4ff";   // cyan primary
const P  = "#ff2d78";   // pink accent
const BG  = "#050508";
const BG2 = "#08080f";
const BG3 = "#0d0d1a";
const BR  = "rgba(255,255,255,0.07)";   // border
const BRC = "rgba(0,212,255,0.22)";     // border cyan
const BRP = "rgba(255,45,120,0.22)";    // border pink
const T1  = "#f1f5f9";  // heading
const T2  = "#94a3b8";  // body
const T3  = "#475569";  // muted
const T4  = "#1e293b";  // very muted

// Motion
const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type:"spring", stiffness:380, damping:28 } as const;

const DEFAULT_PRODUCTS = [
  {id:1,name:"Interactive Pump",price:69.99,type:"physical",category:"Props",desc:"The Interactive Pump lets viewers activate real-time pumping actions during live broadcasts using stream alerts, gifts, webhooks, and custom triggers. Designed to create funny, chaotic, and highly engaging reactions that transform passive viewers into active participants.",emoji:"🎈",img:"/productos/pump.webp",stock:25,active:true},
  {id:2,name:"Interactive Blaster",price:89.99,type:"physical",category:"Props",desc:"A live-streaming foam dart launcher that allows viewers to trigger shots in real time through gifts, donations, alerts, and webhooks. Built for creators who want high-energy audience interaction with surprise, tension, and unforgettable moments.",emoji:"🔫",img:"/productos/blaster.webp",stock:12,active:true},
  {id:3,name:"Interactive Silly String",price:69.99,type:"physical",category:"Props",desc:"A streamer-controlled prank device that lets viewers trigger real cans of silly string live during your stream. Designed for content creators, it turns ordinary livestreams into chaotic, hilarious, and unforgettable interactive experiences.",emoji:"🎊",img:"/productos/silly-string.webp",stock:40,active:true},
  {id:4,name:"Interactive LED Sign",price:59.99,type:"physical",category:"Props",desc:"A customizable LED streamer sign that brings your name or brand to life with dynamic lighting and interactive effects. Supports up to 8 letters at base price, with $3 per additional letter. Approx. 18 inches wide depending on name length.",emoji:"🎉",img:"https://i.imgur.com/ia02jiA.png",stock:18,active:true},
  {id:6,name:"Chaos Bundle",price:220.00,type:"physical",category:"Bundles",desc:"The ultimate all-in-one interactive setup combining the Pump, Blaster, and Silly String. Viewers trigger multiple real-world effects live through gifts, donations, alerts, webhooks, and custom stream events — nonstop chaos guaranteed.",emoji:"📦",img:null,stock:8,active:true},
  {id:7,name:"Interactive Stellar Dash",price:0.99,type:"digital",category:"Games",desc:"A fast-paced arcade space runner where live chat controls the chaos. Viewers trigger obstacles, attacks, and difficulty changes in real time — turning every match into an unpredictable battle for survival built for streamers.",emoji:"🚀",img:"https://i.imgur.com/jlRiv7Q.png",stock:99,active:true},
];

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const TR: Record<string,any> = {
  en:{
    home:"HOME",shop:"SHOP",about:"ABOUT",contact:"CONTACT",
    shopNow:"SHOP NOW",addToCart:"ADD TO CART",checkout:"CHECKOUT",
    payment:"PAYMENT",orderConfirmed:"ORDER CONFIRMED",yourCart:"YOUR CART",
    cartEmpty:"Your cart is empty",backToShop:"← BACK",
    heroEyebrow:"INTERACTIVE STREAMING PROPS",
    heroLine1:"YOUR CHAT",heroLine2:"CONTROLS REAL LIFE.",
    heroSub:"Stream props your audience triggers live — gifts, alerts, and webhooks.",
    heroCta1:"SHOP NOW",heroCta2:"SEE HOW IT WORKS",
    ourProducts:"OUR PRODUCTS",search:"Search products...",
    trust:[
      {t:"PREMIUM QUALITY",s:"Built to last and perform."},
      {t:"EASY SETUP",s:"Plug & play, no hassle."},
      {t:"EXPERT SUPPORT",s:"We're always here."},
      {t:"FAST SHIPPING",s:"Quick delivery worldwide."},
    ],
    stayConnected:"STAY CONNECTED",newsletterSub:"Updates, drops, and exclusive offers.",
    emailPlaceholder:"Your email address",
    footerMission:"We create interactive experiences that captivate audiences and make every moment unforgettable.",
    footerTag:"Made for impact.",allProducts:"All Products",
    total:"Total",continuePayment:"CONTINUE TO PAYMENT",
    thankYou:"THANK YOU",keepShopping:"KEEP SHOPPING",
    fullName:"Full Name *",email:"Email *",phone:"Phone",
    shippingAddr:"SHIPPING ADDRESS",street:"Street Address *",city:"City *",state:"State",zip:"ZIP *",country:"Country",
    customizeLED:"CUSTOMIZE YOUR LED SIGN",
    customizeLEDSub:"What name or text would you like on your sign? (max 20 characters)",
    preview:"PREVIEW",required:"Required",validEmail:"Valid email required",
    enterLEDText:"Please enter the text for your LED Sign",
    within8:"Within the 8-letter base price — no extra charge.",
    ledIncluded:"Included in your total, charged together with PayPal.",
    extraLetterCost:"EXTRA LETTER COST",payingAs:"Paying as",
    ledSignText:"LED Sign text:",yourLEDWillSay:"YOUR LED SIGN WILL SAY",
    confirmSentTo:"Confirmation sent to",simOrder:"SIMULATE ORDER (DEMO)",
    paypalNotConfigured:"PayPal Not Configured",back:"← Back",
    login:"LOGIN",loginSub:"Enter your password to manage the store.",incorrectPw:"Incorrect password",
    noOrdersYet:"No orders yet.",noProductsFound:"No products found",
    onlyLeft:"Only",inStock:"left",
    sendMessage:"SEND MESSAGE",messageSent:"MESSAGE SENT",sendAnother:"Send Another",
    sendUs:"SEND US A MESSAGE",yourName:"YOUR NAME",emailAddress:"EMAIL ADDRESS",
    messageLabel:"MESSAGE",messagePlaceholder:"Tell us how we can help...",
    orEmailUs:"Or email us at interactiveprops.official@gmail.com",
    reachDirectly:"EMAIL US DIRECTLY",stillQuestions:"Still have questions? We're happy to help.",
    contactUs:"CONTACT US",viewPolicy:"View full policy",
  },
  es:{
    home:"INICIO",shop:"TIENDA",about:"NOSOTROS",contact:"CONTACTO",
    shopNow:"COMPRAR AHORA",addToCart:"AÑADIR",checkout:"FINALIZAR COMPRA",
    payment:"PAGO",orderConfirmed:"PEDIDO CONFIRMADO",yourCart:"TU CARRITO",
    cartEmpty:"Tu carrito está vacío",backToShop:"← VOLVER",
    heroEyebrow:"PROPS INTERACTIVOS PARA STREAMS",
    heroLine1:"TU CHAT",heroLine2:"CONTROLA LA REALIDAD.",
    heroSub:"Props de streaming que tu audiencia activa en vivo — regalos, alertas y webhooks.",
    heroCta1:"COMPRAR AHORA",heroCta2:"VER CÓMO FUNCIONA",
    ourProducts:"NUESTROS PRODUCTOS",search:"Buscar productos...",
    trust:[
      {t:"CALIDAD PREMIUM",s:"Construido para durar."},
      {t:"FÁCIL DE USAR",s:"Plug & play, sin complicaciones."},
      {t:"SOPORTE EXPERTO",s:"Siempre estamos aquí."},
      {t:"ENVÍO RÁPIDO",s:"Entrega rápida mundial."},
    ],
    stayConnected:"MANTENTE CONECTADO",newsletterSub:"Novedades, lanzamientos y ofertas exclusivas.",
    emailPlaceholder:"Tu correo electrónico",
    footerMission:"Creamos experiencias interactivas que cautivan audiencias y hacen cada momento inolvidable.",
    footerTag:"Hecho para impactar.",allProducts:"Todos los Productos",
    total:"Total",continuePayment:"CONTINUAR AL PAGO",
    thankYou:"GRACIAS",keepShopping:"SEGUIR COMPRANDO",
    fullName:"Nombre Completo *",email:"Email *",phone:"Teléfono",
    shippingAddr:"DIRECCIÓN DE ENVÍO",street:"Calle *",city:"Ciudad *",state:"Estado",zip:"CP *",country:"País",
    customizeLED:"PERSONALIZA TU LETRERO LED",
    customizeLEDSub:"¿Qué nombre o texto quieres en tu letrero? (máx 20 caracteres)",
    preview:"VISTA PREVIA",required:"Requerido",validEmail:"Email válido requerido",
    enterLEDText:"Ingresa el texto para tu letrero LED",
    within8:"Dentro del precio base de 8 letras — sin cargo extra.",
    ledIncluded:"Incluido en tu total, cobrado junto con PayPal.",
    extraLetterCost:"COSTO LETRAS EXTRA",payingAs:"Pagando como",
    ledSignText:"Texto del letrero:",yourLEDWillSay:"TU LETRERO DIRÁ",
    confirmSentTo:"Confirmación enviada a",simOrder:"SIMULAR PEDIDO (DEMO)",
    paypalNotConfigured:"PayPal No Configurado",back:"← Volver",
    login:"ACCESO",loginSub:"Ingresa tu contraseña para gestionar la tienda.",incorrectPw:"Contraseña incorrecta",
    noOrdersYet:"No hay pedidos aún.",noProductsFound:"No se encontraron productos",
    onlyLeft:"Solo quedan",inStock:"",
    sendMessage:"ENVIAR MENSAJE",messageSent:"MENSAJE ENVIADO",sendAnother:"Enviar otro",
    sendUs:"ENVÍANOS UN MENSAJE",yourName:"TU NOMBRE",emailAddress:"CORREO ELECTRÓNICO",
    messageLabel:"MENSAJE",messagePlaceholder:"Cuéntanos cómo podemos ayudarte...",
    orEmailUs:"O escríbenos a interactiveprops.official@gmail.com",
    reachDirectly:"CONTÁCTANOS",stillQuestions:"¿Aún tienes preguntas? Con gusto ayudamos.",
    contactUs:"CONTÁCTANOS",viewPolicy:"Ver política completa",
  }
};

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800;900&family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Rajdhani',sans-serif;background:#050508;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#050508}::-webkit-scrollbar-thumb{background:#00d4ff;border-radius:2px}
.orb{font-family:'Orbitron',sans-serif}
.mono{font-family:'Share Tech Mono',monospace}
.raj{font-family:'Rajdhani',sans-serif}

/* Glitch — only fires every ~5s, very brief */
.glitch{position:relative;display:inline-block;overflow:hidden}
.glitch::before,.glitch::after{content:attr(data-text);position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}
.glitch::before{color:#ff2d78;animation:g1 6s infinite}
.glitch::after{color:#00d4ff;animation:g2 6s infinite 0.18s}
@keyframes g1{0%,87%,100%{clip-path:inset(0 0 100% 0);transform:translate(0)}88%{clip-path:inset(18% 0 55% 0);transform:translate(-5px,2px)}89%{clip-path:inset(62% 0 8% 0);transform:translate(5px,-2px)}90%{clip-path:inset(40% 0 32% 0);transform:translate(-3px,1px)}91%,99%{clip-path:inset(0 0 100% 0);transform:translate(0)}}
@keyframes g2{0%,85%,100%{clip-path:inset(0 0 100% 0);transform:translate(0)}86%{clip-path:inset(52% 0 18% 0);transform:translate(5px,-2px)}87%{clip-path:inset(14% 0 68% 0);transform:translate(-5px,2px)}88%{clip-path:inset(78% 0 3% 0);transform:translate(3px,0)}89%,99%{clip-path:inset(0 0 100% 0);transform:translate(0)}}

/* Hero animated grid */
.hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,212,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.05) 1px,transparent 1px);background-size:64px 64px;animation:gridMove 10s linear infinite}
@keyframes gridMove{0%{background-position:0 0}100%{background-position:64px 64px}}

/* Scanlines — ultra-subtle */
.scanlines{position:fixed;inset:0;pointer-events:none;z-index:9999;background:repeating-linear-gradient(0deg,transparent 0,transparent 2px,rgba(0,212,255,0.01) 2px,rgba(0,212,255,0.01) 4px)}

/* Neon text pulses */
@keyframes pulseC{0%,100%{text-shadow:0 0 12px rgba(0,212,255,0.5),0 0 24px rgba(0,212,255,0.25)}50%{text-shadow:0 0 24px rgba(0,212,255,0.8),0 0 48px rgba(0,212,255,0.4)}}
@keyframes pulseP{0%,100%{text-shadow:0 0 12px rgba(255,45,120,0.5),0 0 24px rgba(255,45,120,0.25)}50%{text-shadow:0 0 24px rgba(255,45,120,0.8),0 0 48px rgba(255,45,120,0.4)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}

/* Input focus glow */
input:focus,select:focus,textarea:focus{border-color:rgba(0,212,255,0.5) !important;box-shadow:0 0 0 3px rgba(0,212,255,0.08) !important;outline:none}

/* Horizontal rule dividers */
.rule{height:1px;background:linear-gradient(90deg,transparent,rgba(0,212,255,0.18),transparent)}
`;

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
// Neon border button
function NBtn({children,onClick,variant="cyan",size="md",full=false,style={} as any,type="button" as any}:{children:any,onClick?:()=>void,variant?:"cyan"|"pink"|"fill"|"ghost",size?:"sm"|"md"|"lg",full?:boolean,style?:any,type?:any}) {
  const pad = size==="sm"?"8px 16px":size==="lg"?"16px 40px":"11px 24px";
  const fs  = size==="sm"?10:size==="lg"?13:11;
  const base:any = {cursor:"pointer",letterSpacing:"0.12em",fontWeight:700,fontFamily:"'Orbitron',sans-serif",fontSize:fs,borderRadius:3,padding:pad,border:"none",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,width:full?"100%":undefined,...style};
  const styles:Record<string,any> = {
    cyan:  {background:"transparent",color:C,border:`1px solid ${BRC}`,boxShadow:`0 0 0 0 transparent`},
    pink:  {background:"transparent",color:P,border:`1px solid ${BRP}`},
    fill:  {background:`linear-gradient(135deg,${P},${C})`,color:"#fff"},
    ghost: {background:"rgba(255,255,255,0.04)",color:T2,border:`1px solid ${BR}`},
  };
  return (
    <motion.button type={type} onClick={onClick} style={{...base,...styles[variant]}}
      whileHover={variant==="fill"?{scale:1.03,boxShadow:`0 0 28px rgba(255,45,120,0.35),0 0 56px rgba(0,212,255,0.2)`}:variant==="cyan"?{backgroundColor:"rgba(0,212,255,0.08)",boxShadow:`0 0 16px rgba(0,212,255,0.3)`}:variant==="pink"?{backgroundColor:"rgba(255,45,120,0.08)",boxShadow:`0 0 16px rgba(255,45,120,0.3)`}:{backgroundColor:"rgba(255,255,255,0.07)"}}
      whileTap={{scale:0.96}}
      transition={SPRING}>
      {children}
    </motion.button>
  );
}

// ─── CHECKOUT MODAL ───────────────────────────────────────────────────────────
function CheckoutModal({cart,cartTotal,paypalLoaded,paypalClientId,onClose,onComplete,t}:any) {
  const [step,setStep]=useState("shipping");
  const [shipping,setShipping]=useState({name:"",email:"",phone:"",address:"",city:"",state:"",zip:"",country:"US"});
  const [errors,setErrors]=useState<any>({});
  const [signText,setSignText]=useState("");
  const hasPhysical=cart.some((i:any)=>i.type==="physical");
  const hasLEDSign=cart.some((i:any)=>i.name==="Interactive LED Sign");
  const extraLetters=hasLEDSign&&signText?Math.max(0,signText.replace(/ /g,"").length-8):0;
  const extraCost=extraLetters*3;
  const finalTotal=cartTotal+extraCost;
  const inp:any={padding:"10px 14px",borderRadius:4,border:`1px solid ${BR}`,fontSize:13,width:"100%",background:BG3,color:T1,fontFamily:"'Rajdhani',sans-serif",outline:"none",transition:"border-color 0.2s,box-shadow 0.2s"};
  const lbl:any={display:"flex",flexDirection:"column",gap:5,fontSize:10,fontWeight:700,color:T3,letterSpacing:"0.14em",fontFamily:"'Share Tech Mono',monospace"};
  function validate(){const e:any={};if(!shipping.name.trim())e.name=t.required;if(!shipping.email.trim()||!shipping.email.includes("@"))e.email=t.validEmail;if(hasPhysical){if(!shipping.address.trim())e.address=t.required;if(!shipping.city.trim())e.city=t.required;if(!shipping.zip.trim())e.zip=t.required;}if(hasLEDSign&&!signText.trim())e.signText=t.enterLEDText;setErrors(e);return Object.keys(e).length===0;}
  useEffect(()=>{
    if(step!=="payment"||!paypalLoaded||paypalClientId==="YOUR_PAYPAL_CLIENT_ID") return;
    const container=document.getElementById("paypal-btn-container");
    if(!container||container.childNodes.length>0) return;
    const items=cart.map((i:any)=>({name:i.name,unit_amount:{value:i.price.toFixed(2),currency_code:"USD"},quantity:String(i.qty),sku:String(i.id),category:i.type==="digital"?"DIGITAL_GOODS":"PHYSICAL_GOODS"}));
    if(extraCost>0) items.push({name:`Interactive LED Sign - Extra Letters (${extraLetters} x $3.00)`,unit_amount:{value:extraCost.toFixed(2),currency_code:"USD"},quantity:"1",category:"PHYSICAL_GOODS"});
    (window as any).paypal.Buttons({createOrder:(_d:any,actions:any)=>actions.order.create({purchase_units:[{description:"Interactive Props Order",amount:{value:finalTotal.toFixed(2),currency_code:"USD",breakdown:{item_total:{value:finalTotal.toFixed(2),currency_code:"USD"}}},items}]}),onApprove:async(_d:any,actions:any)=>{const order=await actions.order.capture();onComplete(order,shipping,signText,finalTotal);setStep("done");},onError:()=>alert("Payment failed. Please try again."),style:{layout:"vertical",color:"black",shape:"rect",label:"pay"}}).render("#paypal-btn-container");
  },[step,paypalLoaded]);
  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
        style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:200,display:"flex",justifyContent:"center",alignItems:"center",padding:16}} onClick={onClose}>
        <motion.div initial={{scale:0.94,opacity:0,y:16}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.94,opacity:0,y:8}} transition={{...SPRING,damping:30}}
          style={{background:BG2,border:`1px solid ${BRC}`,boxShadow:`0 0 60px rgba(0,212,255,0.12)`,width:"100%",maxWidth:520,borderRadius:6,maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          {/* Header */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px",borderBottom:`1px solid ${BR}`,position:"sticky",top:0,background:BG2,zIndex:1}}>
            <span className="orb" style={{fontSize:12,fontWeight:800,letterSpacing:"0.14em",color:C}}>{step==="done"?t.orderConfirmed:step==="payment"?t.payment:t.checkout}</span>
            <NBtn variant="ghost" size="sm" onClick={onClose}>✕</NBtn>
          </div>
          {/* Order summary */}
          <div style={{margin:"16px 24px 0",background:BG3,borderRadius:4,padding:"14px 18px",border:`1px solid ${BR}`}}>
            {cart.map((i:any)=>(
              <div key={i.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"3px 0",color:T3}}>
                <span>{i.emoji} {i.name} ×{i.qty}</span>
                <span className="mono" style={{color:C,fontWeight:700}}>${(i.price*i.qty).toFixed(2)}</span>
              </div>
            ))}
            {extraCost>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"3px 0",color:T3}}><span>✨ LED extra letters ({extraLetters} × $3.00)</span><span className="mono" style={{color:C}}>+${extraCost.toFixed(2)}</span></div>}
            <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,borderTop:`1px solid ${BR}`,paddingTop:10,marginTop:8}}>
              <span style={{color:T2}}>{t.total}</span>
              <span className="mono" style={{color:C,fontSize:18}}>${finalTotal.toFixed(2)}</span>
            </div>
          </div>
          {step==="shipping"&&(
            <div style={{padding:"20px 24px 28px",display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <label style={lbl}>{t.fullName}<input style={{...inp,...(errors.name?{borderColor:P}:{})}} value={shipping.name} onChange={e=>setShipping(s=>({...s,name:e.target.value}))} placeholder="Jane Smith"/>{errors.name&&<span style={{color:P,fontSize:10}}>{errors.name}</span>}</label>
                <label style={lbl}>{t.email}<input style={{...inp,...(errors.email?{borderColor:P}:{})}} type="email" value={shipping.email} onChange={e=>setShipping(s=>({...s,email:e.target.value}))} placeholder="jane@email.com"/>{errors.email&&<span style={{color:P,fontSize:10}}>{errors.email}</span>}</label>
              </div>
              <label style={lbl}>{t.phone}<input style={inp} value={shipping.phone} onChange={e=>setShipping(s=>({...s,phone:e.target.value}))} placeholder="+1 555 000 0000"/></label>
              {hasPhysical&&<>
                <div className="mono" style={{fontSize:9,letterSpacing:"0.18em",color:C,marginTop:4}}>{t.shippingAddr}</div>
                <label style={lbl}>{t.street}<input style={{...inp,...(errors.address?{borderColor:P}:{})}} value={shipping.address} onChange={e=>setShipping(s=>({...s,address:e.target.value}))} placeholder="123 Main St"/></label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  <label style={lbl}>{t.city}<input style={inp} value={shipping.city} onChange={e=>setShipping(s=>({...s,city:e.target.value}))} placeholder="New York"/></label>
                  <label style={lbl}>{t.state}<input style={inp} value={shipping.state} onChange={e=>setShipping(s=>({...s,state:e.target.value}))} placeholder="NY"/></label>
                  <label style={lbl}>{t.zip}<input style={inp} value={shipping.zip} onChange={e=>setShipping(s=>({...s,zip:e.target.value}))} placeholder="10001"/></label>
                </div>
                <label style={lbl}>{t.country}<select style={inp} value={shipping.country} onChange={e=>setShipping(s=>({...s,country:e.target.value}))}><option value="US">United States</option><option value="CA">Canada</option><option value="GB">United Kingdom</option><option value="AU">Australia</option><option value="OTHER">Other</option></select></label>
              </>}
              {hasLEDSign&&(
                <div style={{background:"rgba(0,212,255,0.04)",border:`1px solid ${BRC}`,borderRadius:4,padding:"18px 20px"}}>
                  <div className="mono" style={{fontSize:9,letterSpacing:"0.18em",color:C,marginBottom:10}}>{t.customizeLED}</div>
                  <p style={{fontSize:13,color:T3,marginBottom:12,lineHeight:1.6,fontWeight:500}}>{t.customizeLEDSub}</p>
                  <input className="mono" style={{...inp,...(errors.signText?{borderColor:P}:{borderColor:BRC}),letterSpacing:"0.3em",fontWeight:700,fontSize:17,textAlign:"center",color:C}} value={signText} maxLength={20} onChange={e=>setSignText(e.target.value.toUpperCase())} placeholder="MAX GAMER"/>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>{errors.signText&&<span style={{color:P,fontSize:10}}>{errors.signText}</span>}<span className="mono" style={{color:T4,fontSize:10,marginLeft:"auto"}}>{signText.length}/20</span></div>
                  {signText.replace(/ /g,"").length>8&&(
                    <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{marginTop:12,background:"rgba(0,212,255,0.04)",border:`1px solid rgba(0,212,255,0.15)`,borderRadius:4,padding:"10px 14px"}}>
                      <div className="mono" style={{fontSize:9,color:T4,letterSpacing:"0.12em",marginBottom:4}}>{t.extraLetterCost}</div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,color:T3}}>{signText.replace(/ /g,"").length-8} extra × $3.00</span><span className="mono" style={{fontSize:16,fontWeight:800,color:C}}>+${((signText.replace(/ /g,"").length-8)*3).toFixed(2)}</span></div>
                      <div className="mono" style={{fontSize:9,color:"#4ade80",marginTop:6,letterSpacing:"0.1em"}}>{t.ledIncluded}</div>
                    </motion.div>
                  )}
                  {signText.replace(/ /g,"").length>0&&signText.replace(/ /g,"").length<=8&&<p className="mono" style={{marginTop:8,fontSize:10,color:"#4ade80",letterSpacing:"0.1em"}}>{t.within8}</p>}
                  {signText&&<div style={{marginTop:12,textAlign:"center",background:BG3,borderRadius:4,padding:"10px",border:`1px solid ${BR}`}}><div className="mono" style={{fontSize:9,color:T4,marginBottom:6,letterSpacing:"0.1em"}}>{t.preview}</div><div style={{fontSize:22,fontWeight:900,letterSpacing:"0.25em",background:"linear-gradient(90deg,#ff0,#f0f,#0ff,#0f0,#f80)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{signText}</div></div>}
                </div>
              )}
              <NBtn variant="fill" size="lg" full onClick={()=>{if(validate())setStep("payment");}}>{t.continuePayment}</NBtn>
            </div>
          )}
          {step==="payment"&&(
            <div style={{padding:"20px 24px 28px"}}>
              <p style={{marginBottom:16,fontSize:13,color:T3}}>{t.payingAs} <span style={{color:C}}>{shipping.email}</span></p>
              {hasLEDSign&&signText&&<div style={{marginBottom:16,background:BG3,border:`1px solid ${BRC}`,borderRadius:4,padding:"10px 14px"}}><span style={{color:T3,fontSize:13}}>{t.ledSignText} </span><span className="mono" style={{color:C,fontWeight:700,letterSpacing:"0.2em"}}>{signText}</span></div>}
              {paypalClientId==="YOUR_PAYPAL_CLIENT_ID"
                ?<div style={{background:BG3,border:`1px solid ${BR}`,borderRadius:4,padding:"28px 24px",textAlign:"center"}}>
                   <div style={{fontSize:40,marginBottom:12}}>🔑</div>
                   <div className="orb" style={{fontWeight:700,color:T1,marginBottom:10,fontSize:13}}>{t.paypalNotConfigured}</div>
                   <div style={{fontSize:13,color:T3,lineHeight:1.8}}>1. Create a PayPal Business account<br/>2. Go to developer.paypal.com<br/>3. Replace YOUR_PAYPAL_CLIENT_ID at the top of the file</div>
                   <div style={{marginTop:20}}><NBtn variant="fill" size="lg" full onClick={()=>{onComplete({demo:true},shipping,signText,finalTotal);setStep("done");}}>{t.simOrder}</NBtn></div>
                 </div>
                :<div id="paypal-btn-container"/>
              }
              <div style={{marginTop:12}}><NBtn variant="ghost" size="md" full onClick={()=>setStep("shipping")}>{t.back}</NBtn></div>
            </div>
          )}
          {step==="done"&&(
            <div style={{padding:"56px 32px",textAlign:"center"}}>
              <motion.div initial={{scale:0}} animate={{scale:1}} transition={{...SPRING,delay:0.1}} style={{fontSize:64,marginBottom:20,display:"inline-block"}}>🎉</motion.div>
              <h2 className="orb" style={{fontSize:28,color:C,letterSpacing:"0.06em",marginBottom:12,animation:"pulseC 3s ease-in-out infinite"}}>{t.thankYou}</h2>
              <p style={{color:T3,fontSize:14,lineHeight:1.8,marginBottom:20}}>{t.confirmSentTo} <span style={{color:C}}>{shipping.email}</span></p>
              {hasLEDSign&&signText&&<div style={{background:BG3,border:`1px solid ${BRC}`,borderRadius:4,padding:"14px 20px",marginBottom:24,display:"inline-block"}}><div className="mono" style={{fontSize:9,color:T4,marginBottom:6,letterSpacing:"0.14em"}}>{t.yourLEDWillSay}</div><div className="orb" style={{fontSize:22,fontWeight:900,letterSpacing:"0.2em",color:C}}>{signText}</div></div>}
              <div style={{marginTop:8}}><NBtn variant="fill" size="lg" full onClick={onClose}>{t.keepShopping}</NBtn></div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── PAGE SHELL ───────────────────────────────────────────────────────────────
function PageShell({title,setView,children,t}:any) {
  return (
    <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.45,ease:EASE}}
      style={{background:BG,minHeight:"calc(100vh - 64px)",padding:"72px 32px 120px"}}>
      <div style={{maxWidth:840,margin:"0 auto"}}>
        <NBtn variant="ghost" size="sm" onClick={()=>{setView("shop");window.scrollTo(0,0);}} style={{marginBottom:40}}>{t.backToShop}</NBtn>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:56}}>
          <div style={{width:3,height:52,background:`linear-gradient(180deg,${P},${C})`,borderRadius:2,flexShrink:0}}/>
          <h1 className="orb" style={{fontSize:"clamp(26px,4vw,42px)",fontWeight:900,letterSpacing:"-0.02em",color:T1}}>{title}</h1>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

function AboutView({setView,t}:any) {
  return (
    <PageShell title="ABOUT US" setView={setView} t={t}>
      <div style={{background:BG2,border:`1px solid ${BR}`,borderRadius:6,padding:"48px 52px",lineHeight:1.9}}>
        <p className="orb" style={{fontSize:16,color:C,fontWeight:700,marginBottom:28,letterSpacing:"-0.01em",animation:"pulseC 5s ease-in-out infinite"}}>Welcome to Interactive Props — where streaming becomes truly interactive.</p>
        {["We created Interactive Props with one goal in mind: to help streamers turn their content into unforgettable live experiences. As creators ourselves, we know how hard it can be to keep streams exciting, stand out from thousands of channels, and create moments that viewers actually remember.","From the Interactive Blaster firing foam darts during live events, to the Interactive Silly String launching chaos on stream, and the Interactive Pump creating hilarious audience-triggered moments, every product is designed to connect your viewers directly to your stream in a physical, real-life way.","Our products work with livestream platforms, webhooks, goals, donations, gifts, and custom triggers, allowing viewers to become part of the show instead of just watching it."].map((para,i)=>(
          <p key={i} style={{color:T2,fontSize:15,marginBottom:20,fontWeight:500}}>{para}</p>
        ))}
        <ul style={{color:T2,fontSize:15,paddingLeft:24,marginBottom:28,lineHeight:2.2}}>
          {["Easy setup for streamers","Real-time audience interaction","Unique stream moments that increase engagement","Reliable integrations with modern streaming tools","Products built specifically for content creators"].map((item,i)=>(
            <li key={i} style={{marginBottom:4}}><span style={{color:C,marginRight:10}}>▸</span>{item}</li>
          ))}
        </ul>
        <p className="orb" style={{color:P,fontSize:14,fontWeight:700,letterSpacing:"0.02em",animation:"pulseP 5s ease-in-out infinite"}}>Because streaming should be more than watching. It should be interactive.</p>
      </div>
      <div style={{marginTop:40,textAlign:"center"}}><NBtn variant="fill" size="lg" onClick={()=>setView("shop")}>{t.shopNow}</NBtn></div>
    </PageShell>
  );
}

function ContactView({setView,t}:any) {
  const [name,setName]=useState(""),[email,setEmail]=useState(""),[msg,setMsg]=useState(""),[sent,setSent]=useState(false);
  const inp:any={padding:"10px 14px",borderRadius:4,border:`1px solid ${BR}`,fontSize:13,outline:"none",width:"100%",background:BG3,color:T1,fontFamily:"'Rajdhani',sans-serif",transition:"border-color 0.2s,box-shadow 0.2s"};
  const lbl:any={display:"flex",flexDirection:"column",gap:5,fontSize:10,fontWeight:700,color:T3,letterSpacing:"0.14em",fontFamily:"'Share Tech Mono',monospace"};
  return (
    <PageShell title="CONTACT US" setView={setView} t={t}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
        <div style={{background:BG2,border:`1px solid ${BR}`,borderRadius:6,padding:"40px 36px"}}>
          <p style={{color:T2,fontSize:15,lineHeight:1.85,marginBottom:20,fontWeight:500}}>Have questions about our products, setup help, partnerships, or your order? We would love to hear from you.</p>
          <p style={{color:T2,fontSize:15,lineHeight:1.85,marginBottom:24,fontWeight:500}}>At Interactive Props, we are passionate about helping creators build unforgettable interactive streaming experiences.</p>
          <div style={{background:BG3,border:`1px solid ${BRC}`,borderRadius:4,padding:"20px 24px"}}>
            <div className="mono" style={{fontSize:9,letterSpacing:"0.18em",color:C,marginBottom:10}}>{t.reachDirectly}</div>
            <div className="mono" style={{fontSize:14,color:C,fontWeight:700,animation:"pulseC 4s ease-in-out infinite"}}>interactiveprops.official@gmail.com</div>
          </div>
          <p style={{color:T4,fontSize:13,lineHeight:1.8,marginTop:20,fontWeight:500}}>We aim to respond as quickly as possible. Please include your order number if applicable.</p>
        </div>
        <div style={{background:BG2,border:`1px solid ${BR}`,borderRadius:6,padding:"40px 36px"}}>
          <AnimatePresence mode="wait">
            {sent
              ?<motion.div key="sent" initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} style={{textAlign:"center",padding:"32px 0"}}>
                 <div style={{fontSize:52,marginBottom:16}}>✅</div>
                 <h3 className="orb" style={{fontSize:22,color:C,letterSpacing:"0.06em",marginBottom:10}}>{t.messageSent}</h3>
                 <p style={{color:T3,fontSize:14,lineHeight:1.7,marginBottom:24}}>Thanks! We will get back to you at <span style={{color:C}}>{email}</span>.</p>
                 <NBtn variant="fill" size="md" onClick={()=>{setSent(false);setName("");setEmail("");setMsg("");}}>Send Another</NBtn>
               </motion.div>
              :<motion.div key="form" initial={{opacity:0}} animate={{opacity:1}}>
                 <div className="mono" style={{fontSize:9,letterSpacing:"0.18em",color:C,marginBottom:20}}>{t.sendUs}</div>
                 <div style={{display:"flex",flexDirection:"column",gap:14}}>
                   <label style={lbl}>{t.yourName}<input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Smith"/></label>
                   <label style={lbl}>{t.emailAddress}<input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="jane@email.com"/></label>
                   <label style={lbl}>{t.messageLabel}<textarea style={{...inp,minHeight:130,resize:"vertical"}} value={msg} onChange={e=>setMsg(e.target.value)} placeholder={t.messagePlaceholder}/></label>
                   <NBtn variant="fill" size="lg" full onClick={()=>{if(name&&email&&msg)setSent(true);}}>{t.sendMessage}</NBtn>
                   <p className="mono" style={{color:T4,fontSize:9,textAlign:"center",letterSpacing:"0.1em"}}>{t.orEmailUs}</p>
                 </div>
               </motion.div>
            }
          </AnimatePresence>
        </div>
      </div>
    </PageShell>
  );
}


function PolicyView({type,setView,t}:any) {
  const title=type==="returns"?"RETURNS & REFUNDS":type==="warranty"?"WARRANTY POLICY":"SHIPPING & DELIVERY";
  const sections=type==="shipping"?[
    {h:null,b:"At Interactive Props, we work hard to process and ship orders as quickly and safely as possible so you can start creating unforgettable interactive stream moments."},
    {h:"Order Processing",b:"Most orders are processed within 2 to 5 business days. Some products may require additional processing time due to customization, testing, or high demand."},
    {h:"Shipping Times",b:"Estimated delivery times may vary depending on:",bullets:["Product availability","Customization requirements","Shipping carrier delays","Destination location"],footer:"Domestic orders typically arrive within 3–10 business days after shipment; international delivery times vary by country."},
    {h:"International Shipping",b:"We may offer international shipping to select countries. Customers are responsible for any customs fees, import taxes, duties, or additional charges required by their country."},
    {h:"Tracking Information",b:"Tracking details will be sent to the email provided during checkout once your order ships."},
    {h:"Incorrect Addresses",b:"Customers are responsible for providing accurate shipping information. Interactive Props is not responsible for delays or lost packages caused by incorrect addresses."},
    {h:"Damaged Deliveries",b:"If your order arrives damaged, please contact us within 48 hours of delivery with photos of the packaging and product."},
  ]:type==="returns"?[
    {h:null,b:"At Interactive Props, we want you to be happy with your purchase. Because many of our products are electronic or customized, please review our return policy carefully before placing an order."},
    {h:"Return Eligibility",b:"We accept returns within 14 days of delivery for unused items in their original condition and packaging.",bullets:["Item must not show signs of use, damage, or modification","Proof of purchase is required"]},
    {h:"Non-Returnable Items",b:"The following items are non-refundable unless they arrive damaged or defective:",bullets:["Customized or made-to-order products","Modified electronic devices","Digital downloads or software"]},
    {h:"Damaged or Defective Products",b:"If your order arrives damaged or defective, please contact us within 48 hours of delivery with:",bullets:["Your order number","Photos or videos showing the issue","A brief description of the problem"],footer:"We will review and offer a replacement, repair, store credit, or refund depending on the situation."},
    {h:"Refund Process",b:"Once we receive and inspect the returned item, approved refunds are issued to the original payment method within 5–10 business days."},
    {h:"Return Shipping",b:"Customers are responsible for return shipping costs unless the product arrived damaged or incorrect."},
    {h:"Order Cancellations",b:"Orders may only be canceled before they are processed or shipped."},
  ]:[
    {h:null,b:"At Interactive Props, we stand behind the quality of our products. All eligible products include a limited 90-day warranty from the date of delivery."},
    {h:"Warranty Coverage",b:"This warranty covers:",bullets:["Electrical or hardware failures caused by manufacturing defects","Internal component issues not caused by misuse","Defective assembly or workmanship"]},
    {h:"What Is Not Covered",b:"This warranty does not cover:",bullets:["Damage caused by misuse, accidents, drops, or improper handling","Damage caused by liquids, fire, or unauthorized modifications","Normal cosmetic wear and tear","Software, third-party integrations, or external platform issues"]},
    {h:"Warranty Claims",b:"To submit a warranty claim, please contact us with:",bullets:["Your order number","A description of the issue","Photos or videos showing the problem"]},
    {h:"Resolution Options",b:"If a product is determined to be defective, Interactive Props may:",bullets:["Repair or replace the product","Issue store credit","Provide a partial or full refund if replacement is not possible"]},
  ];
  return (
    <PageShell title={title} setView={setView} t={t}>
      <div style={{background:BG2,border:`1px solid ${BR}`,borderRadius:6,padding:"48px 52px"}}>
        {sections.map((sec:any,i:number)=>(
          <div key={i} style={{marginBottom:36}}>
            {sec.h&&<h2 className="orb" style={{fontSize:15,fontWeight:800,color:C,letterSpacing:"0.1em",marginBottom:12,textTransform:"uppercase"}}>{sec.h}</h2>}
            {sec.b&&<p style={{color:T2,fontSize:14,lineHeight:1.9,marginBottom:12,fontWeight:500}}>{sec.b}</p>}
            {sec.bullets&&<ul style={{color:T2,fontSize:14,paddingLeft:24,marginBottom:12,lineHeight:2.1}}>{sec.bullets.map((b:string,j:number)=><li key={j} style={{marginBottom:4}}><span style={{color:C,marginRight:10}}>▸</span>{b}</li>)}</ul>}
            {sec.footer&&<p style={{color:T2,fontSize:14,lineHeight:1.9,fontWeight:500}}>{sec.footer}</p>}
          </div>
        ))}
      </div>
      <div style={{marginTop:40,textAlign:"center"}}><NBtn variant="fill" size="lg" onClick={()=>setView("shop")}>{t.backToShop}</NBtn></div>
    </PageShell>
  );
}

function LoginView({onLogin,t}:any) {
  const [email,setEmail]=useState(""),[pw,setPw]=useState("");
  const [err,setErr]=useState(false),[busy,setBusy]=useState(false);
  async function handle(){
    if(busy) return;
    setBusy(true);
    try{ await adminSignIn(email,pw); onLogin(); }
    catch(e){ setErr(true); setTimeout(()=>setErr(false),2400); }
    finally{ setBusy(false); }
  }
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"calc(100vh - 64px)",background:BG,padding:24,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,212,255,0.05),transparent 65%)",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none"}}/>
      <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.55,ease:EASE}}
        style={{background:BG2,border:`1px solid ${BRC}`,boxShadow:`0 0 64px rgba(0,212,255,0.09)`,borderRadius:6,padding:"52px 44px",maxWidth:380,width:"100%",textAlign:"center",position:"relative",zIndex:1}}>
        <div style={{marginBottom:20}}><LogoSVG size={72}/></div>
        <h2 className="orb" style={{fontSize:28,letterSpacing:"0.1em",color:C,marginBottom:8,animation:"pulseC 4s ease-in-out infinite"}}>{t.login}</h2>
        <p className="mono" style={{color:T4,fontSize:10,marginBottom:32,letterSpacing:"0.1em"}}>{t.loginSub}</p>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <motion.input type="email" autoComplete="username" animate={{borderColor:err?P:BRC}} transition={{duration:0.2}}
            style={{padding:"12px 14px",borderRadius:4,border:`1px solid ${BRC}`,fontSize:14,textAlign:"center",outline:"none",width:"100%",background:BG3,color:T1,fontFamily:"'Rajdhani',sans-serif"}}
            placeholder="admin@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handle();}} autoFocus/>
          <motion.input type="password" autoComplete="current-password" className="mono" animate={{borderColor:err?P:BRC}} transition={{duration:0.2}}
            style={{padding:"12px 14px",borderRadius:4,border:`1px solid ${BRC}`,fontSize:20,letterSpacing:"0.3em",textAlign:"center",outline:"none",width:"100%",background:BG3,color:C,fontFamily:"'Share Tech Mono',monospace"}}
            placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handle();}}/>
          <AnimatePresence>
            {err&&<motion.p initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="mono" style={{color:P,fontSize:10,letterSpacing:"0.12em"}}>{t.incorrectPw}</motion.p>}
          </AnimatePresence>
          <NBtn variant="fill" size="lg" full onClick={handle}>{busy?"…":t.login}</NBtn>
        </div>
      </motion.div>
    </div>
  );
}

function AdminView({products,orders,persistProducts}:any) {
  const [tab,setTab]=useState("products");
  const [editId,setEditId]=useState<any>(null);
  const [form,setForm]=useState<any>(null);
  const [toast,setToast]=useState<string|null>(null);
  const [logoSrc,setLogoSrc]=useState<string|null>(null);
  const [logoUrl,setLogoUrl]=useState("");
  useEffect(()=>{loadLogo().then(url=>{setLogoSrc(url!==LOGO_URL?url:null);(window as any).__ipLogo=url;});},[]);
  function handleSaveLogo(src:string){setLogoSrc(src);(window as any).__ipLogo=src;saveLogo(src).catch(()=>{});st("Logo updated!");}
  function removeLogo(){setLogoSrc(LOGO_URL);(window as any).__ipLogo=LOGO_URL;deleteLogo().catch(()=>{});st("Logo removed");}
  function st(msg:string){setToast(msg);setTimeout(()=>setToast(null),2000);}
  function sideActive(id:string){return tab===id||(tab==="add"&&id==="products")||(tab==="edit"&&id==="products");}
  function saveForm(){if(!form.name.trim()||!form.price){st("Name and price required");return;}const updated=editId?products.map((p:any)=>p.id===editId?{...form,price:Number(form.price),stock:Number(form.stock)}:p):[...products,{...form,price:Number(form.price),stock:Number(form.stock)}];persistProducts(updated);setTab("products");setForm(null);setEditId(null);st(editId?"Updated!":"Added!");}
  const inp:any={padding:"10px 14px",borderRadius:4,border:`1px solid ${BR}`,fontSize:13,outline:"none",width:"100%",background:BG3,color:T1,fontFamily:"'Rajdhani',sans-serif",transition:"border-color 0.2s,box-shadow 0.2s"};
  const tabs=[{id:"products",lbl:"Products"},{id:"orders",lbl:"Orders"},{id:"branding",lbl:"Branding"}];
  return (
    <div style={{display:"flex",minHeight:"calc(100vh - 64px)",background:BG}}>
      <div style={{width:220,background:BG2,borderRight:`1px solid ${BR}`,padding:"32px 0",display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
        <div className="mono" style={{fontSize:9,fontWeight:700,letterSpacing:"0.2em",padding:"0 24px 20px",color:C}}>ADMIN PANEL</div>
        {tabs.map(tb=>(
          <motion.button key={tb.id} onClick={()=>setTab(tb.id)}
            style={{background:sideActive(tb.id)?"rgba(0,212,255,0.06)":"none",border:"none",color:sideActive(tb.id)?C:T3,cursor:"pointer",fontSize:14,padding:"12px 24px",textAlign:"left",fontFamily:"'Rajdhani',sans-serif",fontWeight:600,letterSpacing:"0.04em",borderLeft:sideActive(tb.id)?`2px solid ${C}`:"2px solid transparent",transition:"color 0.15s"}}
            whileHover={{color:T1,backgroundColor:"rgba(255,255,255,0.03)"}} transition={{duration:0.15}}>
            {tb.lbl}
          </motion.button>
        ))}
      </div>
      <div style={{flex:1,padding:"36px 40px",overflowY:"auto"}}>
        {tab==="products"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28}}>
              <h2 className="orb" style={{fontSize:20,fontWeight:900,letterSpacing:"0.08em",color:T1}}>PRODUCTS ({products.length})</h2>
              <NBtn variant="cyan" size="sm" onClick={()=>{setForm({id:Date.now(),name:"",price:"",type:"physical",category:"Props",desc:"",emoji:EMOJIS[5],img:null,stock:1,active:true});setEditId(null);setTab("add");}}>+ Add Product</NBtn>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {products.map((p:any)=>(
                <motion.div key={p.id} initial={{opacity:0}} animate={{opacity:1}} style={{display:"flex",alignItems:"center",gap:14,background:BG2,padding:"14px 20px",borderRadius:4,border:`1px solid ${BR}`,opacity:p.active?1:0.4}}>
                  {p.img?<img src={p.img} alt={p.name} style={{width:36,height:36,objectFit:"contain",borderRadius:4}}/>:<span style={{fontSize:26}}>{p.emoji}</span>}
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14,color:T1}}>{p.name}</div>
                    <div className="mono" style={{fontSize:10,color:T4,letterSpacing:"0.1em"}}>{p.category} — {p.stock} in stock</div>
                  </div>
                  <span className="mono" style={{fontWeight:700,fontSize:15,color:C,minWidth:72}}>${p.price}</span>
                  <div style={{display:"flex",gap:6}}>
                    <NBtn variant="ghost" size="sm" onClick={()=>{setForm({...p});setEditId(p.id);setTab("edit");}}>Edit</NBtn>
                    <NBtn variant="ghost" size="sm" onClick={()=>persistProducts(products.map((x:any)=>x.id===p.id?{...x,active:!x.active}:x))} style={{color:p.active?T3:C}}>{p.active?"Hide":"Show"}</NBtn>
                    <NBtn variant="pink" size="sm" onClick={()=>{if(window.confirm("Delete?"))persistProducts(products.filter((x:any)=>x.id!==p.id));}}>Delete</NBtn>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
        {(tab==="add"||tab==="edit")&&form&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28}}>
              <h2 className="orb" style={{fontSize:20,fontWeight:900,letterSpacing:"0.08em",color:T1}}>{editId?"EDIT PRODUCT":"NEW PRODUCT"}</h2>
              <NBtn variant="ghost" size="sm" onClick={()=>{setTab("products");setForm(null);}}>Cancel</NBtn>
            </div>
            <div style={{background:BG2,border:`1px solid ${BR}`,borderRadius:4,padding:32,display:"flex",flexDirection:"column",gap:16,maxWidth:640}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:10,fontWeight:700,color:T3,letterSpacing:"0.14em",fontFamily:"'Share Tech Mono',monospace"}}>PRODUCT NAME *<input style={inp} value={form.name} onChange={e=>setForm((f:any)=>({...f,name:e.target.value}))} placeholder="My Product"/></label>
                <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:10,fontWeight:700,color:T3,letterSpacing:"0.14em",fontFamily:"'Share Tech Mono',monospace"}}>PRICE (USD) *<input style={inp} type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm((f:any)=>({...f,price:e.target.value}))} placeholder="29.99"/></label>
              </div>
              <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:10,fontWeight:700,color:T3,letterSpacing:"0.14em",fontFamily:"'Share Tech Mono',monospace"}}>DESCRIPTION<textarea style={{...inp,minHeight:72,resize:"vertical"}} value={form.desc} onChange={e=>setForm((f:any)=>({...f,desc:e.target.value}))} placeholder="Describe your product..."/></label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:10,fontWeight:700,color:T3,letterSpacing:"0.14em",fontFamily:"'Share Tech Mono',monospace"}}>CATEGORY<select style={inp} value={form.category} onChange={e=>setForm((f:any)=>({...f,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
                <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:10,fontWeight:700,color:T3,letterSpacing:"0.14em",fontFamily:"'Share Tech Mono',monospace"}}>TYPE<select style={inp} value={form.type} onChange={e=>setForm((f:any)=>({...f,type:e.target.value}))}><option value="physical">Physical</option><option value="digital">Digital</option></select></label>
                <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:10,fontWeight:700,color:T3,letterSpacing:"0.14em",fontFamily:"'Share Tech Mono',monospace"}}>STOCK<input style={inp} type="number" min="0" value={form.stock} onChange={e=>setForm((f:any)=>({...f,stock:e.target.value}))}/></label>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <span className="mono" style={{fontSize:10,fontWeight:700,color:T3,letterSpacing:"0.14em"}}>PRODUCT IMAGE</span>
                <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                  <div style={{width:88,height:88,borderRadius:4,border:`1px solid ${BR}`,background:BG3,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                    {form.img?<img src={form.img} alt="preview" style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<span style={{fontSize:36}}>{form.emoji}</span>}
                  </div>
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
                    <label style={{display:"flex",alignItems:"center",gap:10,background:BG3,border:`1px dashed rgba(0,212,255,0.25)`,borderRadius:4,padding:"10px 16px",cursor:"pointer"}}>
                      <span className="mono" style={{fontSize:11,color:C,fontWeight:600,cursor:"pointer"}}>Upload image from device</span>
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const file=(e.target as any).files[0];if(!file)return;const r=new FileReader();r.onload=ev=>setForm((f:any)=>({...f,img:(ev.target as any).result}));r.readAsDataURL(file);}}/>
                    </label>
                    <div style={{display:"flex",gap:8}}>
                      <input style={{...inp,fontSize:12}} value={form.imgUrl||""} onChange={e=>setForm((f:any)=>({...f,imgUrl:e.target.value}))} placeholder="Or paste image URL: https://..."/>
                      <NBtn variant="cyan" size="sm" onClick={()=>{if(form.imgUrl)setForm((f:any)=>({...f,img:f.imgUrl,imgUrl:""}));}}>Use URL</NBtn>
                    </div>
                    {form.img&&<NBtn variant="pink" size="sm" onClick={()=>setForm((f:any)=>({...f,img:null}))}>Remove image</NBtn>}
                  </div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <span className="mono" style={{fontSize:10,fontWeight:700,color:T3,letterSpacing:"0.14em"}}>EMOJI (fallback when no image)</span>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{EMOJIS.map(em=><motion.button key={em} style={{width:36,height:36,borderRadius:4,border:`1px solid ${form.emoji===em?BRC:BR}`,background:form.emoji===em?"rgba(0,212,255,0.1)":BG3,cursor:"pointer",fontSize:17}} whileHover={{scale:1.1}} whileTap={{scale:0.9}} onClick={()=>setForm((f:any)=>({...f,emoji:em}))}>{em}</motion.button>)}</div>
              </div>
              <label style={{display:"flex",gap:10,alignItems:"center",fontSize:13,color:T3,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:500}}>
                <input type="checkbox" checked={form.active} onChange={e=>setForm((f:any)=>({...f,active:(e.target as any).checked}))}/>Visible in store
              </label>
              <NBtn variant="fill" size="lg" full onClick={saveForm}>{editId?"SAVE CHANGES":"ADD PRODUCT"}</NBtn>
            </div>
          </div>
        )}
        {tab==="orders"&&(
          <div>
            <h2 className="orb" style={{fontSize:20,fontWeight:900,letterSpacing:"0.08em",color:T1,marginBottom:28}}>ORDERS ({orders.length})</h2>
            {orders.length===0
              ?<p className="mono" style={{color:T4,fontSize:11,letterSpacing:"0.1em"}}>NO ORDERS YET.</p>
              :orders.map((o:any)=>(
                <motion.div key={o.id} initial={{opacity:0}} animate={{opacity:1}} style={{background:BG2,border:`1px solid ${BR}`,borderRadius:4,padding:"16px 20px",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <span className="mono" style={{fontWeight:700,color:C,fontSize:11,letterSpacing:"0.06em"}}>{o.id}</span>
                    <span className="mono" style={{background:"rgba(0,212,255,0.07)",color:C,border:`1px solid rgba(0,212,255,0.22)`,fontSize:9,fontWeight:700,padding:"3px 10px",borderRadius:20,letterSpacing:"0.1em"}}>{o.status.toUpperCase()}</span>
                    <span className="mono" style={{color:T4,fontSize:10}}>{new Date(o.date).toLocaleString()}</span>
                    <span className="mono" style={{fontWeight:800,color:C,marginLeft:"auto"}}>${o.total.toFixed(2)}</span>
                  </div>
                  <div style={{fontSize:13,color:T3,marginTop:6,fontWeight:500}}>{o.shipping.name} — {o.shipping.email}{o.shipping.address&&` — ${o.shipping.address}, ${o.shipping.city} ${o.shipping.zip}`}</div>
                  {o.signText&&<div style={{marginTop:8,background:"rgba(0,212,255,0.04)",border:`1px solid rgba(0,212,255,0.18)`,borderRadius:4,padding:"8px 14px",display:"inline-flex",alignItems:"center",gap:10}}><span className="mono" style={{fontSize:10,color:T4,letterSpacing:"0.1em"}}>LED Sign:</span><span className="mono" style={{fontSize:14,fontWeight:900,color:C,letterSpacing:"0.2em"}}>{o.signText}</span>{o.signExtraCost>0&&<span className="mono" style={{fontSize:10,color:P,fontWeight:700}}>+${o.signExtraCost.toFixed(2)} extra</span>}</div>}
                  <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>{o.items.map((i:any)=><span key={i.id} className="mono" style={{background:BG3,border:`1px solid ${BR}`,borderRadius:20,padding:"3px 12px",fontSize:10,color:T3,letterSpacing:"0.06em"}}>{i.emoji} {i.name} ×{i.qty}</span>)}</div>
                </motion.div>
              ))
            }
          </div>
        )}
        {tab==="branding"&&(
          <div>
            <h2 className="orb" style={{fontSize:20,fontWeight:900,letterSpacing:"0.08em",color:T1,marginBottom:28}}>BRANDING</h2>
            <div style={{background:BG2,border:`1px solid ${BR}`,borderRadius:4,padding:32,maxWidth:520,display:"flex",flexDirection:"column",gap:20}}>
              <div className="mono" style={{fontSize:9,letterSpacing:"0.2em",color:C}}>STORE LOGO</div>
              <div style={{display:"flex",alignItems:"center",gap:20}}>
                <div style={{width:96,height:96,borderRadius:4,border:`1px solid ${BR}`,background:BG3,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                  {logoSrc?<img src={logoSrc} alt="Logo" style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<LogoSVG size={72}/>}
                </div>
                <div>
                  <div style={{color:T1,fontWeight:600,fontSize:14,marginBottom:4}}>{logoSrc?"Custom logo active":"Using default logo"}</div>
                  <div style={{color:T4,fontSize:12,lineHeight:1.7,fontWeight:500}}>Appears in the header and footer. Recommended: square, 200×200px or larger.</div>
                </div>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:10,background:BG3,border:`1px dashed rgba(0,212,255,0.25)`,borderRadius:4,padding:"12px 18px",cursor:"pointer"}}>
                <div><div className="mono" style={{fontSize:11,color:C,fontWeight:700,cursor:"pointer"}}>Upload logo from device</div><div className="mono" style={{fontSize:9,color:T4,letterSpacing:"0.06em"}}>JPG · PNG · SVG · WebP</div></div>
                <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const file=(e.target as any).files[0];if(!file)return;const r=new FileReader();r.onload=ev=>handleSaveLogo((ev.target as any).result);r.readAsDataURL(file);}}/>
              </label>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div className="mono" style={{fontSize:9,fontWeight:700,color:T3,letterSpacing:"0.16em"}}>OR PASTE AN IMAGE URL</div>
                <div style={{display:"flex",gap:8}}>
                  <input style={inp} value={logoUrl} onChange={e=>setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png"/>
                  <NBtn variant="cyan" size="sm" onClick={()=>{if(logoUrl.trim()){handleSaveLogo(logoUrl.trim());setLogoUrl("");}}}>Apply</NBtn>
                </div>
              </div>
              {logoSrc&&<NBtn variant="pink" size="sm" style={{alignSelf:"flex-start"}} onClick={removeLogo}>Remove custom logo</NBtn>}
              <p className="mono" style={{color:T4,fontSize:9,lineHeight:1.9,borderTop:`1px solid ${BR}`,paddingTop:16,letterSpacing:"0.06em"}}>The logo is saved in Firestore and localStorage. For a permanent change, host your image and paste the URL above.</p>
            </div>
          </div>
        )}
      </div>
      <AnimatePresence>
        {toast&&<motion.div className="mono" initial={{opacity:0,y:12,x:"-50%"}} animate={{opacity:1,y:0,x:"-50%"}} exit={{opacity:0,y:8,x:"-50%"}} transition={{duration:0.22,ease:EASE}}
          style={{position:"fixed",bottom:28,left:"50%",background:`linear-gradient(135deg,${P},${C})`,color:"#fff",padding:"10px 24px",borderRadius:24,fontSize:10,fontWeight:700,zIndex:999,whiteSpace:"nowrap",letterSpacing:"0.12em"}}>
          {toast}
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}

// ─── PAYPAL HOOK ──────────────────────────────────────────────────────────────
function usePayPal(clientId:string) {
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    if(clientId==="YOUR_PAYPAL_CLIENT_ID") return;
    if((window as any).paypal){setLoaded(true);return;}
    const s=document.createElement("script"); s.src=`https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    s.onload=()=>setLoaded(true); document.body.appendChild(s);
    return ()=>{try{document.body.removeChild(s);}catch(e){}};
  },[clientId]);
  return loaded;
}

// ─── LANDING (v4 neon single page) ─────────────────────────────────────────────
const ACCENTS = ["cyan","pink","violet","yellow"];

// Traducciones de la landing (la prosa; los nombres/descripciones de producto
// vienen de la data y no se traducen aquí). La línea legal se mantiene en inglés.
const LT:Record<string,any> = {
  en:{
    navProducts:"Products",navHow:"How it works",navPlatforms:"Platforms",navFaq:"FAQ",navContact:"Contact",
    tagL:"INTERACTIVE STREAMING DEVICES",tagR:"LIVE · REAL-TIME",scroll:"SCROLL",
    marquee:["GIFTS","DONATIONS","SUBS","ALERTS","WEBHOOKS","CHANNEL POINTS","GOALS","CUSTOM TRIGGERS"],
    heroTitleA:"Streaming should be more than watching. It should be ",heroTitleWord:"interactive.",
    heroLead:"Interactive Props builds physical streaming devices that let viewers trigger real-world actions live — through gifts, donations, subscriptions, alerts, webhooks, channel points, goals, and custom triggers.",
    heroBtn1:"Explore devices",heroBtn2:"See how it works",
    triggersLabel:"Triggered by what your chat does",
    triggerNames:["Gifts","Donations","Subscriptions","Alerts","Webhooks","Channel points","Goals","Custom triggers"],
    ctaTitle:"Turn chat into real-world actions.",ctaSubA:"Make your stream ",ctaSubWord:"unforgettable.",
    ctaMailQ:"Questions, setup help or partnerships?",
    featuredKicker:"The lineup",featuredTitleA:"Featured ",featuredTitleWord:"products",viewAll:"View all products",
    prodPageEyebrow:"The lineup",prodPageTitleA:"All ",prodPageTitleWord:"products",
    prodPageSub:"Physical streaming devices your audience triggers live — through gifts, donations, subscriptions, alerts, webhooks, channel points, goals and custom triggers.",
    gamesSoonTitle:"Games are coming soon",
    gamesSoonBody:"Interactive mini-games your viewers control live are in the works. Want to be first to know when they drop? Reach us at",
    introKicker:"Welcome to Interactive Props",
    introHeadA:"Streaming should be more than watching.",introHeadB:"It should be interactive.",
    introSub:<>We build interactive streaming devices that connect your viewers directly to your stream in a physical, real-life way. From the <b>Interactive Blaster</b> firing foam darts mid-stream, to the <b>Interactive Silly String</b> launching chaos, to the <b>Interactive Pump</b> creating audience-triggered moments — every product turns viewers into participants instead of spectators.</>,
    howKicker:"The Loop",howTitleA:"From chat to ",howTitleMid:"real life",howTitleB:" in seconds",
    howDesc:"Your stream alerts, gifts, donations and events trigger physical actions in real time. No programming required for most setups — just Wi-Fi, a browser, and a simple webhook or streaming-tool integration.",
    steps:[
      {h:"A viewer acts",p:"A gift, donation, sub, channel-point redemption, goal or custom chat command fires off an event from your live audience.",tags:["Gift","Donation","Sub","Goal"]},
      {h:"The trigger fires",p:"Webhooks and modern stream-automation tools relay that event to your device instantly — bridging your overlay and the real world.",tags:["Webhook","Alert","Automation"]},
      {h:"The prop reacts",p:"Your physical prop fires, sprays, pumps or lights up — live on stream, in real time, for everyone to see and react to.",tags:["Fire","Spray","Light up"]},
    ],
    prodKicker:"The Lineup",prodTitleA:"Hand your ",prodTitleMid:"audience the controls",
    prodDesc:"Every device works with livestream platforms, webhooks, goals, donations, gifts and custom triggers — built specifically for content creators.",
    onlyLeft:"Only",left:"left",addToCart:"Add to cart",
    whyKicker:"Why creators choose us",whyTitleA:"Built by creators, ",whyTitleMid:"for creators",
    whyDesc:"As creators ourselves, we know how hard it is to keep streams exciting and stand out from thousands of channels. So we built the props that make viewers part of the show.",
    features:[
      {ic:"⚡",h:"Easy setup for streamers",p:"Beginner-friendly by design. Most setups just need Wi-Fi, a browser and a simple integration."},
      {ic:"🎯",h:"Real-time audience interaction",p:"Viewers trigger physical effects the instant they act — no lag between chat and chaos."},
      {ic:"🚀",h:"Engagement that's unforgettable",p:"Unique stream moments your viewers remember — and come back for."},
      {ic:"🔌",h:"Reliable integrations",p:"Works with modern streaming tools, webhooks, goals, donations, gifts and custom triggers."},
      {ic:"🎮",h:"Made for content creators",p:"Every product is engineered specifically for streamers and live IRL content."},
      {ic:"🧩",h:"Stack them together",p:"Combine multiple props to build a bigger, wilder interactive setup."},
    ],
    platKicker:"Plays nice with your stack",platTitleA:"Works across the ",platTitleMid:"platforms you stream on",
    platDesc:"Our products are designed to work with multiple streaming platforms through supported third-party tools, webhooks and stream-automation software — depending on your setup.",
    plats:[{name:"TikTok Live",sub:"via supported tools & webhooks"},{name:"Twitch",sub:"alerts · channel points · bits"},{name:"Kick",sub:"events · automation"},{name:"YouTube",sub:"Super Chats · memberships"}],
    stats:["Interactive products","Day limited warranty","Day returns window","Code required to start"],
    faqKicker:"Good to know",faqTitleA:"Frequently asked ",faqTitleMid:"questions",
    faq:[
      {q:"What is Interactive Props?",a:"Interactive Props creates interactive streaming products that let viewers trigger real-life effects during livestreams using gifts, donations, alerts, webhooks and other stream integrations."},
      {q:"Who are these products made for?",a:"Streamers, TikTok creators, Twitch streamers, Kick streamers, YouTubers, IRL content creators, gaming creators, reaction streamers — anyone looking to create interactive live experiences."},
      {q:"Do your products work with TikTok, Twitch, Kick and YouTube?",a:"Yes. Many of our products work with TikTok Live through supported third-party tools, webhooks or stream-automation platforms, and they're designed to work with Twitch, Kick and YouTube depending on your setup and software integration."},
      {q:"Are the products difficult to set up?",a:"No. We design our products to be as beginner-friendly as possible. Most setups only require Wi-Fi, a browser, and simple webhook or streaming-tool integration — no programming experience needed for most basic setups."},
      {q:"Can viewers control the products live?",a:"Yes. Depending on your setup, viewers can trigger products through gifts, donations, channel points, stream events, chat commands, goals and custom automation tools."},
      {q:"Do the products require Wi-Fi?",a:"Most interactive products require a Wi-Fi connection for live interaction features."},
      {q:"Can multiple products be used together?",a:"Yes. Many streamers combine multiple Interactive Props products to create larger interactive setups."},
      {q:"Are the products safe to use indoors?",a:"Yes, when used responsibly and according to instructions. Always use products safely and avoid aiming near faces, eyes, pets or fragile objects. Adult supervision is recommended for minors."},
      {q:"Do your products include a warranty?",a:"Yes. Eligible products include a limited 90-day warranty covering manufacturing defects under normal use."},
    ],
    polShipTitle:"🚚 Shipping & Delivery",polShip:"Most orders process within 2–5 business days. Domestic orders typically arrive within 3–10 business days after shipment. Tracking is emailed once your order ships. Select international destinations available.",
    polRetTitle:"↩️ Returns & Refunds",polRet:"Unused items in original condition & packaging can be returned within 14 days of delivery. Approved refunds are issued to your original payment method within 5–10 business days.",
    polWarTitle:"🛡️ Warranty",polWar:"Eligible products carry a limited 90-day warranty from delivery against manufacturing defects under normal use — covering electrical, hardware and workmanship failures.",
    ctaKicker:"Let's make your stream unforgettable",ctaHeadA:"Ready to hand your viewers ",ctaHeadMid:"the controls?",
    ctaSub:"Questions about products, setup help, partnerships or your order? We'd love to hear from you. Please include your order number if applicable.",
    ctaFine:"We aim to respond as quickly as possible.",
    footBlurb:"Interactive Props — where streaming becomes truly interactive. Real props. Real reactions. Controlled by your audience, live.",
    footProducts:"Products",footCompany:"Company",footSupport:"Support",
    footAbout:"About us",footHow:"How it works",footPlatforms:"Platforms",footFaq:"FAQ",
    footShip:"Shipping & Delivery",footRet:"Returns & Refunds",footWar:"Warranty Policy",footContact:"Contact",
    juego:{
      eyebrow:"INTERACTIVE GAMES",
      badge:"Digital game",verJuego:"View game",
      desajusteTitulo:"Payments are not safe to run yet",
      desajusteBody:"The server is in sandbox mode but the browser is set up for live PayPal. Buttons are hidden on purpose: paying here would charge real money and still not create a licence. Set VITE_PAYPAL_CLIENT_ID (sandbox) for this environment and redeploy.",
      desc:"A fast-paced donut-hopping run. Buy once, play forever — on any device, from your own private link.",
      bullets:["One-time payment, no subscription","Plays in your browser — nothing to install","Works on desktop and mobile","Your link never expires"],
      pagoUnico:"one-time payment",
      cargando:"Loading payment options…",
      procesando:"Confirming your payment…",
      acceso:"After paying you get a private link. That link is your key — keep it.",
      errorRed:"We couldn't reach the server. If you were charged, email us and we'll send your link.",
      errorPago:"The payment failed. Please try again.",
      listoTitulo:"You're in!",
      listoSub:"This is your private link. We also sent it to your PayPal email.",
      jugar:"Play now",
      guarda:"Save this link — it works forever, on any device.",
    },
  },
  es:{
    navProducts:"Productos",navHow:"Cómo funciona",navPlatforms:"Plataformas",navFaq:"Preguntas",navContact:"Contacto",
    tagL:"DISPOSITIVOS DE STREAMING INTERACTIVOS",tagR:"EN VIVO · TIEMPO REAL",scroll:"BAJÁ",
    marquee:["REGALOS","DONACIONES","SUBS","ALERTAS","WEBHOOKS","PUNTOS DE CANAL","METAS","TRIGGERS"],
    heroTitleA:"El streaming debería ser más que mirar. Debería ser ",heroTitleWord:"interactivo.",
    heroLead:"Interactive Props crea dispositivos físicos de streaming que permiten a tus viewers activar acciones del mundo real en vivo — mediante regalos, donaciones, suscripciones, alertas, webhooks, puntos de canal, metas y triggers personalizados.",
    heroBtn1:"Explorar dispositivos",heroBtn2:"Ver cómo funciona",
    triggersLabel:"Activado por lo que hace tu chat",
    triggerNames:["Regalos","Donaciones","Suscripciones","Alertas","Webhooks","Puntos de canal","Metas","Triggers personalizados"],
    ctaTitle:"Convierte el chat en acciones reales.",ctaSubA:"Haz tu stream ",ctaSubWord:"inolvidable.",
    ctaMailQ:"¿Preguntas, ayuda con la configuración o colaboraciones?",
    featuredKicker:"La línea",featuredTitleA:"Productos ",featuredTitleWord:"destacados",viewAll:"Ver todos los productos",
    prodPageEyebrow:"La línea",prodPageTitleA:"Todos los ",prodPageTitleWord:"productos",
    prodPageSub:"Dispositivos físicos de streaming que tu audiencia activa en vivo — mediante regalos, donaciones, suscripciones, alertas, webhooks, puntos de canal, metas y triggers personalizados.",
    gamesSoonTitle:"Los juegos llegan pronto",
    gamesSoonBody:"Estamos preparando mini-juegos interactivos que tus viewers controlan en vivo. ¿Querés ser el primero en enterarte cuando salgan? Escribinos a",
    introKicker:"Bienvenido a Interactive Props",
    introHeadA:"El streaming debería ser más que mirar.",introHeadB:"Debería ser interactivo.",
    introSub:<>Creamos dispositivos de streaming interactivos que conectan a tus viewers directamente con tu stream de forma física y real. Desde el <b>Interactive Blaster</b> disparando dardos de gomaespuma en vivo, al <b>Interactive Silly String</b> desatando el caos, hasta el <b>Interactive Pump</b> creando momentos activados por la audiencia — cada producto convierte a los espectadores en participantes.</>,
    howKicker:"El Ciclo",howTitleA:"Del chat a la ",howTitleMid:"vida real",howTitleB:" en segundos",
    howDesc:"Las alertas, regalos, donaciones y eventos de tu stream disparan acciones físicas en tiempo real. Sin programar en la mayoría de los casos — solo Wi-Fi, un navegador y una integración simple por webhook o herramienta de streaming.",
    steps:[
      {h:"Un viewer actúa",p:"Un regalo, donación, sub, canje de puntos de canal, meta o comando de chat dispara un evento desde tu audiencia en vivo.",tags:["Regalo","Donación","Sub","Meta"]},
      {h:"Se dispara el trigger",p:"Los webhooks y las herramientas modernas de automatización llevan ese evento a tu dispositivo al instante — conectando tu overlay con el mundo real.",tags:["Webhook","Alerta","Automatización"]},
      {h:"El prop reacciona",p:"Tu prop físico dispara, rocía, bombea o se ilumina — en vivo en tu stream, en tiempo real, para que todos lo vean y reaccionen.",tags:["Dispara","Rocía","Ilumina"]},
    ],
    prodKicker:"La Línea",prodTitleA:"Dale a tu ",prodTitleMid:"audiencia el control",
    prodDesc:"Cada dispositivo funciona con plataformas de streaming, webhooks, metas, donaciones, regalos y triggers personalizados — hecho especialmente para creadores de contenido.",
    onlyLeft:"Solo quedan",left:"",addToCart:"Agregar al carrito",
    whyKicker:"Por qué los creadores nos eligen",whyTitleA:"Hecho por creadores, ",whyTitleMid:"para creadores",
    whyDesc:"Como creadores nosotros mismos, sabemos lo difícil que es mantener un stream entretenido y destacar entre miles de canales. Por eso construimos los props que hacen a los viewers parte del show.",
    features:[
      {ic:"⚡",h:"Fácil de configurar",p:"Pensado para principiantes. La mayoría de los setups solo necesitan Wi-Fi, un navegador y una integración simple."},
      {ic:"🎯",h:"Interacción en tiempo real",p:"Los viewers activan efectos físicos en el instante en que actúan — sin lag entre el chat y el caos."},
      {ic:"🚀",h:"Engagement inolvidable",p:"Momentos únicos que tus viewers recuerdan — y por los que vuelven."},
      {ic:"🔌",h:"Integraciones confiables",p:"Funciona con herramientas modernas de streaming, webhooks, metas, donaciones, regalos y triggers."},
      {ic:"🎮",h:"Hecho para creadores",p:"Cada producto está diseñado específicamente para streamers y contenido IRL en vivo."},
      {ic:"🧩",h:"Combinálos entre sí",p:"Combiná varios props para armar un setup interactivo más grande y salvaje."},
    ],
    platKicker:"Se lleva bien con tu setup",platTitleA:"Funciona en las ",platTitleMid:"plataformas donde streameás",
    platDesc:"Nuestros productos están diseñados para funcionar con múltiples plataformas de streaming mediante herramientas de terceros, webhooks y software de automatización — según tu configuración.",
    plats:[{name:"TikTok Live",sub:"vía herramientas y webhooks"},{name:"Twitch",sub:"alertas · puntos de canal · bits"},{name:"Kick",sub:"eventos · automatización"},{name:"YouTube",sub:"Super Chats · membresías"}],
    stats:["Productos interactivos","Días de garantía limitada","Días para devoluciones","Código para empezar"],
    faqKicker:"Bueno saberlo",faqTitleA:"Preguntas ",faqTitleMid:"frecuentes",
    faq:[
      {q:"¿Qué es Interactive Props?",a:"Interactive Props crea productos de streaming interactivos que permiten a los viewers activar efectos de la vida real durante los directos usando regalos, donaciones, alertas, webhooks y otras integraciones."},
      {q:"¿Para quién son estos productos?",a:"Streamers, creadores de TikTok, streamers de Twitch y Kick, YouTubers, creadores de contenido IRL, gamers, streamers de reacción — cualquiera que quiera crear experiencias interactivas en vivo."},
      {q:"¿Funcionan con TikTok, Twitch, Kick y YouTube?",a:"Sí. Muchos de nuestros productos funcionan con TikTok Live mediante herramientas de terceros, webhooks o plataformas de automatización, y están diseñados para funcionar con Twitch, Kick y YouTube según tu configuración e integración de software."},
      {q:"¿Son difíciles de configurar?",a:"No. Diseñamos nuestros productos para que sean lo más fáciles posible. La mayoría de los setups solo requieren Wi-Fi, un navegador y una integración simple por webhook — sin experiencia en programación para los casos básicos."},
      {q:"¿Los viewers pueden controlarlos en vivo?",a:"Sí. Según tu configuración, los viewers pueden activar los productos mediante regalos, donaciones, puntos de canal, eventos del stream, comandos de chat, metas y herramientas de automatización."},
      {q:"¿Los productos requieren Wi-Fi?",a:"La mayoría de los productos interactivos requieren conexión Wi-Fi para las funciones de interacción en vivo."},
      {q:"¿Se pueden usar varios productos juntos?",a:"Sí. Muchos streamers combinan varios productos de Interactive Props para crear setups interactivos más grandes."},
      {q:"¿Son seguros para usar en interiores?",a:"Sí, cuando se usan de forma responsable y según las instrucciones. Usá siempre los productos con cuidado y evitá apuntar cerca de caras, ojos, mascotas u objetos frágiles. Se recomienda supervisión de un adulto para menores."},
      {q:"¿Los productos incluyen garantía?",a:"Sí. Los productos elegibles incluyen una garantía limitada de 90 días que cubre defectos de fabricación bajo uso normal."},
    ],
    polShipTitle:"🚚 Envíos y Entregas",polShip:"La mayoría de los pedidos se procesan en 2–5 días hábiles. Los pedidos nacionales suelen llegar en 3–10 días hábiles tras el envío. El seguimiento se envía por email cuando tu pedido sale. Disponible a destinos internacionales seleccionados.",
    polRetTitle:"↩️ Devoluciones y Reembolsos",polRet:"Los artículos sin usar en su condición y empaque original pueden devolverse dentro de los 14 días de la entrega. Los reembolsos aprobados se emiten a tu método de pago original en 5–10 días hábiles.",
    polWarTitle:"🛡️ Garantía",polWar:"Los productos elegibles tienen una garantía limitada de 90 días desde la entrega contra defectos de fabricación bajo uso normal — cubre fallas eléctricas, de hardware y de mano de obra.",
    ctaKicker:"Hagamos tu stream inolvidable",ctaHeadA:"¿Listo para darle a tus viewers ",ctaHeadMid:"el control?",
    ctaSub:"¿Preguntas sobre productos, ayuda con la configuración, colaboraciones o tu pedido? Nos encantaría saber de vos. Incluí tu número de pedido si corresponde.",
    ctaFine:"Respondemos lo más rápido posible.",
    footBlurb:"Interactive Props — donde el streaming se vuelve realmente interactivo. Props reales. Reacciones reales. Controlados por tu audiencia, en vivo.",
    footProducts:"Productos",footCompany:"Empresa",footSupport:"Soporte",
    footAbout:"Nosotros",footHow:"Cómo funciona",footPlatforms:"Plataformas",footFaq:"Preguntas",
    footShip:"Envíos y Entregas",footRet:"Devoluciones y Reembolsos",footWar:"Garantía",footContact:"Contacto",
    juego:{
      eyebrow:"JUEGOS INTERACTIVOS",
      badge:"Juego digital",verJuego:"Ver juego",
      desajusteTitulo:"Todavia no es seguro cobrar aqui",
      desajusteBody:"El servidor esta en modo sandbox pero el navegador esta configurado con PayPal de produccion. Ocultamos los botones a proposito: pagar aqui cobraria dinero REAL y aun asi no se emitiria la licencia. Pon VITE_PAYPAL_CLIENT_ID (sandbox) en este entorno y vuelve a desplegar.",
      desc:"Un runner trepidante saltando de dona en dona. Lo compras una vez y lo juegas para siempre — en cualquier dispositivo, desde tu enlace privado.",
      bullets:["Pago único, sin suscripción","Se juega en el navegador — no hay que instalar nada","Funciona en computadora y en móvil","Tu enlace no caduca nunca"],
      pagoUnico:"pago único",
      cargando:"Cargando opciones de pago…",
      procesando:"Confirmando tu pago…",
      acceso:"Al pagar recibes un enlace privado. Ese enlace es tu llave — guárdalo.",
      errorRed:"No pudimos contactar al servidor. Si se te cobró, escríbenos y te mandamos tu enlace.",
      errorPago:"El pago falló. Inténtalo de nuevo.",
      listoTitulo:"¡Listo!",
      listoSub:"Este es tu enlace privado. También lo enviamos al correo de tu PayPal.",
      jugar:"Jugar ahora",
      guarda:"Guarda este enlace — sirve siempre y desde cualquier dispositivo.",
    },
  },
};

// Descripciones de producto en español (por nombre). Si un producto no está
// acá (p. ej. uno nuevo cargado desde el admin), cae a la descripción original.
const PROD_DESC_ES:Record<string,string> = {
  "Interactive Pump":"El Interactive Pump permite a los viewers activar acciones de bombeo en tiempo real durante tus directos usando alertas, regalos, webhooks y triggers personalizados. Diseñado para crear reacciones divertidas, caóticas y muy atractivas que convierten a los espectadores pasivos en participantes activos.",
  "Interactive Blaster":"Un lanzador de dardos de gomaespuma para streaming que permite a los viewers disparar en tiempo real mediante regalos, donaciones, alertas y webhooks. Hecho para creadores que buscan interacción de alta energía con sorpresa, tensión y momentos inolvidables.",
  "Interactive Silly String":"Un dispositivo de bromas controlado por el streamer que permite a los viewers disparar latas reales de silly string en vivo durante tu stream. Pensado para creadores, convierte los directos comunes en experiencias caóticas, hilarantes e inolvidables.",
  "Interactive LED Sign":"Un letrero LED personalizable que da vida a tu nombre o marca con iluminación dinámica y efectos interactivos. Admite hasta 8 letras al precio base, con $3 por cada letra adicional. Aprox. 18 pulgadas de ancho según el largo del nombre.",
  "Chaos Bundle":"El setup interactivo definitivo todo-en-uno que combina el Pump, el Blaster y el Silly String. Los viewers activan múltiples efectos reales en vivo mediante regalos, donaciones, alertas, webhooks y eventos personalizados — caos sin parar garantizado.",
  "Interactive Stellar Dash":"Un runner espacial arcade a toda velocidad donde el chat en vivo controla el caos. Los viewers activan obstáculos, ataques y cambios de dificultad en tiempo real — convirtiendo cada partida en una batalla impredecible por sobrevivir, hecha para streamers.",
};

// ─── SHARED NEON CHROME (nav / footer / product card) ─────────────────────────
function ProductCard({p,i,lang,addToCart,L}:any){
  return (
    <article className="card reveal" data-accent={ACCENTS[i%ACCENTS.length]} id={"p"+p.id}>
      <div className="card-media">
        <span className="card-price">${p.price}</span>
        {p.type==="digital"&&<span className="card-badge">Digital</span>}
        {p.img?<img src={p.img} alt={p.name} loading="lazy"/>:<span className="card-emoji">{p.emoji}</span>}
      </div>
      <div className="card-body">
        <h3 className="card-title">{p.name}</h3>
        <p className="card-desc">{lang==="es" ? (PROD_DESC_ES[p.name]||p.desc) : p.desc}</p>
        {p.stock<15&&<span className="stock-low">{L.onlyLeft} {p.stock} {L.left}</span>}
        <div className="card-foot">
          <button className="btn-add" onClick={()=>addToCart(p)}>{L.addToCart}</button>
        </div>
      </div>
    </article>
  );
}

function NeonNav({lang,setLang,cartCount,onCart,onHome,onProps,onGames,onFaq,solid}:any){
  const [menuOpen,setMenuOpen]=useState(false);
  return (
    <header className={"nav"+(solid?" scrolled":"")}>
      <button className="brand" onClick={onHome}>
        <img src="/landing/logo.png" alt="Interactive Props" className="brand-logo"/>
        <span className="brand-name">INTERACTIVE&nbsp;<span className="brand-name-2">PROPS</span></span>
      </button>
      <nav className="nav-links">
        <a onClick={onProps}>Props</a>
        <a onClick={onGames}>Games</a>
        <a onClick={onFaq}>FAQ</a>
      </nav>
      <div className="nav-tools">
        <div className="lang-toggle">
          <button className={lang==="en"?"on":""} onClick={()=>setLang("en")}>EN</button>
          <button className={lang==="es"?"on":""} onClick={()=>setLang("es")}>ES</button>
        </div>
        <button className="nav-icon" aria-label="Cart" onClick={onCart}>
          🛒{cartCount>0&&<span className="cart-count">{cartCount}</span>}
        </button>
        <button className={"nav-burger"+(menuOpen?" is-open":"")} aria-label="Menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen((o:boolean)=>!o)}>
          <span/><span/><span/>
        </button>
      </div>
      <nav className="mobile-menu" hidden={!menuOpen}>
        <a onClick={()=>{onProps();setMenuOpen(false);}}>Props</a>
        <a onClick={()=>{onGames();setMenuOpen(false);}}>Games</a>
        <a onClick={()=>{onFaq();setMenuOpen(false);}}>FAQ</a>
      </nav>
    </header>
  );
}

function NeonFooter({L,products,onProductsLink,onHow,onFaq,onPolicy}:any){
  return (
    <footer className="footer">
      <div className="wrap foot-grid">
        <div className="foot-brand">
          <img src="/landing/logo.png" alt="Interactive Props" className="foot-logo"/>
          <p>{L.footBlurb}</p>
        </div>
        <div className="foot-col">
          <h5>{L.footProducts}</h5>
          {products.slice(0,4).map((p:any)=>(<a key={p.id} onClick={onProductsLink}>{p.name}</a>))}
        </div>
        <div className="foot-col">
          <h5>{L.footCompany}</h5>
          <a onClick={onHow}>{L.footHow}</a>
          <a onClick={onFaq}>{L.footFaq}</a>
          <a href="mailto:interactiveprops.official@gmail.com">{L.footContact}</a>
        </div>
        <div className="foot-col">
          <h5>{L.footSupport}</h5>
          <a onClick={()=>onPolicy("shipping")}>{L.footShip}</a>
          <a onClick={()=>onPolicy("returns")}>{L.footRet}</a>
          <a onClick={()=>onPolicy("warranty")}>{L.footWar}</a>
          <a href="mailto:interactiveprops.official@gmail.com">{L.footContact}</a>
        </div>
      </div>
      <div className="wrap foot-bottom">
        <span className="foot-legal">Interactive Props is owned and operated by <b>Veronica Aime Rey, sole proprietor</b>.</span>
        <span className="foot-mail">© <span>{new Date().getFullYear()}</span> · interactiveprops.official@gmail.com</span>
      </div>
    </footer>
  );
}

// ─── LANDING (v4 neon single page) ─────────────────────────────────────────────
function LandingView({products,lang,setLang,addToCart,cartCount,setCartOpen,goProducts,goFaq,goPolicy}:any) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<any>(null);
  const L = LT[lang] || LT.en;
  const featured = products.filter((p:any)=>p.category==="Props");

  // Smooth-scroll to an in-page section id
  function goTo(id:string){
    const el=rootRef.current?.querySelector(id) as HTMLElement|null;
    if(el&&lenisRef.current) lenisRef.current.scrollTo(el,{offset:-70,duration:1.2});
    else if(el) el.scrollIntoView({behavior:"smooth"});
  }

  // Lenis smooth-scroll + scroll reveals + stat counters + nav scrolled state
  useEffect(()=>{
    const root=rootRef.current; if(!root) return;
    const nav=root.querySelector(".nav") as HTMLElement|null;
    let rafId=0;

    const lenis=new Lenis({lerp:0.09,smoothWheel:true}); lenisRef.current=lenis; (window as any).__lenis=lenis;
    function raf(time:number){ lenis.raf(time); rafId=requestAnimationFrame(raf); }
    rafId=requestAnimationFrame(raf);
    lenis.on("scroll",({scroll}:any)=>{
      if(nav) nav.classList.toggle("scrolled",scroll>40);
    });

    const io=new IntersectionObserver((entries)=>{
      entries.forEach((e)=>{
        if(!e.isIntersecting) return;
        e.target.classList.add("in");
        if(e.target.classList.contains("stat-num")){
          const el=e.target as HTMLElement;
          const target=parseFloat(el.dataset.count||"0"), suffix=el.dataset.suffix||"";
          const dur=1500, t0=performance.now();
          const step=(tm:number)=>{ const k=Math.min((tm-t0)/dur,1), eased=1-Math.pow(1-k,3);
            el.textContent=(target%1===0?Math.round(target*eased):(target*eased).toFixed(1))+suffix;
            if(k<1) requestAnimationFrame(step); };
          requestAnimationFrame(step);
        }
        io.unobserve(e.target);
      });
    },{threshold:0.2,rootMargin:"0px 0px -8% 0px"});
    root.querySelectorAll(".reveal, .stat-num").forEach(el=>io.observe(el));

    return ()=>{ cancelAnimationFrame(rafId); io.disconnect(); lenis.destroy(); lenisRef.current=null; };
  },[]);

  // Neon trigger icons for the auto-scrolling "Triggered by what your chat does" bar
  const triggers = [
    {c:"#ff3ea5", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 12h18M12 8v13M12 8S9.5 3.5 7.5 5s1 3 4.5 3M12 8s2.5-4.5 4.5-3-1 3-4.5 3"/></svg>},
    {c:"#35e0a1", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.2C14 8.4 13 8 12 8c-1.4 0-2.5.8-2.5 2s1.1 1.7 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2c-1 0-2-.4-2.5-1.2M12 6.5v11"/></svg>},
    {c:"#a855f7", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 10h-13z"/></svg>},
    {c:"#ff8a3d", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 15V10a6 6 0 1 0-12 0v5l-2 3h16z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>},
    {c:"#2bd4ff", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 10a3 3 0 1 1 4 2.8L11 16"/><path d="M15 12a3 3 0 1 1-1 5.8H10"/><path d="M8.5 13.5A3 3 0 1 1 6 19"/></svg>},
    {c:"#4ade80", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 3 1-6.1L3.2 9.5l6.1-.9z"/></svg>},
    {c:"#ff5c8a", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>},
    {c:"#5b8cff", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M13 3L5 13h5l-1 8 8-11h-5z"/></svg>},
  ];

  return (
    <div className="ip-landing" ref={rootRef}>
      {/* NAV (shared neon chrome) */}
      <NeonNav lang={lang} setLang={setLang} cartCount={cartCount} onCart={()=>setCartOpen(true)}
        onHome={()=>goTo("#top")} onProps={()=>goProducts("props")} onGames={()=>goProducts("games")} onFaq={goFaq}/>

      <span id="top"/>

      {/* HERO — static full-bleed image with floating neon chips */}
      <section className="hero" id="hero">
        <div className="hero-media"><img src="/landing/hero.jpg" alt="The Interactive Props lineup on a neon streaming desk"/></div>
        <div className="hero-scrim"/>
        <div className="hero-badges" aria-hidden="true">
          <span className="chip chip-gift"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 12h18M12 8v13M12 8S9.5 3.5 7.5 5s1 3 4.5 3M12 8s2.5-4.5 4.5-3-1 3-4.5 3"/></svg>GIFT</span>
          <span className="chip chip-webhook"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 10a3 3 0 1 1 4 2.8L11 16"/><path d="M15 12a3 3 0 1 1-1 5.8H10"/><path d="M8.5 13.5A3 3 0 1 1 6 19"/></svg>WEBHOOK</span>
          <span className="chip chip-alert"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 15V10a6 6 0 1 0-12 0v5l-2 3h16z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>ALERT</span>
          <span className="chip chip-sub"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 3 1-6.1L3.2 9.5l6.1-.9z"/></svg>SUB</span>
        </div>
        <div className="hero-inner wrap">
          <div className="hero-copy">
            <h1 className="hero-title reveal">{L.heroTitleA}<span className="grad-word">{L.heroTitleWord}</span></h1>
            <p className="hero-lead reveal">{L.heroLead}</p>
            <div className="hero-cta reveal">
              <button className="btn btn-solid" onClick={()=>goTo("#products")}>{L.heroBtn1} <span className="arw">→</span></button>
              <button className="btn btn-ghost" onClick={()=>goTo("#how")}>{L.heroBtn2} <span className="tri">▶</span></button>
            </div>
          </div>
        </div>
      </section>

      {/* TRIGGERS STRIP — label + auto-scrolling neon icon bar */}
      <div className="triggers-wrap wrap">
        <p className="triggers-label reveal">{L.triggersLabel}</p>
        <div className="triggers reveal">
          <div className="marquee">
            {[0,1].flatMap(rep=>triggers.map((tg:any,i:number)=>(
              <span className="trig" style={{"--c":tg.c} as any} key={rep+"-"+i}>
                <span className="t-ic">{tg.icon}</span>{L.triggerNames[i]}
              </span>
            )))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="how" id="how">
        <div className="wrap">
          <div className="sec-head reveal">
            <p className="kicker">{L.howKicker}</p>
            <h2 className="sec-title">{L.howTitleA}<span className="grad">{L.howTitleMid}</span>{L.howTitleB}</h2>
            <p className="sec-desc">{L.howDesc}</p>
          </div>
          <div className="steps">
            {L.steps.map((s:any,i:number)=>(
              <article className="step reveal" key={i}>
                <div className="step-card">
                  <span className="step-num">{i+1}</span>
                  <div className="step-img"><img src={["/landing/hiw-viewer.jpg","/landing/hiw-trigger.jpg","/landing/hiw-prop.jpg"][i]} alt={s.h} loading="lazy"/></div>
                  <h3 className="step-cap">{s.h}</h3>
                  <p className="step-sub">{s.p}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS — wired to shared cart */}
      <section className="products" id="products">
        <div className="wrap">
          <div className="sec-head reveal">
            <p className="kicker">{L.featuredKicker}</p>
            <h2 className="sec-title">{L.featuredTitleA}<span className="grad">{L.featuredTitleWord}</span></h2>
            <p className="sec-desc">{L.prodDesc}</p>
          </div>
          <div className="grid">
            {featured.map((p:any,i:number)=>(
              <ProductCard key={p.id} p={p} i={i} lang={lang} addToCart={addToCart} L={L}/>
            ))}
          </div>
          <div className="view-all reveal">
            <button className="btn btn-ghost" onClick={()=>goProducts("props")}>{L.viewAll} <span className="arw">→</span></button>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="why" id="why">
        <div className="wrap">
          <div className="sec-head reveal">
            <p className="kicker">{L.whyKicker}</p>
            <h2 className="sec-title">{L.whyTitleA}<span className="grad">{L.whyTitleMid}</span></h2>
            <p className="sec-desc">{L.whyDesc}</p>
          </div>
          <ul className="features">
            {L.features.map((f:any,i:number)=>(
              <li className="feature reveal" key={i}><span className="f-ic">{f.ic}</span><div><h4>{f.h}</h4><p>{f.p}</p></div></li>
            ))}
          </ul>
        </div>
      </section>

      {/* STATS */}
      <section className="stats">
        <div className="wrap stat-row">
          <div className="stat reveal"><span className="stat-num" data-count="4">0</span><span className="stat-label">{L.stats[0]}</span></div>
          <div className="stat reveal"><span className="stat-num" data-count="90">0</span><span className="stat-label">{L.stats[1]}</span></div>
          <div className="stat reveal"><span className="stat-num" data-count="14">0</span><span className="stat-label">{L.stats[2]}</span></div>
          <div className="stat reveal"><span className="stat-num" data-count="0">0</span><span className="stat-label">{L.stats[3]}</span></div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="cta" id="contact">
        <div className="cta-media"><img src="/landing/banner.jpg" alt="" aria-hidden="true"/></div>
        <div className="cta-scrim"/>
        <div className="wrap cta-inner reveal">
          <h2 className="cta-title">{L.ctaTitle}</h2>
          <p className="cta-sub-line">{L.ctaSubA}<span className="grad-word">{L.ctaSubWord}</span></p>
          <div className="hero-cta cta-btns">
            <button className="btn btn-solid" onClick={()=>goTo("#products")}>{L.heroBtn1} <span className="arw">→</span></button>
            <button className="btn btn-ghost" onClick={()=>goTo("#how")}>{L.heroBtn2} <span className="tri">▶</span></button>
          </div>
          <p className="cta-mail">{L.ctaMailQ} <a href="mailto:interactiveprops.official@gmail.com">interactiveprops.official@gmail.com</a></p>
        </div>
      </section>

      {/* FOOTER (shared neon chrome) */}
      <NeonFooter L={L} products={featured} onProductsLink={()=>goProducts("props")}
        onHow={()=>goTo("#how")} onFaq={goFaq} onPolicy={goPolicy}/>
    </div>
  );
}

// ─── PRODUCTS PAGE (neon, Props / Games tabs) ─────────────────────────────────
function ProductsPage({products,lang,setLang,addToCart,cartCount,setCartOpen,tab,setTab,goHome,goProducts,goFaq,goPolicy,goJuego}:any) {
  const rootRef = useRef<HTMLDivElement>(null);
  const L = LT[lang] || LT.en;
  const props = products.filter((p:any)=>p.active!==false && p.category==="Props");

  useEffect(()=>{
    const root=rootRef.current; if(!root) return;
    const io=new IntersectionObserver((es)=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } }),{threshold:0.12,rootMargin:"0px 0px -6% 0px"});
    root.querySelectorAll(".reveal").forEach(el=>io.observe(el));
    return ()=>io.disconnect();
  },[tab]);

  return (
    <div className="ip-landing" ref={rootRef}>
      <NeonNav solid lang={lang} setLang={setLang} cartCount={cartCount} onCart={()=>setCartOpen(true)}
        onHome={goHome} onProps={()=>setTab("props")} onGames={()=>setTab("games")} onFaq={goFaq}/>

      <section className="page-head">
        <div className="wrap">
          <p className="page-eyebrow">{L.prodPageEyebrow}</p>
          <h1 className="page-title">{L.prodPageTitleA}<span className="grad-word">{L.prodPageTitleWord}</span></h1>
          <p className="page-sub">{L.prodPageSub}</p>
          <div className="cat-tabs" role="tablist">
            <button className={"cat-tab"+(tab==="props"?" is-active":"")} role="tab" aria-selected={tab==="props"} onClick={()=>setTab("props")}>Props</button>
            <button className={"cat-tab"+(tab==="games"?" is-active":"")} role="tab" aria-selected={tab==="games"} onClick={()=>setTab("games")}>Games</button>
          </div>
        </div>
      </section>

      <section className="products page-products">
        <div className="wrap">
          {tab==="props"
            ?<div className="grid">
               {props.map((p:any,i:number)=>(
                 <ProductCard key={p.id} p={p} i={i} lang={lang} addToCart={addToCart} L={L}/>
               ))}
             </div>
            :<div className="grid">
               <article className="card juego-card reveal" data-accent="pink" onClick={goJuego}
                 role="link" tabIndex={0} onKeyDown={(e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); goJuego(); } }}>
                 <div className="card-media juego-card-media">
                   <span className="card-price">${JUEGO_PRECIO}</span>
                   <span className="card-badge">{L.juego.badge}</span>
                   <img src="/landing/juego-cover.webp" alt="Donut Bridge" loading="lazy"/>
                 </div>
                 <div className="card-body">
                   <h3 className="card-title">Donut Bridge</h3>
                   <p className="card-desc">{L.juego.desc}</p>
                   <div className="card-foot">
                     <span className="btn-add">{L.juego.verJuego} <span className="arw">→</span></span>
                   </div>
                 </div>
               </article>
             </div>
          }
        </div>
      </section>

      <NeonFooter L={L} products={props} onProductsLink={()=>goProducts("props")}
        onHow={goHome} onFaq={goFaq} onPolicy={goPolicy}/>
    </div>
  );
}

// ─── FAQ PAGE (neon accordion) ────────────────────────────────────────────────
function FaqPage({products,lang,setLang,cartCount,setCartOpen,goHome,goProducts,goFaq,goPolicy}:any) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [openFaq,setOpenFaq] = useState<number>(-1);
  const L = LT[lang] || LT.en;
  const props = products.filter((p:any)=>p.active!==false && p.category==="Props");

  useEffect(()=>{
    const root=rootRef.current; if(!root) return;
    const io=new IntersectionObserver((es)=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } }),{threshold:0.12,rootMargin:"0px 0px -6% 0px"});
    root.querySelectorAll(".reveal").forEach(el=>io.observe(el));
    return ()=>io.disconnect();
  },[]);

  return (
    <div className="ip-landing" ref={rootRef}>
      <NeonNav solid lang={lang} setLang={setLang} cartCount={cartCount} onCart={()=>setCartOpen(true)}
        onHome={goHome} onProps={()=>goProducts("props")} onGames={()=>goProducts("games")} onFaq={goFaq}/>

      <section className="faq page-faq" id="faq">
        <div className="wrap">
          <div className="sec-head center reveal">
            <p className="kicker">{L.faqKicker}</p>
            <h2 className="sec-title">{L.faqTitleA}<span className="grad">{L.faqTitleMid}</span></h2>
          </div>
          <div className="faq-list faq-page-list">
            {L.faq.map((item:any,i:number)=>(
              <details className="qa reveal" key={i} open={openFaq===i}>
                <summary onClick={(e)=>{e.preventDefault();setOpenFaq(openFaq===i?-1:i);}}>{item.q}<i/></summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <NeonFooter L={L} products={props} onProductsLink={()=>goProducts("props")}
        onHow={goHome} onFaq={goFaq} onPolicy={goPolicy}/>
    </div>
  );
}

// ─── COMPRA DEL JUEGO (Donut Bridge) ──────────────────────────────────────────
// Ruta /comprar-donut-bridge. Aqui aterriza quien intenta abrir /juego sin
// licencia. El pago NO crea la licencia desde el navegador: solo manda el id de
// la orden a /api/comprar, que lo verifica contra PayPal con el secreto del
// servidor. Ese enlace es la llave del comprador, para siempre.
const JUEGO_PRECIO = "9.99";

function GamePage({products,lang,setLang,cartCount,setCartOpen,paypalLoaded,goHome,goProducts,goFaq,goPolicy}:any) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [enlace,setEnlace] = useState<string|null>(null);
  const [error,setError] = useState<string|null>(null);
  const [procesando,setProcesando] = useState(false);
  const [entornoServidor,setEntornoServidor] = useState<string|null>(null);
  const L = LT[lang] || LT.en;
  const G = L.juego;

  // ── Cinturón de seguridad ──────────────────────────────────────────────────
  // El navegador usa VITE_PAYPAL_CLIENT_ID; el servidor usa PAYPAL_ENTORNO. Si
  // no coinciden (p. ej. la variable del navegador quedo sin poner y cae al
  // client-id de produccion mientras el servidor esta en sandbox), un pago de
  // "prueba" cobraria dinero REAL y ademas la licencia nunca se emitiria.
  // Preguntamos el entorno al servidor y, si hay desajuste, NO pintamos botones.
  const clientIdDelEntorno = !!import.meta.env.VITE_PAYPAL_CLIENT_ID;
  const desajustePayPal = entornoServidor === "sandbox" && !clientIdDelEntorno;

  useEffect(()=>{
    fetch("/api/comprar").then(r=>r.json())
      .then(j=>setEntornoServidor(j?.entorno||"desconocido"))
      .catch(()=>setEntornoServidor("desconocido"));
  },[]);
  const props = products.filter((p:any)=>p.active!==false && p.category==="Props");

  useEffect(()=>{
    if(!paypalLoaded || enlace || desajustePayPal || !entornoServidor) return;
    const cont=document.getElementById("paypal-juego-container");
    if(!cont || cont.childNodes.length>0) return;
    (window as any).paypal.Buttons({
      createOrder:(_d:any,actions:any)=>actions.order.create({
        purchase_units:[{description:"Donut Bridge",amount:{value:JUEGO_PRECIO,currency_code:"USD"}}]
      }),
      onApprove:async(data:any)=>{
        setProcesando(true); setError(null);
        try{
          const r=await fetch("/api/comprar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idOrden:data.orderID})});
          const j=await r.json();
          if(j.error) setError(j.error); else setEnlace(j.enlace);
        }catch(e){ setError(G.errorRed); }
        finally{ setProcesando(false); }
      },
      onError:()=>setError(G.errorPago),
      style:{layout:"vertical",color:"black",shape:"rect",label:"pay"}
    }).render("#paypal-juego-container");
  },[paypalLoaded,enlace,desajustePayPal,entornoServidor]);

  return (
    <div className="ip-landing" ref={rootRef}>
      <NeonNav solid lang={lang} setLang={setLang} cartCount={cartCount} onCart={()=>setCartOpen(true)}
        onHome={goHome} onProps={()=>goProducts("props")} onGames={()=>goProducts("games")} onFaq={goFaq}/>

      <section className="juego-page">
        <div className="wrap juego-grid">
          <div className="juego-media">
            <img src="/landing/juego-cover.webp" alt="Donut Bridge" />
          </div>
          <div className="juego-info">
            <p className="page-eyebrow">{G.eyebrow}</p>
            <h1 className="juego-title">Donut <span className="grad-word">Bridge</span></h1>
            <p className="juego-desc">{G.desc}</p>
            <ul className="juego-list">
              {G.bullets.map((b:string,i:number)=><li key={i}>{b}</li>)}
            </ul>

            {enlace ? (
              <div className="juego-ok">
                <div className="juego-ok-badge">✅</div>
                <h3>{G.listoTitulo}</h3>
                <p>{G.listoSub}</p>
                <a className="juego-enlace" href={enlace}>{enlace}</a>
                <a className="btn btn-solid juego-jugar" href={enlace}>{G.jugar} <span className="arw">→</span></a>
                <p className="juego-fine">{G.guarda}</p>
              </div>
            ) : (
              <div className="juego-compra">
                <div className="juego-precio"><span>${JUEGO_PRECIO}</span><small>{G.pagoUnico}</small></div>
                {desajustePayPal ? (
                  <div className="juego-aviso">
                    <strong>⚠️ {G.desajusteTitulo}</strong>
                    <p>{G.desajusteBody}</p>
                  </div>
                ) : (
                  <>
                    {procesando && <p className="juego-fine">{G.procesando}</p>}
                    {error && <p className="juego-error">{error}</p>}
                    <div id="paypal-juego-container"/>
                    {(!paypalLoaded || !entornoServidor) && <p className="juego-fine">{G.cargando}</p>}
                    <p className="juego-fine">{G.acceso}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <NeonFooter L={L} products={props} onProductsLink={()=>goProducts("props")}
        onHow={goHome} onFaq={goFaq} onPolicy={goPolicy}/>
    </div>
  );
}

// ─── RUTAS ────────────────────────────────────────────────────────────────────
// Una direccion por pantalla. Sin esto la barra del navegador se queda en "/"
// pase lo que pase: no se puede compartir un enlace ni funciona el boton atras.
function rutaDeVista(view:string, tab:string){
  switch(view){
    case "products": return tab==="games" ? "/games" : "/props";
    case "faq":      return "/faq";
    case "juego":    return "/comprar-donut-bridge";
    case "login":
    case "admin":    return "/admin";
    case "about":    return "/about";
    case "contact":  return "/contact";
    case "shipping": return "/shipping";
    case "returns":  return "/returns";
    case "warranty": return "/warranty";
    default:         return "/";
  }
}
function vistaDeRuta(pathname:string, hash:string):{view:string,tab?:string}{
  const p = pathname.replace(/\/+$/,"").toLowerCase() || "/";
  if(p==="/props")                              return {view:"products", tab:"props"};
  if(p==="/games")                              return {view:"products", tab:"games"};
  if(p==="/faq")                                return {view:"faq"};
  if(p==="/comprar-donut-bridge")               return {view:"juego"};
  if(p==="/admin"||hash.toLowerCase()==="#admin") return {view:"login"};
  if(p==="/about")                              return {view:"about"};
  if(p==="/contact")                            return {view:"contact"};
  if(p==="/shipping")                           return {view:"shipping"};
  if(p==="/returns")                            return {view:"returns"};
  if(p==="/warranty")                           return {view:"warranty"};
  return {view:"shop"};
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view,setView]=useState("shop");
  const [products,setProducts]=useState(DEFAULT_PRODUCTS as any[]);
  const [orders,setOrders]=useState<any[]>([]);
  const [isOwner,setIsOwner]=useState(false);
  const [lang,setLang]=useState<"en"|"es">("en");
  const [productsTab,setProductsTab]=useState<"props"|"games">("props");
  // ── Cart state lifted to App root so it is shared across every view ──
  const [cart,setCart]=useState<any[]>([]);
  const [cartOpen,setCartOpen]=useState(false);
  const [checkoutOpen,setCheckoutOpen]=useState(false);
  const [toast,setToast]=useState<string|null>(null);
  const paypalLoaded=usePayPal(PAYPAL_CLIENT_ID);
  const t=TR[lang];
  // ── Rutas ──────────────────────────────────────────────────────────────────
  // Cada vista tiene su propia direccion, para que se pueda compartir un enlace,
  // recargar sin perderse y que el boton "atras" del navegador funcione.
  // (El admin no tiene enlace en la web: solo se llega escribiendo /admin.)
  useEffect(()=>{
    const aplicar=()=>{
      const { view:v, tab } = vistaDeRuta(window.location.pathname, window.location.hash);
      setView(v);
      if(tab) setProductsTab(tab as "props"|"games");
    };
    aplicar();
    window.addEventListener("popstate", aplicar);
    return ()=>window.removeEventListener("popstate", aplicar);
  },[]);

  // Al cambiar de vista, actualiza la barra de direcciones.
  useEffect(()=>{
    const destino = rutaDeVista(view, productsTab);
    if(window.location.pathname !== destino){
      try{ window.history.pushState({}, "", destino); }catch(e){ /* noop */ }
    }
  },[view, productsTab]);
  // Session comes from Firebase Auth, so a refresh keeps the owner signed in.
  useEffect(()=>{ onAdminAuth((u:any)=>setIsOwner(!!u)); },[]);
  useEffect(()=>{loadProducts().then(setProducts);loadOrders().then(setOrders);},[]);
  useEffect(()=>{fsListen("orders",setOrders);},[]);
  const persistProducts=useCallback(async(p:any[])=>{setProducts(p);await saveProducts(p);},[]);
  const addOrder=useCallback(async(o:any)=>{await saveOrder(o);setOrders(prev=>[o,...prev]);},[]);

  const cartCount=cart.reduce((s:number,i:any)=>s+i.qty,0);
  const cartTotal=cart.reduce((s:number,i:any)=>s+i.price*i.qty,0);
  function showToast(msg:string){ setToast(msg); setTimeout(()=>setToast(null),2400); }
  function addToCart(p:any){
    setCart(prev=>{ const ex=prev.find(i=>i.id===p.id); return ex?prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i):[...prev,{...p,qty:1}]; });
    showToast(p.name+" added to cart");
  }
  function handleOrderComplete(orderData:any,shipping:any,signText:string,finalTotal:number){
    const extraLetters=signText?Math.max(0,signText.replace(/ /g,"").length-8):0;
    const extraCost=extraLetters*3;
    const orderId="ORD-"+Date.now(), orderDate=new Date().toISOString();
    addOrder({id:orderId,date:orderDate,items:cart,total:finalTotal,shipping,signText:signText||null,signExtraCost:extraCost>0?extraCost:null,paypal:orderData,status:"paid"});
    fetch("https://hook.us2.make.com/mbkm6kji0gsdnebf7wnoa9wojox2yo9h",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event:"order.completed",order_id:orderId,date:orderDate,customer:{name:shipping.name,email:shipping.email,phone:shipping.phone||""},shipping:{address:shipping.address||"",city:shipping.city||"",state:shipping.state||"",zip:shipping.zip||"",country:shipping.country||"US"},items:cart.map((i:any)=>({id:i.id,name:i.name,price:i.price,quantity:i.qty,type:i.type})),sign_text:signText||null,sign_extra_cost:extraCost>0?extraCost:null,subtotal:cartTotal,total:finalTotal,payment_method:"PayPal"})}).catch(e=>console.log("Webhook:",e));
    setCart([]); setCheckoutOpen(false); showToast("Order complete! Thank you.");
  }

  const goHome=()=>{ setView("shop"); window.scrollTo(0,0); };
  const goProducts=(tab:"props"|"games")=>{ setProductsTab(tab); setView("products"); window.scrollTo(0,0); };
  const goFaq=()=>{ setView("faq"); window.scrollTo(0,0); };
  const goJuego=()=>{ setView("juego"); window.scrollTo(0,0); };
  const goPolicy=(type:string)=>{ setView(type); window.scrollTo(0,0); };

  const activeProducts=products.filter((p:any)=>p.active);
  const legacyChrome=!["shop","products","faq","juego"].includes(view);

  return (
    <div style={{minHeight:"100vh",width:"100%",background:BG,color:T1,fontFamily:"'Rajdhani',sans-serif"}}>
      <style>{CSS}</style>
      <div className="scanlines"/>
      {legacyChrome&&<Header view={view} setView={setView} isOwner={isOwner} setIsOwner={setIsOwner} lang={lang} setLang={setLang} t={t}/>}
      <div key={view}>
          {view==="shop"    &&<LandingView products={activeProducts} lang={lang} setLang={setLang} addToCart={addToCart} cartCount={cartCount} setCartOpen={setCartOpen} goProducts={goProducts} goFaq={goFaq} goPolicy={goPolicy}/>}
          {view==="products"&&<ProductsPage products={activeProducts} lang={lang} setLang={setLang} addToCart={addToCart} cartCount={cartCount} setCartOpen={setCartOpen} tab={productsTab} setTab={setProductsTab} goHome={goHome} goProducts={goProducts} goFaq={goFaq} goPolicy={goPolicy} goJuego={goJuego}/>}
          {view==="faq"     &&<FaqPage products={activeProducts} lang={lang} setLang={setLang} cartCount={cartCount} setCartOpen={setCartOpen} goHome={goHome} goProducts={goProducts} goFaq={goFaq} goPolicy={goPolicy}/>}
          {view==="juego"   &&<GamePage products={activeProducts} lang={lang} setLang={setLang} cartCount={cartCount} setCartOpen={setCartOpen} paypalLoaded={paypalLoaded} goHome={goHome} goProducts={goProducts} goFaq={goFaq} goPolicy={goPolicy}/>}
          {view==="about"   &&<AboutView setView={setView} t={t}/>}
          {view==="contact" &&<ContactView setView={setView} t={t}/>}
          {view==="returns" &&<PolicyView type="returns" setView={setView} t={t}/>}
          {view==="warranty"&&<PolicyView type="warranty" setView={setView} t={t}/>}
          {view==="shipping"&&<PolicyView type="shipping" setView={setView} t={t}/>}
          {view==="login"   &&<LoginView onLogin={()=>{setIsOwner(true);setView("admin");}} t={t}/>}
          {view==="admin"&&isOwner&&<AdminView products={products} orders={orders} persistProducts={persistProducts}/>}
      </div>

      {/* CART DRAWER — shared across every view */}
      <AnimatePresence>
        {cartOpen&&(
          <motion.div className="ip-cart-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}} onClick={()=>setCartOpen(false)}>
            <motion.div className="ip-cart" initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",stiffness:380,damping:34}} onClick={e=>e.stopPropagation()}>
              <div className="ip-cart-head"><h3>{t.yourCart}</h3><button className="ip-cart-close" onClick={()=>setCartOpen(false)}>✕</button></div>
              {cart.length===0
                ?<div className="ip-cart-empty"><span style={{fontSize:"2rem"}}>🛒</span><span>{t.cartEmpty}</span></div>
                :<>
                  <div className="ip-cart-body">
                    {cart.map(item=>(
                      <div className="ip-cart-item" key={item.id}>
                        {item.img?<img src={item.img} alt={item.name}/>:<span className="ci-emoji">{item.emoji}</span>}
                        <div style={{flex:1}}><div className="ci-name">{item.name}</div><div className="ci-price">${item.price.toFixed(2)}</div></div>
                        <div className="ip-qty">
                          <button onClick={()=>setCart(c=>c.map(i=>i.id===item.id?{...i,qty:Math.max(0,i.qty-1)}:i).filter(i=>i.qty>0))}>−</button>
                          <span>{item.qty}</span>
                          <button onClick={()=>setCart(c=>c.map(i=>i.id===item.id?{...i,qty:i.qty+1}:i))}>+</button>
                        </div>
                        <span className="ip-cart-line">${(item.price*item.qty).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="ip-cart-foot">
                    <div className="ip-cart-total"><span className="tt">{t.total}</span><span className="tv">${cartTotal.toFixed(2)}</span></div>
                    <button className="ip-checkout-btn" onClick={()=>{setCartOpen(false);setCheckoutOpen(true);}}>{t.checkout}</button>
                  </div>
                </>
              }
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {checkoutOpen&&<CheckoutModal cart={cart} cartTotal={cartTotal} paypalLoaded={paypalLoaded} paypalClientId={PAYPAL_CLIENT_ID} onClose={()=>setCheckoutOpen(false)} onComplete={handleOrderComplete} t={t}/>}

      <AnimatePresence>
        {toast&&<motion.div className="ip-toast" initial={{opacity:0,y:16,x:"-50%"}} animate={{opacity:1,y:0,x:"-50%"}} exit={{opacity:0,y:12,x:"-50%"}} transition={{duration:0.25}}>{toast}</motion.div>}
      </AnimatePresence>
    </div>
  );
}

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function LogoSVG({size=48}:{size?:number}) {
  const [src,setSrc]=useState((window as any).__ipLogo||LOGO_URL);
  useEffect(()=>{
    loadLogo().then(url=>{setSrc(url);(window as any).__ipLogo=url;});
    const iv=setInterval(()=>{const c=(window as any).__ipLogo||LOGO_URL;setSrc((p:string)=>p!==c?c:p);},600);
    return ()=>clearInterval(iv);
  },[]);
  return <img src={src} alt="Interactive Props" style={{width:size,height:size,objectFit:"contain"}}/>;
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({view,setView,isOwner,setIsOwner,lang,setLang,t}:any) {
  const {scrollY}=useScroll();
  const bg=useTransform(scrollY,[0,72],["rgba(5,5,8,0)","rgba(5,5,8,0.96)"]);
  const borderOpacity=useTransform(scrollY,[0,72],[0,1]);
  const navLinks=[["shop",t.shop],["about",t.about],["contact",t.contact]];
  return (
    <motion.header style={{position:"sticky",top:0,zIndex:100,background:bg,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
      <motion.div style={{height:1,background:`rgba(26,41,64,${borderOpacity})`}}/>
      <div style={{maxWidth:1240,margin:"0 auto",padding:"0 32px",height:64,display:"flex",alignItems:"center",gap:24}}>
        <motion.button onClick={()=>{setView("shop");}} style={{background:"none",border:"none",cursor:"pointer",padding:0,flexShrink:0}} whileHover={{scale:1.05}} whileTap={{scale:0.97}}>
          <LogoSVG size={44}/>
        </motion.button>
        <nav style={{display:"flex",gap:2,flex:1,justifyContent:"center"}}>
          {navLinks.map(([v,label])=>(
            <motion.button key={v} onClick={()=>{setView(v);window.scrollTo(0,0);}}
              style={{background:"none",border:"none",cursor:"pointer",padding:"8px 18px",fontSize:11,fontWeight:700,letterSpacing:"0.14em",fontFamily:"'Rajdhani',sans-serif",color:view===v?C:T3,position:"relative"}}
              whileHover={{color:C}} transition={{duration:0.15}}>
              {label}
              {view===v&&<motion.span layoutId="nav-indicator" style={{position:"absolute",bottom:-1,left:"18px",right:"18px",height:1.5,background:C,borderRadius:1}}/>}
            </motion.button>
          ))}
        </nav>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {/* Language toggle */}
          <div style={{display:"flex",border:`1px solid ${BR}`,borderRadius:4,overflow:"hidden"}}>
            {(["en","es"] as const).map(l=>(
              <motion.button key={l} onClick={()=>setLang(l)}
                style={{background:lang===l?(l==="en"?C:P):"transparent",color:lang===l?(l==="en"?"#000":"#fff"):T3,border:"none",padding:"5px 11px",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:11,fontWeight:700,letterSpacing:"0.06em"}}
                whileHover={{opacity:0.9}} whileTap={{scale:0.94}} transition={{duration:0.15}}>
                {l.toUpperCase()}
              </motion.button>
            ))}
          </div>
          {/* No admin entry point anywhere in the UI — the panel is reached only via /admin.
              Once signed in, keep a logout so the owner can end the session. */}
          {isOwner&&(
            <motion.button onClick={()=>{adminSignOut();setIsOwner(false);setView("shop");}} title="Log out" style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:T3,padding:6}} whileHover={{scale:1.15}} whileTap={{scale:0.9}}>🚪</motion.button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
