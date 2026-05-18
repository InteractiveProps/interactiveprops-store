import { useState, useMemo, useEffect, useCallback } from "react";

const OWNER_PASSWORD = "PROPS0326";
const PAYPAL_CLIENT_ID = "AXAyGKDTl6t0rAL_b0irh3eO1VikIYBy5ROUeCEUoPBlKpG9kaiATkFZjYccbDyqcIRQ5kLVFlPRVyNT";

const PRP  = "#a855f7";
const PRP2 = "#7c3aed";
const BG   = "#0a0a0f";
const BG2  = "#111118";
const BG3  = "#1a1a2e";
const BD   = "#1e1e2e";

const CATEGORIES = ["Props", "Effects", "Bundles", "Accessories", "Other"];
const EMOJIS = ["🎈","🔫","🎊","🎉","💜","📦","⚡","🌀","🎯","🔥","💥","🎆","🎇","✨","🌟","💫","🎪","🎭"];

const DEFAULT_PRODUCTS = [
  { id:1, name:"Interactive Pump",        price:89.99,  type:"physical", category:"Props",    desc:"Powerful pump system designed to keep your interactive props running smoothly all night long.", emoji:"🎈", img:null, stock:25, active:true },
  { id:2, name:"Interactive Blaster",     price:129.99, type:"physical", category:"Props",    desc:"High-powered interactive blaster built for big impact. LED effects, long range, endless fun.", emoji:"🔫", img:null, stock:12, active:true },
  { id:3, name:"Interactive Silly String",price:49.99,  type:"physical", category:"Props",    desc:"Interactive silly string that lights up, sprays far, and takes your event to the next level.", emoji:"🎊", img:null, stock:40, active:true },
  { id:4, name:"LED Confetti Cannon",     price:79.99,  type:"physical", category:"Effects",  desc:"Professional confetti cannon with multi-color LED bursts. Perfect for any crowd moment.",      emoji:"🎉", img:null, stock:18, active:true },
  { id:5, name:"Neon Foam Blaster",       price:59.99,  type:"physical", category:"Props",    desc:"UV-reactive foam blaster with neon effects. Glows under blacklight for ultimate impact.",      emoji:"💜", img:null, stock:30, active:true },
  { id:6, name:"Event Starter Pack",      price:199.99, type:"physical", category:"Bundles",  desc:"Everything you need to launch your first event. Includes Pump, Silly String and accessories.", emoji:"📦", img:null, stock:8,  active:true },
];

const TRUST_ITEMS = [
  { ic:"🛡️", t:"PREMIUM QUALITY",  s:"Built to last and perform."  },
  { ic:"⚡",  t:"EASY TO USE",      s:"Plug & play, no hassle."     },
  { ic:"🎧", t:"EXPERT SUPPORT",   s:"We are here to help."        },
  { ic:"🚚", t:"FAST SHIPPING",    s:"Quick delivery worldwide."   },
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
    { q:"What are webhooks?", a:"Webhooks allow your stream alerts, gifts, donations, or events to trigger physical actions in real time — like launching foam darts, spraying silly string, or triggering props during your stream." },
    { q:"Can viewers control the products live?", a:"Yes. Depending on your setup, viewers can trigger products through gifts, donations, channel points, stream events, chat commands, goals, and custom automation tools." },
    { q:"Do your products require Wi-Fi?", a:"Most interactive products require a Wi-Fi connection for live interaction features." },
    { q:"Can multiple products be used together?", a:"Yes. Many streamers combine multiple Interactive Props products to create larger interactive setups and more engaging livestream experiences." },
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

async function loadProducts() {
  try { var r = await window.storage.get("ip-products"); return r ? JSON.parse(r.value) : DEFAULT_PRODUCTS; } catch(e) { return DEFAULT_PRODUCTS; }
}
async function saveProducts(p) { try { await window.storage.set("ip-products", JSON.stringify(p)); } catch(e) {} }
async function loadOrders() {
  try { var r = await window.storage.get("ip-orders"); return r ? JSON.parse(r.value) : []; } catch(e) { return []; }
}
async function saveOrders(o) { try { await window.storage.set("ip-orders", JSON.stringify(o)); } catch(e) {} }

function usePayPal(clientId) {
  const [loaded, setLoaded] = useState(false);
  useEffect(function() {
    if (clientId === "YOUR_PAYPAL_CLIENT_ID") return;
    if (window.paypal) { setLoaded(true); return; }
    var script = document.createElement("script");
    script.src = "https://www.paypal.com/sdk/js?client-id=" + clientId + "&currency=USD";
    script.onload = function() { setLoaded(true); };
    document.body.appendChild(script);
    return function() { try { document.body.removeChild(script); } catch(e) {} };
  }, [clientId]);
  return loaded;
}

export default function App() {
  const [view, setView] = useState("shop");
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [orders, setOrders] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const paypalLoaded = usePayPal(PAYPAL_CLIENT_ID);

  useEffect(function() { loadProducts().then(setProducts); loadOrders().then(setOrders); }, []);

  const persistProducts = useCallback(async function(p) { setProducts(p); await saveProducts(p); }, []);
  const addOrder = useCallback(async function(order) {
    var updated = [order].concat(orders); setOrders(updated); await saveOrders(updated);
  }, [orders]);

  var css = [
    "@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800;900&family=Barlow:wght@400;500;600;700&display=swap');",
    "* { box-sizing: border-box; margin:0; padding:0; }",
    "::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:#0a0a0f} ::-webkit-scrollbar-thumb{background:#7c3aed;border-radius:3px}",
    "@keyframes glow{0%,100%{text-shadow:0 0 20px #a855f7,0 0 40px #7c3aed}50%{text-shadow:0 0 40px #c084fc,0 0 70px #a855f7}}",
    "@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}"
  ].join(" ");

  return (
    <div style={{ minHeight:"100vh", background:BG, fontFamily:"'Barlow',sans-serif", color:"#fff" }}>
      <style>{css}</style>
      <Header view={view} setView={setView} isOwner={isOwner} setIsOwner={setIsOwner} />
      {view === "shop"     && <ShopView products={products.filter(function(p){ return p.active; })} paypalLoaded={paypalLoaded} paypalClientId={PAYPAL_CLIENT_ID} addOrder={addOrder} setView={setView} />}
      {view === "about"    && <AboutView setView={setView} />}
      {view === "contact"  && <ContactView setView={setView} />}
      {view === "faq"      && <FAQView setView={setView} />}
      {view === "returns"  && <PolicyView type="returns" setView={setView} />}
      {view === "warranty" && <PolicyView type="warranty" setView={setView} />}
      {view === "shipping" && <PolicyView type="shipping" setView={setView} />}
      {view === "login"    && <LoginView onLogin={function(){ setIsOwner(true); setView("admin"); }} ownerPassword={OWNER_PASSWORD} />}
      {view === "admin" && isOwner && <AdminView products={products} orders={orders} persistProducts={persistProducts} />}
    </div>
  );
}

function LogoSVG(props) {
  var sz = props.size || 52;
  const [customSrc, setCustomSrc] = useState(window.__ipLogo || null);
  useEffect(function() {
    window.storage.get("ip-logo").then(function(r) {
      if (r) { setCustomSrc(r.value); window.__ipLogo = r.value; }
    }).catch(function(){});
    var interval = setInterval(function() {
      var cur = window.__ipLogo || null;
      setCustomSrc(function(prev) { return prev !== cur ? cur : prev; });
    }, 600);
    return function() { clearInterval(interval); };
  }, []);
  if (customSrc) {
    return (<img src={customSrc} alt="Interactive Props" style={{ width:sz, height:sz, objectFit:"contain" }} />);
  }
  return (
    <svg width={sz} height={sz} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#fff" stroke="#4c1d95" strokeWidth="4"/>
      <text x="50" y="22" textAnchor="middle" fill="#4c1d95" fontSize="10" fontWeight="900" fontFamily="Arial" letterSpacing="2">INTERACTIVE</text>
      <rect x="28" y="26" width="44" height="36" rx="8" fill="#fbbf24" stroke="#4c1d95" strokeWidth="3"/>
      <circle cx="40" cy="41" r="4" fill="#4c1d95"/>
      <circle cx="60" cy="41" r="4" fill="#4c1d95"/>
      <circle cx="32" cy="50" r="8" fill="#f9a8d4" stroke="#4c1d95" strokeWidth="2.5"/>
      <circle cx="30" cy="48" r="2" fill="#fff" opacity="0.6"/>
      <polygon points="50,62 44,70 56,70" fill="#fbbf24" stroke="#4c1d95" strokeWidth="3"/>
      <text x="50" y="86" textAnchor="middle" fill="#4c1d95" fontSize="12" fontWeight="900" fontFamily="Arial" letterSpacing="3">PROPS</text>
    </svg>
  );
}

function Header(props) {
  var view = props.view, setView = props.setView, isOwner = props.isOwner, setIsOwner = props.setIsOwner;
  var hdr = { background:"rgba(10,10,15,0.96)", borderBottom:"1px solid " + BD, position:"sticky", top:0, zIndex:100 };
  var inner = { maxWidth:1200, margin:"0 auto", padding:"0 28px", height:68, display:"flex", alignItems:"center", gap:24 };
  var nl = { background:"none", border:"none", borderBottom:"2px solid transparent", cursor:"pointer", fontSize:12, fontWeight:700, color:"#888", padding:"6px 18px", letterSpacing:2, fontFamily:"'Barlow',sans-serif" };
  var na = { color:"#fff", borderBottom:"2px solid " + PRP };
  return (
    <header style={hdr}>
      <div style={inner}>
        <button style={{ background:"none", border:"none", cursor:"pointer", padding:0, flexShrink:0 }} onClick={function(){ setView("shop"); }}>
          <LogoSVG size={52} />
        </button>
        <nav style={{ display:"flex", gap:2, flex:1, justifyContent:"center" }}>
          <button style={Object.assign({}, nl, view==="shop"    ? na : {})} onClick={function(){ setView("shop"); window.scrollTo(0,0); }}>HOME</button>
          <button style={Object.assign({}, nl, view==="shop"    ? na : {})} onClick={function(){ setView("shop"); window.scrollTo(0,0); }}>SHOP</button>
          <button style={Object.assign({}, nl, view==="about"   ? na : {})} onClick={function(){ setView("about"); window.scrollTo(0,0); }}>ABOUT US</button>
          <button style={Object.assign({}, nl, view==="contact" ? na : {})} onClick={function(){ setView("contact"); window.scrollTo(0,0); }}>CONTACT</button>
        </nav>
        <div style={{ display:"flex", gap:6, alignItems:"center", marginLeft:"auto" }}>
          <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:17, color:"#666", padding:7 }}>🔍</button>
          {isOwner
            ? <span>
                <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:17, color: view==="admin" ? PRP : "#666", padding:7 }} onClick={function(){ setView("admin"); }}>⚙️</button>
                <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:17, color:"#666", padding:7 }} onClick={function(){ setIsOwner(false); setView("shop"); }}>🚪</button>
              </span>
            : <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:17, color:"#666", padding:7 }} onClick={function(){ setView("login"); }}>👤</button>
          }
        </div>
      </div>
    </header>
  );
}

function ShopView(props) {
  var products = props.products, paypalLoaded = props.paypalLoaded, paypalClientId = props.paypalClientId, addOrder = props.addOrder, setView = props.setView;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toast, setToast] = useState(null);

  var allCats = ["All"].concat(Array.from(new Set(products.map(function(p){ return p.category; }))));
  var filtered = useMemo(function() {
    return products.filter(function(p) {
      var ms = p.name.toLowerCase().includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase());
      return ms && (category === "All" || p.category === category);
    });
  }, [products, search, category]);

  var cartCount = cart.reduce(function(s,i){ return s+i.qty; }, 0);
  var cartTotal = cart.reduce(function(s,i){ return s+i.price*i.qty; }, 0);

  function addToCart(product) {
    setCart(function(prev) {
      var ex = prev.find(function(i){ return i.id === product.id; });
      if (ex) return prev.map(function(i){ return i.id === product.id ? Object.assign({}, i, {qty:i.qty+1}) : i; });
      return prev.concat([Object.assign({}, product, {qty:1})]);
    });
    showToast(product.name + " added!");
  }
  function showToast(msg) { setToast(msg); setTimeout(function(){ setToast(null); }, 2200); }
  function handleOrderComplete(orderData, shipping) {
    addOrder({ id:"ORD-"+Date.now(), date:new Date().toISOString(), items:cart, total:cartTotal, shipping:shipping, paypal:orderData, status:"paid" });
    setCart([]); setCheckoutOpen(false); showToast("Order complete! Thank you.");
  }

  var bigBtn = { width:"100%", background:"linear-gradient(135deg,"+PRP2+","+PRP+")", color:"#fff", border:"none", borderRadius:6, padding:"13px 20px", cursor:"pointer", fontWeight:700, fontSize:13, letterSpacing:2 };

  return (
    <span>
      <section style={{ background:BG, minHeight:500, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden", padding:"60px 28px", textAlign:"center" }}>
        <div style={{ position:"absolute", width:800, height:800, borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,0.22) 0%,transparent 70%)", top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none" }} />
        <div style={{ position:"relative", zIndex:2, maxWidth:700 }}>
          <p style={{ fontSize:11, letterSpacing:4, color:PRP, fontWeight:700, marginBottom:20 }}>BRING YOUR STREAMS TO LIFE</p>
          <h1 style={{ display:"flex", flexDirection:"column", gap:2, marginBottom:20 }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:"clamp(42px,5.5vw,72px)", fontWeight:900, lineHeight:1, color:"#fff" }}>INTERACTIVE.</span>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:"clamp(42px,5.5vw,72px)", fontWeight:900, lineHeight:1, color:"#fff" }}>IMMERSIVE.</span>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:"clamp(42px,5.5vw,72px)", fontWeight:900, lineHeight:1, color:PRP, animation:"glow 3s ease-in-out infinite" }}>UNFORGETTABLE.</span>
          </h1>
          <p style={{ fontSize:15, color:"#666", lineHeight:1.7, marginBottom:32 }}>Next-level interactive props that engage, entertain and make every moment unforgettable.</p>
          <button style={{ background:PRP2, color:"#fff", border:"none", borderRadius:4, padding:"13px 32px", fontSize:13, fontWeight:700, cursor:"pointer", letterSpacing:2 }} onClick={function(){ document.getElementById("shop-section").scrollIntoView({ behavior:"smooth" }); }}>SHOP NOW</button>
        </div>
      </section>

      <div style={{ background:BG2, borderTop:"1px solid "+BD, borderBottom:"1px solid "+BD, display:"flex", flexWrap:"wrap" }}>
        {TRUST_ITEMS.map(function(item,i) {
          return (
            <div key={i} style={{ flex:"1 1 220px", display:"flex", alignItems:"center", gap:14, padding:"20px 28px", borderRight:"1px solid "+BD }}>
              <span style={{ fontSize:28 }}>{item.ic}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, letterSpacing:1, color:"#fff", marginBottom:2 }}>{item.t}</div>
                <div style={{ fontSize:12, color:"#555" }}>{item.s}</div>
              </div>
            </div>
          );
        })}
      </div>

      <section id="shop-section" style={{ paddingTop:64, paddingBottom:80 }}>
        <h2 style={{ textAlign:"center", fontFamily:"'Barlow Condensed',sans-serif", fontSize:44, fontWeight:900, letterSpacing:5, color:"#fff" }}>OUR PRODUCTS</h2>
        <div style={{ width:56, height:3, background:"linear-gradient(90deg,"+PRP2+","+PRP+")", margin:"12px auto 40px", borderRadius:2 }} />

        <div style={{ maxWidth:1200, margin:"0 auto 32px", padding:"0 28px", display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
          <input style={{ flex:1, minWidth:200, padding:"10px 18px", borderRadius:6, border:"1px solid "+BD, fontSize:13, background:BG2, outline:"none", color:"#fff", fontFamily:"'Barlow',sans-serif" }} placeholder="Search products..." value={search} onChange={function(e){ setSearch(e.target.value); }} />
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {allCats.map(function(c) {
              return <button key={c} style={{ padding:"7px 16px", borderRadius:4, border:"1px solid "+(category===c ? PRP : BD), background:category===c ? PRP2 : "transparent", cursor:"pointer", fontSize:11, color:category===c ? "#fff" : "#666", fontWeight:700, letterSpacing:1 }} onClick={function(){ setCategory(c); }}>{c}</button>;
            })}
          </div>
          <button style={{ display:"flex", alignItems:"center", gap:8, background:PRP2, color:"#fff", border:"none", borderRadius:6, padding:"9px 20px", cursor:"pointer", fontWeight:700, fontSize:13, letterSpacing:1, marginLeft:"auto" }} onClick={function(){ setCartOpen(true); }}>
            Cart {cartCount > 0 && <span style={{ background:"#f43f5e", borderRadius:"50%", width:20, height:20, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 }}>{cartCount}</span>}
          </button>
        </div>

        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 28px 60px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:24 }}>
          {filtered.length === 0 && <div style={{ gridColumn:"1/-1", textAlign:"center", color:"#444", fontSize:18, padding:60 }}>No products found</div>}
          {filtered.map(function(p) { return <ProductCard key={p.id} product={p} onAdd={function(){ addToCart(p); }} />; })}
        </div>
      </section>

      <footer style={{ background:BG2, borderTop:"1px solid "+BD, paddingTop:60 }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 28px 52px", display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr 1fr 1.4fr", gap:40 }}>
          <div>
            <div style={{ marginBottom:16 }}><LogoSVG size={72} /></div>
            <p style={{ color:"#555", fontSize:13, lineHeight:1.7, maxWidth:240, marginBottom:20 }}>We create interactive experiences that captivate audiences and make every moment unforgettable.</p>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:"#fff", marginBottom:16 }}>SHOP</div>
            <div style={{ fontSize:13, color:"#444", marginBottom:10, cursor:"pointer" }} onClick={function(){ setView("shop"); window.scrollTo(0,0); }}>All Products</div>
            {products.filter(function(p){ return p.active; }).map(function(p) {
              return <div key={p.id} style={{ fontSize:13, color:"#444", marginBottom:10, cursor:"pointer" }} onClick={function(){ setView("shop"); setTimeout(function(){ var el=document.getElementById("p"+p.id); if(el) el.scrollIntoView({behavior:"smooth",block:"center"}); },100); }}>{p.name}</div>;
            })}
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:"#fff", marginBottom:16 }}>COMPANY</div>
            <div style={{ fontSize:13, color:"#444", marginBottom:10, cursor:"pointer" }} onClick={function(){ setView("about"); window.scrollTo(0,0); }}>About Us</div>
            <div style={{ fontSize:13, color:"#444", marginBottom:10, cursor:"pointer" }} onClick={function(){ setView("contact"); window.scrollTo(0,0); }}>Contact</div>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:"#fff", marginBottom:16 }}>SUPPORT</div>
            <div style={{ fontSize:13, color:"#444", marginBottom:10, cursor:"pointer" }} onClick={function(){ setView("shipping"); window.scrollTo(0,0); }}>Shipping & Delivery</div>
            <div style={{ fontSize:13, color:"#444", marginBottom:10, cursor:"pointer" }} onClick={function(){ setView("returns"); window.scrollTo(0,0); }}>Returns & Refunds</div>
            <div style={{ fontSize:13, color:"#444", marginBottom:10, cursor:"pointer" }} onClick={function(){ setView("warranty"); window.scrollTo(0,0); }}>Warranty</div>
            <div style={{ fontSize:13, color:"#444", marginBottom:10, cursor:"pointer" }} onClick={function(){ setView("faq"); window.scrollTo(0,0); }}>FAQs</div>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:"#fff", marginBottom:16 }}>STAY CONNECTED</div>
            <p style={{ color:"#555", fontSize:13, marginBottom:14, lineHeight:1.6 }}>Subscribe for special offers and more.</p>
            <div style={{ display:"flex" }}>
              <input style={{ flex:1, padding:"10px 14px", background:BG3, border:"1px solid "+BD, borderRight:"none", color:"#fff", fontSize:13, borderRadius:"6px 0 0 6px", outline:"none" }} placeholder="Enter your email" />
              <button style={{ background:PRP2, color:"#fff", border:"none", borderRadius:"0 6px 6px 0", padding:"0 16px", cursor:"pointer", fontSize:16 }}>→</button>
            </div>
          </div>
        </div>
        <div style={{ borderTop:"1px solid "+BD, padding:"20px 28px", maxWidth:1200, margin:"0 auto", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12, fontSize:12, color:"#333" }}>
          <span>2024 Interactive Props. All rights reserved.</span>
          <span style={{ color:PRP }}>Made for impact.</span>
          <span>Terms of Service | Privacy Policy</span>
        </div>
      </footer>

      {cartOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200, display:"flex", justifyContent:"flex-end" }} onClick={function(){ setCartOpen(false); }}>
          <div style={{ background:BG2, borderLeft:"1px solid "+BD, width:"100%", maxWidth:400, display:"flex", flexDirection:"column", overflowY:"auto" }} onClick={function(e){ e.stopPropagation(); }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:"1px solid "+BD, position:"sticky", top:0, background:BG2, zIndex:1 }}>
              <span style={{ fontSize:15, fontWeight:800, letterSpacing:3, color:"#fff", fontFamily:"'Barlow Condensed',sans-serif" }}>YOUR CART</span>
              <button style={{ background:"none", border:"none", fontSize:17, cursor:"pointer", color:"#444" }} onClick={function(){ setCartOpen(false); }}>X</button>
            </div>
            {cart.length === 0
              ? <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#444", fontSize:15 }}>Your cart is empty</div>
              : <span>
                  <div style={{ flex:1, overflowY:"auto", padding:"16px 22px" }}>
                    {cart.map(function(item) {
                      return (
                        <div key={item.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                          {item.img ? <img src={item.img} alt={item.name} style={{ width:40, height:40, objectFit:"contain", borderRadius:6 }} /> : <span style={{ fontSize:26 }}>{item.emoji}</span>}
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:600, fontSize:13, color:"#fff" }}>{item.name}</div>
                            <div style={{ color:"#666", fontSize:12 }}>${item.price}</div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <button style={{ width:26, height:26, borderRadius:4, border:"1px solid "+BD, background:BG3, cursor:"pointer", fontSize:14, color:"#aaa" }} onClick={function(){ setCart(function(c){ return c.map(function(i){ return i.id===item.id ? Object.assign({},i,{qty:Math.max(0,i.qty-1)}) : i; }).filter(function(i){ return i.qty>0; }); }); }}>-</button>
                            <span style={{ color:"#fff", fontWeight:700, minWidth:16, textAlign:"center" }}>{item.qty}</span>
                            <button style={{ width:26, height:26, borderRadius:4, border:"1px solid "+BD, background:BG3, cursor:"pointer", fontSize:14, color:"#aaa" }} onClick={function(){ setCart(function(c){ return c.map(function(i){ return i.id===item.id ? Object.assign({},i,{qty:i.qty+1}) : i; }); }); }}>+</button>
                          </div>
                          <span style={{ color:PRP, fontWeight:700, minWidth:52, textAlign:"right" }}>${(item.price*item.qty).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding:"16px 22px", borderTop:"1px solid "+BD }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                      <span style={{ color:"#aaa", fontWeight:600 }}>Total</span>
                      <span style={{ color:PRP, fontSize:22, fontWeight:800 }}>${cartTotal.toFixed(2)}</span>
                    </div>
                    <button style={bigBtn} onClick={function(){ setCartOpen(false); setCheckoutOpen(true); }}>CHECKOUT</button>
                  </div>
                </span>
            }
          </div>
        </div>
      )}

      {checkoutOpen && <CheckoutModal cart={cart} cartTotal={cartTotal} paypalLoaded={paypalLoaded} paypalClientId={paypalClientId} onClose={function(){ setCheckoutOpen(false); }} onComplete={handleOrderComplete} />}
      {toast && <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", background:"linear-gradient(135deg,"+PRP2+","+PRP+")", color:"#fff", padding:"11px 28px", borderRadius:30, fontSize:13, fontWeight:700, zIndex:999, whiteSpace:"nowrap", letterSpacing:1 }}>{toast}</div>}
    </span>
  );
}

function ProductCard(props) {
  var p = props.product, onAdd = props.onAdd;
  const [hov, setHov] = useState(false);
  return (
    <div id={"p"+p.id} style={{ background:BG3, border:"1px solid "+(hov ? PRP : BD), borderRadius:12, overflow:"hidden", display:"flex", flexDirection:"column", transition:"border-color 0.2s,transform 0.2s,box-shadow 0.2s", transform:hov ? "translateY(-5px)" : "none", boxShadow:hov ? "0 20px 60px rgba(124,58,237,0.2)" : "none" }} onMouseEnter={function(){ setHov(true); }} onMouseLeave={function(){ setHov(false); }}>
      <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center", background:"radial-gradient(ellipse at center,rgba(124,58,237,0.18) 0%,"+BG3+" 70%)", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at center,rgba(124,58,237,0.12),transparent 65%)" }} />
        <span style={{ position:"absolute", top:12, left:12, background:"rgba(124,58,237,0.25)", border:"1px solid "+PRP, color:PRP, fontSize:9, fontWeight:700, letterSpacing:2, borderRadius:4, padding:"3px 10px" }}>{p.category.toUpperCase()}</span>
        {p.img
          ? <img src={p.img} alt={p.name} style={{ height:155, maxWidth:"90%", objectFit:"contain", position:"relative", zIndex:1, filter:"drop-shadow(0 0 20px rgba(168,85,247,0.4))" }} />
          : <span style={{ fontSize:80, filter:"drop-shadow(0 0 20px rgba(168,85,247,0.5))", position:"relative", zIndex:1 }}>{p.emoji}</span>
        }
      </div>
      <div style={{ padding:"18px 20px 10px", flex:1 }}>
        <div style={{ fontSize:11, color:PRP2, letterSpacing:3, fontWeight:700, marginBottom:4 }}>INTERACTIVE</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:900, color:PRP, letterSpacing:1, marginBottom:8, lineHeight:1.1, WebkitTextStroke:"1px #fff", textShadow:"0 0 0 #fff" }}>{p.name.replace("Interactive ","").toUpperCase()}</div>
        <div style={{ fontSize:13, color:"#666", lineHeight:1.6 }}>{p.desc}</div>
        {p.stock < 15 && <div style={{ fontSize:11, color:"#f43f5e", fontWeight:600, marginTop:8 }}>Only {p.stock} left</div>}
      </div>
      <div style={{ padding:"14px 20px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", borderTop:"1px solid "+BD }}>
        <span style={{ fontSize:26, fontWeight:800, color:"#fff" }}>${p.price}</span>
        <button style={{ background:hov ? PRP2 : "transparent", color:hov ? "#fff" : PRP, border:"1.5px solid "+(hov ? PRP2 : PRP), borderRadius:4, padding:"9px 18px", cursor:"pointer", fontWeight:700, fontSize:11, letterSpacing:1, transition:"all 0.2s" }} onClick={onAdd}>ADD TO CART</button>
      </div>
    </div>
  );
}

function CheckoutModal(props) {
  var cart = props.cart, cartTotal = props.cartTotal, paypalLoaded = props.paypalLoaded, paypalClientId = props.paypalClientId, onClose = props.onClose, onComplete = props.onComplete;
  const [step, setStep] = useState("shipping");
  const [shipping, setShipping] = useState({ name:"", email:"", phone:"", address:"", city:"", state:"", zip:"", country:"US" });
  const [errors, setErrors] = useState({});
  var hasPhysical = cart.some(function(i){ return i.type === "physical"; });
  var bigBtn = { width:"100%", background:"linear-gradient(135deg,"+PRP2+","+PRP+")", color:"#fff", border:"none", borderRadius:6, padding:"13px 20px", cursor:"pointer", fontWeight:700, fontSize:13, letterSpacing:2 };
  var inp = { padding:"10px 14px", borderRadius:6, border:"1px solid "+BD, fontSize:13, outline:"none", width:"100%", background:BG3, color:"#fff", fontFamily:"'Barlow',sans-serif" };

  function validate() {
    var e = {};
    if (!shipping.name.trim()) e.name = "Required";
    if (!shipping.email.trim() || !shipping.email.includes("@")) e.email = "Valid email required";
    if (hasPhysical) {
      if (!shipping.address.trim()) e.address = "Required";
      if (!shipping.city.trim()) e.city = "Required";
      if (!shipping.zip.trim()) e.zip = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  useEffect(function() {
    if (step !== "payment" || !paypalLoaded || paypalClientId === "YOUR_PAYPAL_CLIENT_ID") return;
    var container = document.getElementById("paypal-btn-container");
    if (!container || container.childNodes.length > 0) return;
    window.paypal.Buttons({
      createOrder: function(data, actions) { return actions.order.create({ purchase_units:[{ amount:{ value:cartTotal.toFixed(2) } }] }); },
      onApprove: async function(data, actions) { var order = await actions.order.capture(); onComplete(order, shipping); setStep("done"); },
      onError: function() { alert("Payment failed. Please try again."); },
      style: { layout:"vertical", color:"black", shape:"rect", label:"pay" },
    }).render("#paypal-btn-container");
  }, [step, paypalLoaded]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200, display:"flex", justifyContent:"center", alignItems:"center" }} onClick={onClose}>
      <div style={{ background:BG2, border:"1px solid "+BD, width:"100%", maxWidth:520, margin:"auto", borderRadius:16, maxHeight:"92vh", overflowY:"auto" }} onClick={function(e){ e.stopPropagation(); }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:"1px solid "+BD, position:"sticky", top:0, background:BG2, zIndex:1 }}>
          <span style={{ fontSize:15, fontWeight:800, letterSpacing:3, color:"#fff", fontFamily:"'Barlow Condensed',sans-serif" }}>{step==="done" ? "ORDER CONFIRMED!" : step==="payment" ? "PAYMENT" : "CHECKOUT"}</span>
          <button style={{ background:"none", border:"none", fontSize:17, cursor:"pointer", color:"#444" }} onClick={onClose}>X</button>
        </div>

        <div style={{ margin:"16px 24px 0", background:BG3, borderRadius:10, padding:"14px 18px", border:"1px solid "+BD }}>
          {cart.map(function(i) {
            return <div key={i.id} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"3px 0", color:"#888" }}><span>{i.emoji} {i.name} x{i.qty}</span><span style={{ color:PRP, fontWeight:700 }}>${(i.price*i.qty).toFixed(2)}</span></div>;
          })}
          <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, borderTop:"1px solid "+BD, paddingTop:10, marginTop:6 }}>
            <span style={{ color:"#fff" }}>Total</span><span style={{ color:PRP, fontSize:18 }}>${cartTotal.toFixed(2)}</span>
          </div>
        </div>

        {step === "shipping" && (
          <div style={{ padding:"20px 24px 28px", display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>
                Full Name *
                <input style={Object.assign({}, inp, errors.name ? { border:"1px solid #f43f5e" } : {})} value={shipping.name} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{name:e.target.value}); }); }} placeholder="Jane Smith" />
                {errors.name && <span style={{ color:"#f43f5e", fontSize:11 }}>{errors.name}</span>}
              </label>
              <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>
                Email *
                <input style={Object.assign({}, inp, errors.email ? { border:"1px solid #f43f5e" } : {})} type="email" value={shipping.email} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{email:e.target.value}); }); }} placeholder="jane@email.com" />
                {errors.email && <span style={{ color:"#f43f5e", fontSize:11 }}>{errors.email}</span>}
              </label>
            </div>
            <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>
              Phone
              <input style={inp} value={shipping.phone} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{phone:e.target.value}); }); }} placeholder="+1 555 000 0000" />
            </label>
            {hasPhysical && (
              <span>
                <div style={{ fontSize:11, letterSpacing:2, color:PRP, fontWeight:700, marginBottom:8 }}>SHIPPING ADDRESS</div>
                <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1, marginBottom:12 }}>
                  Street Address *
                  <input style={Object.assign({}, inp, errors.address ? { border:"1px solid #f43f5e" } : {})} value={shipping.address} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{address:e.target.value}); }); }} placeholder="123 Main St" />
                </label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
                  <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>City *<input style={inp} value={shipping.city} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{city:e.target.value}); }); }} placeholder="New York" /></label>
                  <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>State<input style={inp} value={shipping.state} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{state:e.target.value}); }); }} placeholder="NY" /></label>
                  <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>ZIP *<input style={inp} value={shipping.zip} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{zip:e.target.value}); }); }} placeholder="10001" /></label>
                </div>
                <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>
                  Country
                  <select style={inp} value={shipping.country} onChange={function(e){ setShipping(function(s){ return Object.assign({},s,{country:e.target.value}); }); }}>
                    <option value="US">United States</option><option value="CA">Canada</option><option value="GB">United Kingdom</option><option value="AU">Australia</option><option value="OTHER">Other</option>
                  </select>
                </label>
              </span>
            )}
            <button style={bigBtn} onClick={function(){ if(validate()) setStep("payment"); }}>CONTINUE TO PAYMENT</button>
          </div>
        )}

        {step === "payment" && (
          <div style={{ padding:"20px 24px 28px" }}>
            <div style={{ marginBottom:16, fontSize:13, color:"#666" }}>Paying as <span style={{ color:PRP }}>{shipping.email}</span></div>
            {paypalClientId === "YOUR_PAYPAL_CLIENT_ID"
              ? <div style={{ background:BG3, border:"1px solid "+BD, borderRadius:12, padding:"28px 24px", textAlign:"center" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🔑</div>
                  <div style={{ fontWeight:700, color:"#fff", marginBottom:10 }}>PayPal Not Configured</div>
                  <div style={{ fontSize:13, color:"#666", lineHeight:1.8 }}>1. Create a PayPal Business account<br />2. Go to developer.paypal.com<br />3. Replace YOUR_PAYPAL_CLIENT_ID at the top of the file</div>
                  <button style={Object.assign({}, bigBtn, {marginTop:20})} onClick={function(){ onComplete({demo:true}, shipping); setStep("done"); }}>SIMULATE ORDER (DEMO)</button>
                </div>
              : <div id="paypal-btn-container" />
            }
            <button style={Object.assign({}, bigBtn, {background:"transparent", border:"1px solid "+BD, color:"#666", marginTop:12})} onClick={function(){ setStep("shipping"); }}>Back</button>
          </div>
        )}

        {step === "done" && (
          <div style={{ padding:"48px 32px", textAlign:"center" }}>
            <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
            <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:34, color:"#fff", letterSpacing:3, marginBottom:10 }}>THANK YOU!</h2>
            <p style={{ color:"#666", fontSize:14, lineHeight:1.8, marginBottom:32 }}>Confirmation sent to <span style={{ color:PRP }}>{shipping.email}</span>.</p>
            <button style={bigBtn} onClick={onClose}>KEEP SHOPPING</button>
          </div>
        )}
      </div>
    </div>
  );
}

function PageShell(props) {
  var title = props.title, setView = props.setView, children = props.children;
  return (
    <div style={{ background:BG, minHeight:"calc(100vh - 68px)", padding:"60px 28px" }}>
      <div style={{ maxWidth:820, margin:"0 auto" }}>
        <button onClick={function(){ setView("shop"); window.scrollTo(0,0); }} style={{ background:"none", border:"none", color:PRP2, cursor:"pointer", fontSize:13, fontWeight:700, letterSpacing:2, marginBottom:32 }}>BACK TO SHOP</button>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:40 }}>
          <div style={{ width:4, height:48, background:"linear-gradient(180deg,"+PRP2+","+PRP+")", borderRadius:2 }} />
          <h1 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:48, fontWeight:900, letterSpacing:4, color:"#fff" }}>{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function AboutView(props) {
  var setView = props.setView;
  return (
    <PageShell title="ABOUT US" setView={setView}>
      <div style={{ background:BG2, border:"1px solid "+BD, borderRadius:16, padding:"40px 48px", lineHeight:1.9 }}>
        <p style={{ fontSize:18, color:PRP, fontWeight:700, marginBottom:24, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 }}>Welcome to Interactive Props — where streaming becomes truly interactive.</p>
        <p style={{ color:"#aaa", fontSize:15, marginBottom:20 }}>We created Interactive Props with one goal in mind: to help streamers turn their content into unforgettable live experiences. As creators ourselves, we know how hard it can be to keep streams exciting, stand out from thousands of channels, and create moments that viewers actually remember.</p>
        <p style={{ color:"#aaa", fontSize:15, marginBottom:20 }}>From the Interactive Blaster firing foam darts during live events, to the Interactive Silly String launching chaos on stream, and the Interactive Pump creating hilarious audience-triggered moments, every product is designed to connect your viewers directly to your stream in a physical, real-life way.</p>
        <p style={{ color:"#aaa", fontSize:15, marginBottom:20 }}>Our products work with livestream platforms, webhooks, goals, donations, gifts, and custom triggers, allowing viewers to become part of the show instead of just watching it.</p>
        <p style={{ color:"#aaa", fontSize:15, marginBottom:16 }}>We focus on:</p>
        <ul style={{ color:"#aaa", fontSize:15, paddingLeft:24, marginBottom:24, lineHeight:2.2 }}>
          <li>Easy setup for streamers</li>
          <li>Real-time audience interaction</li>
          <li>Unique stream moments that increase engagement</li>
          <li>Reliable integrations with modern streaming tools</li>
          <li>Products built specifically for content creators</li>
        </ul>
        <p style={{ color:PRP, fontSize:16, fontWeight:700, fontStyle:"italic" }}>Because streaming should be more than watching. It should be interactive.</p>
      </div>
      <div style={{ marginTop:40, textAlign:"center" }}>
        <button style={{ background:"linear-gradient(135deg,"+PRP2+","+PRP+")", color:"#fff", border:"none", borderRadius:6, padding:"14px 40px", cursor:"pointer", fontWeight:700, fontSize:14, letterSpacing:2 }} onClick={function(){ props.setView("shop"); }}>SHOP NOW</button>
      </div>
    </PageShell>
  );
}

function ContactView(props) {
  var setView = props.setView;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  var inp = { padding:"10px 14px", borderRadius:6, border:"1px solid "+BD, fontSize:13, outline:"none", width:"100%", background:BG3, color:"#fff", fontFamily:"'Barlow',sans-serif" };
  var bigBtn = { width:"100%", background:"linear-gradient(135deg,"+PRP2+","+PRP+")", color:"#fff", border:"none", borderRadius:6, padding:"13px 20px", cursor:"pointer", fontWeight:700, fontSize:13, letterSpacing:2 };
  return (
    <PageShell title="CONTACT US" setView={setView}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:28 }}>
        <div style={{ background:BG2, border:"1px solid "+BD, borderRadius:16, padding:"36px 32px" }}>
          <p style={{ color:"#aaa", fontSize:15, lineHeight:1.9, marginBottom:20 }}>Have questions about our products, setup help, partnerships, or your order? We would love to hear from you.</p>
          <p style={{ color:"#aaa", fontSize:15, lineHeight:1.9, marginBottom:20 }}>At Interactive Props, we are passionate about helping creators build unforgettable interactive streaming experiences.</p>
          <div style={{ background:BG3, border:"1px solid "+PRP2, borderRadius:12, padding:"20px 24px", marginBottom:24 }}>
            <div style={{ fontSize:11, letterSpacing:3, color:PRP2, fontWeight:700, marginBottom:8 }}>REACH US DIRECTLY</div>
            <div style={{ fontSize:16, color:PRP, fontWeight:700 }}>interactiveprops.official@gmail.com</div>
          </div>
          <p style={{ color:"#666", fontSize:13, lineHeight:1.8 }}>We aim to respond as quickly as possible. Please include your order number if applicable.</p>
          <p style={{ color:"#555", fontSize:13, lineHeight:1.8, marginTop:16, fontStyle:"italic" }}>Thank you for supporting Interactive Props and being part of the future of interactive streaming.</p>
        </div>
        <div style={{ background:BG2, border:"1px solid "+BD, borderRadius:16, padding:"36px 32px" }}>
          {sent
            ? <div style={{ textAlign:"center", padding:"40px 0" }}>
                <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
                <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, color:"#fff", letterSpacing:2, marginBottom:10 }}>MESSAGE SENT!</h3>
                <p style={{ color:"#888", fontSize:14, lineHeight:1.7 }}>Thanks! We will get back to you at <span style={{ color:PRP }}>{email}</span>.</p>
                <button style={Object.assign({}, bigBtn, {marginTop:24})} onClick={function(){ setSent(false); setName(""); setEmail(""); setMsg(""); }}>Send Another</button>
              </div>
            : <span>
                <div style={{ fontSize:11, letterSpacing:3, color:PRP2, fontWeight:700, marginBottom:20 }}>SEND US A MESSAGE</div>
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>YOUR NAME<input style={inp} value={name} onChange={function(e){ setName(e.target.value); }} placeholder="Jane Smith" /></label>
                  <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>EMAIL ADDRESS<input style={inp} type="email" value={email} onChange={function(e){ setEmail(e.target.value); }} placeholder="jane@email.com" /></label>
                  <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>MESSAGE<textarea style={Object.assign({}, inp, {minHeight:130, resize:"vertical"})} value={msg} onChange={function(e){ setMsg(e.target.value); }} placeholder="Tell us how we can help..." /></label>
                  <button style={bigBtn} onClick={function(){ if(name && email && msg) setSent(true); }}>SEND MESSAGE</button>
                  <p style={{ color:"#444", fontSize:11, textAlign:"center" }}>Or email us directly at interactiveprops.official@gmail.com</p>
                </div>
              </span>
          }
        </div>
      </div>
    </PageShell>
  );
}

function FAQView(props) {
  var setView = props.setView;
  const [open, setOpen] = useState(null);
  var idx = 0;
  return (
    <PageShell title="FAQs" setView={setView}>
      <p style={{ color:"#555", fontSize:14, marginBottom:48 }}>Everything you need to know about Interactive Props.</p>
      {FAQ_DATA.map(function(section) {
        return (
          <div key={section.category} style={{ marginBottom:40 }}>
            <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:800, letterSpacing:3, color:PRP, textTransform:"uppercase", marginBottom:16 }}>{section.category}</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              {section.items.map(function(item) {
                var myIdx = idx++;
                var isOpen = open === myIdx;
                return (
                  <div key={myIdx} style={{ background:isOpen ? "#16162a" : BG2, border:"1px solid "+(isOpen ? PRP2 : BD), borderRadius:10, overflow:"hidden" }}>
                    <button onClick={function(){ setOpen(isOpen ? null : myIdx); }} style={{ width:"100%", background:"none", border:"none", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", gap:12, textAlign:"left" }}>
                      <span style={{ fontSize:14, fontWeight:600, color:isOpen ? "#fff" : "#ccc", lineHeight:1.4 }}>{item.q}</span>
                      <span style={{ color:PRP2, fontSize:18, flexShrink:0, fontWeight:700 }}>{isOpen ? "-" : "+"}</span>
                    </button>
                    {isOpen && (
                      <div style={{ padding:"0 20px 18px", borderTop:"1px solid "+BD }}>
                        <p style={{ color:"#888", fontSize:14, lineHeight:1.8, marginTop:14 }}>{item.a}</p>
                        {item.link && <button onClick={function(){ setView(item.link); }} style={{ marginTop:10, background:"none", border:"none", color:PRP, cursor:"pointer", fontSize:13, fontWeight:700, letterSpacing:1, padding:0 }}>View full policy</button>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{ background:BG2, border:"1px solid "+BD, borderRadius:14, padding:"28px 32px", textAlign:"center", marginTop:20 }}>
        <p style={{ color:"#888", fontSize:14, marginBottom:16 }}>Still have questions? We are happy to help.</p>
        <button style={{ background:"linear-gradient(135deg,"+PRP2+","+PRP+")", color:"#fff", border:"none", borderRadius:6, padding:"12px 36px", cursor:"pointer", fontWeight:700, fontSize:14, letterSpacing:2 }} onClick={function(){ setView("contact"); }}>CONTACT US</button>
      </div>
    </PageShell>
  );
}

function PolicyView(props) {
  var type = props.type, setView = props.setView;
  var title = type === "returns" ? "RETURNS & REFUNDS" : type === "warranty" ? "WARRANTY POLICY" : "SHIPPING & DELIVERY";
  var sections = type === "shipping" ? [
    { h:null, b:"At Interactive Props, we work hard to process and ship orders as quickly and safely as possible so you can start creating unforgettable interactive stream moments." },
    { h:"Order Processing", b:"Most orders are processed within 2 to 5 business days. Some products may require additional processing time due to customization, testing, or high demand. Once your order has been processed and shipped, you will receive a confirmation email with tracking information." },
    { h:"Shipping Times", b:"Estimated delivery times may vary depending on:", bullets:["Product availability","Customization requirements","Shipping carrier delays","Destination location"], footer:"Domestic orders typically arrive within 3 to 10 business days after shipment, while international delivery times may vary by country." },
    { h:"International Shipping", b:"We may offer international shipping to select countries. Customers are responsible for any customs fees, import taxes, duties, or additional charges required by their country. International delivery times may be longer depending on customs processing and local carriers." },
    { h:"Tracking Information", b:"Tracking details will be sent to the email provided during checkout once your order ships. Please allow time for tracking information to update after shipment." },
    { h:"Incorrect Addresses", b:"Customers are responsible for providing accurate shipping information. Interactive Props is not responsible for delays, lost packages, or additional shipping charges caused by incorrect or incomplete addresses." },
    { h:"Delayed or Lost Packages", b:"While we do our best to ensure timely delivery, shipping delays may occasionally occur due to carriers, weather, customs, or other circumstances outside of our control. If your package appears lost or significantly delayed, please contact us and we will do our best to assist you." },
    { h:"Damaged Deliveries", b:"If your order arrives damaged, please contact us within 48 hours of delivery with photos of the packaging and product so we can help resolve the issue quickly." },
  ] : type === "returns" ? [
    { h:null, b:"At Interactive Props, we want you to be happy with your purchase. Because many of our products are electronic, customized, or designed specifically for streaming setups, please review our return and refund policy carefully before placing an order." },
    { h:"Return Eligibility", b:"We accept returns within 14 days of delivery for unused items in their original condition and packaging.", bullets:["The item must not show signs of use, damage, or modification","Proof of purchase is required"] },
    { h:"Non-Returnable Items", b:"The following items are non-refundable unless they arrive damaged or defective:", bullets:["Customized or made-to-order products","Modified electronic devices","Digital downloads or software"] },
    { h:"Damaged or Defective Products", b:"If your order arrives damaged or defective, please contact us within 48 hours of delivery with:", bullets:["Your order number","Photos or videos showing the issue","A brief description of the problem"], footer:"We will review the issue and offer a replacement, repair, store credit, or refund depending on the situation." },
    { h:"Refund Process", b:"Once we receive and inspect the returned item, we will notify you. Approved refunds are issued back to the original payment method within 5 to 10 business days. Original shipping costs are non-refundable unless the return is due to our error." },
    { h:"Return Shipping", b:"Customers are responsible for return shipping costs unless the product arrived damaged or incorrect. We recommend using a tracked shipping service." },
    { h:"Order Cancellations", b:"Orders may only be canceled before they are processed or shipped." },
    { h:"Contact Us", b:"If you have any questions about returns or refunds, please contact us through the contact page on our website." },
  ] : [
    { h:null, b:"At Interactive Props, we stand behind the quality of our products. Our products are designed and tested for streaming environments and interactive entertainment use." },
    { h:"Limited Warranty Coverage", b:"All eligible Interactive Props products include a limited 90-day warranty from the date of delivery against manufacturing defects under normal use. This warranty covers:", bullets:["Electrical or hardware failures caused by manufacturing defects","Internal component issues not caused by misuse","Defective assembly or workmanship","Products that stop functioning under normal operating conditions"] },
    { h:"What Is Not Covered", b:"This warranty does not cover:", bullets:["Damage caused by misuse, abuse, accidents, drops, or improper handling","Damage caused by liquids, fire, excessive heat, or unauthorized modifications","Normal cosmetic wear and tear","User modifications, repairs, or disassembly","Consumable or refillable materials","Software, third-party integrations, or external streaming platform issues"] },
    { h:"Warranty Claims", b:"To submit a warranty claim, please contact us with:", bullets:["Your order number","A description of the issue","Photos or videos showing the problem","Any troubleshooting steps already attempted"] },
    { h:"Resolution Options", b:"If a product is determined to be defective under warranty, Interactive Props may choose to:", bullets:["Repair the product","Replace the product with the same or equivalent model","Issue store credit","Provide a partial or full refund if replacement is not possible"] },
    { h:"Warranty Limitations", b:"This warranty is limited to the original purchaser and is non-transferable. Interactive Props is not responsible for indirect, incidental, or consequential damages. By using our products, customers agree to operate them responsibly and follow all provided safety instructions." },
    { h:"Contact Us", b:"For warranty support, please contact us through our website contact page." },
  ];
  return (
    <PageShell title={title} setView={setView}>
      <div style={{ background:BG2, border:"1px solid "+BD, borderRadius:16, padding:"40px 48px" }}>
        {sections.map(function(sec, i) {
          return (
            <div key={i} style={{ marginBottom:32 }}>
              {sec.h && <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:800, color:PRP, letterSpacing:2, marginBottom:12, textTransform:"uppercase" }}>{sec.h}</h2>}
              {sec.b && <p style={{ color:"#aaa", fontSize:14, lineHeight:1.9, marginBottom:12 }}>{sec.b}</p>}
              {sec.bullets && <ul style={{ color:"#aaa", fontSize:14, paddingLeft:24, marginBottom:12, lineHeight:2.1 }}>{sec.bullets.map(function(b,j){ return <li key={j}>{b}</li>; })}</ul>}
              {sec.footer && <p style={{ color:"#aaa", fontSize:14, lineHeight:1.9 }}>{sec.footer}</p>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:40, textAlign:"center" }}>
        <button style={{ background:"linear-gradient(135deg,"+PRP2+","+PRP+")", color:"#fff", border:"none", borderRadius:6, padding:"14px 40px", cursor:"pointer", fontWeight:700, fontSize:14, letterSpacing:2 }} onClick={function(){ setView("shop"); }}>BACK TO SHOP</button>
      </div>
    </PageShell>
  );
}

function LoginView(props) {
  var onLogin = props.onLogin, ownerPassword = props.ownerPassword;
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  function handle() {
    if (pw.trim() === ownerPassword) { onLogin(); }
    else { setErr(true); setTimeout(function(){ setErr(false); }, 1800); }
  }
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"calc(100vh - 68px)", background:BG, padding:24 }}>
      <div style={{ background:BG2, border:"1px solid "+BD, borderRadius:16, padding:"48px 40px", maxWidth:380, width:"100%", textAlign:"center", boxShadow:"0 0 80px rgba(124,58,237,0.15)" }}>
        <LogoSVG size={80} />
        <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:38, letterSpacing:4, color:"#fff", marginBottom:6, marginTop:16 }}>LOGIN</h2>
        <p style={{ color:"#555", fontSize:13, marginBottom:28 }}>Enter your password to manage the store.</p>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <input type="password" style={{ padding:"10px 14px", borderRadius:6, border:"1px solid "+(err ? "#f43f5e" : BD), fontSize:18, letterSpacing:6, textAlign:"center", outline:"none", width:"100%", background:BG3, color:"#fff" }}
            placeholder="password" value={pw} onChange={function(e){ setPw(e.target.value); }} onKeyDown={function(e){ if(e.key==="Enter") handle(); }} autoFocus />
          {err && <div style={{ color:"#f43f5e", fontSize:13 }}>Incorrect password</div>}
          <button style={{ width:"100%", background:"linear-gradient(135deg,"+PRP2+","+PRP+")", color:"#fff", border:"none", borderRadius:6, padding:"13px 20px", cursor:"pointer", fontWeight:700, fontSize:13, letterSpacing:2 }} onClick={handle}>LOGIN</button>
        </div>
        <p style={{ marginTop:20, fontSize:11, color:"#333" }}></p>
      </div>
    </div>
  );
}

function AdminView(props) {
  var products = props.products, orders = props.orders, persistProducts = props.persistProducts;
  const [tab, setTab] = useState("products");
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(null);
  const [toast, setToast] = useState(null);
  const [logoSrc, setLogoSrc] = useState(null);
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(function() {
    window.storage.get("ip-logo").then(function(r) {
      if (r) { setLogoSrc(r.value); window.__ipLogo = r.value; }
    }).catch(function(){});
  }, []);

  function saveLogo(src) {
    setLogoSrc(src);
    window.__ipLogo = src;
    window.storage.set("ip-logo", src).catch(function(){});
    st("Logo updated!");
  }
  function removeLogo() {
    setLogoSrc(null);
    window.__ipLogo = null;
    window.storage.delete("ip-logo").catch(function(){});
    st("Logo removed");
  }

  function st(msg) { setToast(msg); setTimeout(function(){ setToast(null); }, 2000); }
  function sideActive(id) { return tab===id || (tab==="add" && id==="products") || (tab==="edit" && id==="products"); }

  function saveForm() {
    if (!form.name.trim() || !form.price) { st("Name and price required"); return; }
    var updated;
    if (editId) { updated = products.map(function(p){ return p.id===editId ? Object.assign({},form,{price:Number(form.price),stock:Number(form.stock)}) : p; }); st("Updated!"); }
    else { updated = products.concat([Object.assign({},form,{price:Number(form.price),stock:Number(form.stock)})]); st("Added!"); }
    persistProducts(updated); setTab("products"); setForm(null); setEditId(null);
  }

  var bigBtn = { background:"linear-gradient(135deg,"+PRP2+","+PRP+")", color:"#fff", border:"none", borderRadius:6, padding:"13px 20px", cursor:"pointer", fontWeight:700, fontSize:13, letterSpacing:2 };
  var inp = { padding:"10px 14px", borderRadius:6, border:"1px solid "+BD, fontSize:13, outline:"none", width:"100%", background:BG3, color:"#fff", fontFamily:"'Barlow',sans-serif" };
  var tabs = [{id:"products",lbl:"Products"},{id:"orders",lbl:"Orders"},{id:"branding",lbl:"Branding"}];

  return (
    <div style={{ display:"flex", minHeight:"calc(100vh - 68px)", background:BG }}>
      <div style={{ width:220, background:BG2, borderRight:"1px solid "+BD, padding:"28px 0", display:"flex", flexDirection:"column", gap:2, flexShrink:0 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, padding:"0 24px 20px", color:PRP }}>ADMIN</div>
        {tabs.map(function(t) {
          return <button key={t.id} style={{ background:sideActive(t.id) ? "rgba(124,58,237,0.1)" : "none", border:"none", color:sideActive(t.id) ? "#fff" : "#555", cursor:"pointer", fontSize:13, padding:"11px 24px", textAlign:"left", fontFamily:"'Barlow',sans-serif", letterSpacing:1, borderLeft:sideActive(t.id) ? "3px solid "+PRP : "3px solid transparent" }} onClick={function(){ setTab(t.id); }}>{t.lbl}</button>;
        })}
      </div>

      <div style={{ flex:1, padding:"32px 36px", overflowY:"auto" }}>

        {tab === "products" && (
          <span>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
              <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:900, letterSpacing:3, color:"#fff" }}>PRODUCTS ({products.length})</h2>
              <button style={Object.assign({},bigBtn,{width:"auto",padding:"10px 24px"})} onClick={function(){ setForm({id:Date.now(),name:"",price:"",type:"physical",category:"Props",desc:"",emoji:EMOJIS[5],img:null,stock:1,active:true}); setEditId(null); setTab("add"); }}>+ Add Product</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {products.map(function(p) {
                return (
                  <div key={p.id} style={{ display:"flex", alignItems:"center", gap:14, background:BG2, padding:"14px 18px", borderRadius:10, border:"1px solid "+BD, opacity:p.active ? 1 : 0.4 }}>
                    {p.img ? <img src={p.img} alt={p.name} style={{ width:36, height:36, objectFit:"contain" }} /> : <span style={{ fontSize:26 }}>{p.emoji}</span>}
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:"#fff" }}>{p.name}</div>
                      <div style={{ fontSize:12, color:"#555" }}>{p.category} - {p.stock} in stock</div>
                    </div>
                    <span style={{ fontWeight:800, fontSize:16, color:PRP, minWidth:72 }}>${p.price}</span>
                    <div style={{ display:"flex", gap:8 }}>
                      <button style={{ background:BG3, border:"1px solid "+BD, borderRadius:6, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:600, color:"#aaa" }} onClick={function(){ setForm(Object.assign({},p)); setEditId(p.id); setTab("edit"); }}>Edit</button>
                      <button style={{ background:p.active ? BG3 : "#0a2a0a", border:"1px solid "+BD, borderRadius:6, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:600, color:p.active ? "#aaa" : "#4ade80" }} onClick={function(){ persistProducts(products.map(function(x){ return x.id===p.id ? Object.assign({},x,{active:!x.active}) : x; })); }}>{p.active ? "Hide" : "Show"}</button>
                      <button style={{ background:"#2a0a0a", border:"1px solid "+BD, borderRadius:6, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:600, color:"#f87171" }} onClick={function(){ if(window.confirm("Delete?")){ persistProducts(products.filter(function(x){ return x.id!==p.id; })); st("Deleted"); } }}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </span>
        )}

        {(tab === "add" || tab === "edit") && form && (
          <span>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
              <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:900, letterSpacing:3, color:"#fff" }}>{editId ? "EDIT PRODUCT" : "NEW PRODUCT"}</h2>
              <button style={{ background:"transparent", border:"1px solid "+BD, borderRadius:6, padding:"10px 20px", cursor:"pointer", color:"#666", fontSize:13 }} onClick={function(){ setTab("products"); setForm(null); }}>Cancel</button>
            </div>
            <div style={{ background:BG2, border:"1px solid "+BD, borderRadius:12, padding:28, display:"flex", flexDirection:"column", gap:16, maxWidth:640 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>Product Name *<input style={inp} value={form.name} onChange={function(e){ setForm(function(f){ return Object.assign({},f,{name:e.target.value}); }); }} placeholder="My Product" /></label>
                <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>Price (USD) *<input style={inp} type="number" min="0" step="0.01" value={form.price} onChange={function(e){ setForm(function(f){ return Object.assign({},f,{price:e.target.value}); }); }} placeholder="29.99" /></label>
              </div>
              <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>Description<textarea style={Object.assign({},inp,{minHeight:72,resize:"vertical"})} value={form.desc} onChange={function(e){ setForm(function(f){ return Object.assign({},f,{desc:e.target.value}); }); }} placeholder="Describe your product..." /></label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>Category<select style={inp} value={form.category} onChange={function(e){ setForm(function(f){ return Object.assign({},f,{category:e.target.value}); }); }}>{CATEGORIES.map(function(c){ return <option key={c}>{c}</option>; })}</select></label>
                <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>Type<select style={inp} value={form.type} onChange={function(e){ setForm(function(f){ return Object.assign({},f,{type:e.target.value}); }); }}><option value="physical">Physical</option><option value="digital">Digital</option></select></label>
                <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>Stock<input style={inp} type="number" min="0" value={form.stock} onChange={function(e){ setForm(function(f){ return Object.assign({},f,{stock:e.target.value}); }); }} /></label>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>PRODUCT IMAGE</span>
                <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                  <div style={{ width:90, height:90, borderRadius:10, border:"1px solid "+BD, background:BG3, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
                    {form.img ? <img src={form.img} alt="preview" style={{ width:"100%", height:"100%", objectFit:"contain" }} /> : <span style={{ fontSize:36 }}>{form.emoji}</span>}
                  </div>
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
                    <label style={{ display:"flex", alignItems:"center", gap:10, background:BG3, border:"1px dashed "+PRP2, borderRadius:8, padding:"10px 16px", cursor:"pointer" }}>
                      <span style={{ fontSize:13, color:PRP, fontWeight:600 }}>Upload image from device</span>
                      <input type="file" accept="image/*" style={{ display:"none" }} onChange={function(e){ var file=e.target.files[0]; if(!file) return; var reader=new FileReader(); reader.onload=function(ev){ setForm(function(f){ return Object.assign({},f,{img:ev.target.result}); }); }; reader.readAsDataURL(file); }} />
                    </label>
                    <div style={{ display:"flex", gap:8 }}>
                      <input style={Object.assign({},inp,{fontSize:12})} value={form.imgUrl||""} onChange={function(e){ setForm(function(f){ return Object.assign({},f,{imgUrl:e.target.value}); }); }} placeholder="Or paste image URL: https://..." />
                      <button style={{ background:PRP2, border:"none", borderRadius:6, padding:"10px 14px", cursor:"pointer", color:"#fff", fontSize:12, fontWeight:700, whiteSpace:"nowrap" }} onClick={function(){ if(form.imgUrl) setForm(function(f){ return Object.assign({},f,{img:f.imgUrl,imgUrl:""}); }); }}>Use URL</button>
                    </div>
                    {form.img && <button style={{ background:"#2a0a0a", border:"1px solid #f87171", borderRadius:6, padding:"6px 14px", cursor:"pointer", color:"#f87171", fontSize:12, fontWeight:600 }} onClick={function(){ setForm(function(f){ return Object.assign({},f,{img:null}); }); }}>Remove image</button>}
                  </div>
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>EMOJI (shown when no image)</span>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {EMOJIS.map(function(em){ return <button key={em} style={{ width:38, height:38, borderRadius:8, border:form.emoji===em ? "2px solid "+PRP : "1px solid "+BD, background:form.emoji===em ? "rgba(124,58,237,0.2)" : BG3, cursor:"pointer", fontSize:18 }} onClick={function(){ setForm(function(f){ return Object.assign({},f,{emoji:em}); }); }}>{em}</button>; })}
                </div>
              </div>

              <label style={{ display:"flex", gap:10, alignItems:"center", fontSize:13, color:"#888", cursor:"pointer" }}>
                <input type="checkbox" checked={form.active} onChange={function(e){ setForm(function(f){ return Object.assign({},f,{active:e.target.checked}); }); }} /> Visible in store
              </label>
              <button style={Object.assign({},bigBtn,{width:"100%"})} onClick={saveForm}>{editId ? "SAVE CHANGES" : "ADD PRODUCT"}</button>
            </div>
          </span>
        )}

        {tab === "orders" && (
          <span>
            <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:900, letterSpacing:3, color:"#fff", marginBottom:24 }}>ORDERS ({orders.length})</h2>
            {orders.length === 0
              ? <div style={{ color:"#444", fontSize:16, padding:40 }}>No orders yet.</div>
              : orders.map(function(o) {
                  return (
                    <div key={o.id} style={{ background:BG2, border:"1px solid "+BD, borderRadius:10, padding:"16px 20px", marginBottom:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                        <span style={{ fontWeight:700, color:PRP }}>{o.id}</span>
                        <span style={{ background:"rgba(74,222,128,0.1)", color:"#4ade80", border:"1px solid #4ade80", fontSize:10, fontWeight:700, padding:"2px 10px", borderRadius:20 }}>{o.status}</span>
                        <span style={{ color:"#444", fontSize:12 }}>{new Date(o.date).toLocaleString()}</span>
                        <span style={{ fontWeight:800, color:PRP, marginLeft:"auto" }}>${o.total.toFixed(2)}</span>
                      </div>
                      <div style={{ fontSize:13, color:"#666", marginTop:6 }}>
                        {o.shipping.name} - {o.shipping.email}
                        {o.shipping.address && " - " + o.shipping.address + ", " + o.shipping.city + " " + o.shipping.zip}
                      </div>
                      <div style={{ marginTop:8, display:"flex", gap:8, flexWrap:"wrap" }}>
                        {o.items.map(function(i){ return <span key={i.id} style={{ background:BG3, border:"1px solid "+BD, borderRadius:20, padding:"3px 12px", fontSize:12, color:"#aaa" }}>{i.emoji} {i.name} x{i.qty}</span>; })}
                      </div>
                    </div>
                  );
                })
            }
          </span>
        )}

        {tab === "branding" && (
          <span>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
              <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:900, letterSpacing:3, color:"#fff" }}>BRANDING</h2>
            </div>
            <div style={{ background:BG2, border:"1px solid "+BD, borderRadius:12, padding:28, maxWidth:540, display:"flex", flexDirection:"column", gap:20 }}>
              <div style={{ fontSize:11, letterSpacing:3, color:PRP, fontWeight:700 }}>STORE LOGO</div>
              <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                <div style={{ width:100, height:100, borderRadius:12, border:"1px solid "+BD, background:BG3, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
                  {logoSrc ? <img src={logoSrc} alt="Logo" style={{ width:"100%", height:"100%", objectFit:"contain" }} /> : <LogoSVG size={80} />}
                </div>
                <div>
                  <div style={{ color:"#fff", fontWeight:600, fontSize:14, marginBottom:4 }}>{logoSrc ? "Custom logo active" : "Using default logo"}</div>
                  <div style={{ color:"#555", fontSize:12, lineHeight:1.6 }}>Appears in the header and footer. Recommended: square image, 200x200px or larger.</div>
                </div>
              </div>
              <label style={{ display:"flex", alignItems:"center", gap:10, background:BG3, border:"1px dashed "+PRP2, borderRadius:8, padding:"12px 18px", cursor:"pointer" }}>
                <div>
                  <div style={{ fontSize:13, color:PRP, fontWeight:700 }}>Upload logo from device</div>
                  <div style={{ fontSize:11, color:"#555" }}>JPG, PNG, SVG or WebP</div>
                </div>
                <input type="file" accept="image/*" style={{ display:"none" }} onChange={function(e) {
                  var file = e.target.files[0];
                  if (!file) return;
                  var reader = new FileReader();
                  reader.onload = function(ev) { saveLogo(ev.target.result); };
                  reader.readAsDataURL(file);
                }} />
              </label>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#666", letterSpacing:1 }}>OR PASTE AN IMAGE URL</div>
                <div style={{ display:"flex", gap:8 }}>
                  <input style={inp} value={logoUrl} onChange={function(e){ setLogoUrl(e.target.value); }} placeholder="https://example.com/logo.png" />
                  <button style={{ background:PRP2, border:"none", borderRadius:6, padding:"10px 16px", cursor:"pointer", color:"#fff", fontSize:12, fontWeight:700, whiteSpace:"nowrap" }} onClick={function(){ if(logoUrl.trim()){ saveLogo(logoUrl.trim()); setLogoUrl(""); } }}>Apply</button>
                </div>
              </div>
              {logoSrc && <button style={{ background:"#2a0a0a", border:"1px solid #f87171", borderRadius:6, padding:"9px 18px", cursor:"pointer", color:"#f87171", fontSize:13, fontWeight:600, alignSelf:"flex-start" }} onClick={removeLogo}>Remove custom logo</button>}
              <p style={{ color:"#444", fontSize:12, lineHeight:1.6, borderTop:"1px solid "+BD, paddingTop:16 }}>The logo is saved in your browser. When you deploy to your website, add your hosted image URL as the logo source for a permanent change.</p>
            </div>
          </span>
        )}

      </div>
      {toast && <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", background:"linear-gradient(135deg,"+PRP2+","+PRP+")", color:"#fff", padding:"11px 28px", borderRadius:30, fontSize:13, fontWeight:700, zIndex:999, whiteSpace:"nowrap" }}>{toast}</div>}
    </div>
  );
}