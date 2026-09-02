/*
  api/juego.js — el portero del juego.

  Va en tu repo de interactiveprop.com, en la carpeta api/. Vercel convierte
  cada archivo de api/ en una función que se ejecuta en el servidor.

  Es el ÚNICO camino por el que salen los archivos del juego. Nadie puede pedir
  assets/homero.glb directamente, porque el juego no vive en public/ (donde
  Vercel sirve todo sin preguntar) sino en una carpeta privada que solo lee
  esta función.

  ---------------------------------------------------------------- el acceso

  Pago único: se compra una vez y el acceso no caduca. El enlace ?k=TOKEN que
  recibe el comprador es su llave, y le sirve siempre y desde cualquier
  dispositivo.

  Para no preguntarle a Firestore en cada archivo (son 6 peticiones por partida
  y Firestore cobra por lectura), la primera vez le dejamos al navegador una
  cookie firmada que lleva dentro:

      token . cuándo-se-comprobó . firma

  Esa cookie dura un año, así que quien ya entró una vez no vuelve a necesitar
  su enlace. Pero cada VENTANA_HORAS se revalida contra Firestore por detrás,
  sin que el jugador note nada. Eso es lo que hace que revocar una licencia (una
  devolución, un contracargo) surta efecto de verdad en vez de quedarse en un
  campo que nadie mira.
*/

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// ------------------------------------------------------------------ ajustes

// Dónde está la carpeta release/, dentro del repo pero FUERA de public/
const CARPETA = 'juego-privado';

// A dónde mandamos a quien no tiene licencia
const PAGINA_COMPRA = '/comprar-donut-bridge';

// Cada cuánto se vuelve a comprobar la licencia contra Firestore. Con pago
// único esto solo importa para las revocaciones: es lo que tarda en cortarle
// el acceso a alguien al que le devolviste el dinero.
const VENTANA_HORAS = 24;

// Cuánto le dura la cookie al navegador. Larga a propósito: mientras la tenga,
// el jugador no necesita volver a buscar su enlace en el correo.
const DIAS_COOKIE = 365;

// Secreto para firmar la cookie. Ponlo en Vercel como variable de entorno:
//   Settings > Environment Variables > JUEGO_SECRETO
// Vale cualquier cadena larga y aleatoria.
const SECRETO = process.env.JUEGO_SECRETO;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.webp': 'image/webp',
  '.png': 'image/png'
};

// ------------------------------------------------------------------ la cookie

function firma(valor) {
  return crypto.createHmac('sha256', SECRETO).update(valor).digest('hex').slice(0, 32);
}

// Devuelve el token y cuánto hace que se comprobó, o null si la firma no cuadra.
function abreCookie(cookie) {
  if (!cookie) return null;
  const partes = cookie.split('.');
  if (partes.length !== 3) return null;
  const [token, marca, f] = partes;
  const esperada = Buffer.from(firma(token + '.' + marca));
  const recibida = Buffer.from(f);
  if (esperada.length !== recibida.length) return null;
  // timingSafeEqual para no filtrar la firma por el tiempo de respuesta
  if (!crypto.timingSafeEqual(esperada, recibida)) return null;
  const edad = Date.now() - Number(marca);
  if (!(edad >= 0)) return null;   // marca en el futuro: manipulada
  return { token, edadHoras: edad / 3600000 };
}

function ponCookie(res, token) {
  const cuerpo = token + '.' + Date.now();
  res.setHeader('Set-Cookie', [
    'jb_lic=' + encodeURIComponent(cuerpo + '.' + firma(cuerpo)),
    'Path=/juego',
    'Max-Age=' + DIAS_COOKIE * 24 * 3600,
    'HttpOnly',      // el JavaScript de la página no puede leerla
    'Secure',
    'SameSite=Lax'
  ].join('; '));
}

function leeCookie(req, nombre) {
  const crudo = req.headers.cookie || '';
  for (const trozo of crudo.split(';')) {
    const [k, ...v] = trozo.trim().split('=');
    if (k === nombre) return decodeURIComponent(v.join('='));
  }
  return null;
}

// ------------------------------------------------------------------ Firestore

let firestore = null;
async function db() {
  if (firestore) return firestore;
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getApps, initializeApp, cert } = await import('firebase-admin/app');
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  firestore = getFirestore();
  return firestore;
}

async function licenciaValida(token) {
  if (!token || !/^[a-zA-Z0-9_-]{16,64}$/.test(token)) return false;
  const doc = await (await db()).collection('licencias').doc(token).get();
  if (!doc.exists) return false;
  return !doc.data().revocada;
}

// ------------------------------------------------------------------ la función

export default async function handler(req, res) {
  if (!SECRETO) {
    res.status(500).send('Falta la variable de entorno JUEGO_SECRETO');
    return;
  }

  // La reescritura de vercel.json nos pasa la ruta pedida en ?ruta=
  let ruta = req.query.ruta || 'index.html';
  if (Array.isArray(ruta)) ruta = ruta.join('/');
  if (ruta === '' || ruta.endsWith('/')) ruta += 'index.html';

  // Nadie se sale de la carpeta del juego
  if (!/^[a-zA-Z0-9._\/-]+$/.test(ruta) || ruta.includes('..')) {
    res.status(400).send('Ruta no válida');
    return;
  }

  const ext = path.extname(ruta).toLowerCase();
  const esPagina = ext === '.html';

  // ---- ¿puede estar aquí?
  let autorizado = false;
  const pase = abreCookie(leeCookie(req, 'jb_lic'));
  const token = typeof req.query.k === 'string' ? req.query.k : null;

  if (pase && pase.edadHoras < VENTANA_HORAS) {
    // comprobado hace poco: pasa sin molestar a Firestore
    autorizado = true;
  } else if (pase && !esPagina && pase.edadHoras < VENTANA_HORAS * 2) {
    // Un asset con el pase recién pasado de fecha: lo dejamos con margen. La
    // revalidación de verdad ocurre en el index.html, que es lo primero que
    // pide el navegador; si revalidáramos aquí, una sola partida dispararía
    // cinco lecturas de Firestore a la vez.
    autorizado = true;
  } else if (pase || token) {
    // toca preguntar: o el pase se pasó de viejo, o llega con su enlace
    const cual = token || pase.token;
    if (await licenciaValida(cual)) {
      ponCookie(res, cual);
      autorizado = true;
    }
  }

  if (!autorizado) {
    if (esPagina) res.redirect(302, PAGINA_COMPRA);
    else res.status(403).send('Sin licencia');
    return;
  }

  // ---- servimos el archivo
  try {
    const destino = path.join(process.cwd(), CARPETA, ruta);
    const datos = await fs.readFile(destino);

    res.setHeader('Content-Type', TIPOS[ext] || 'application/octet-stream');

    // private es OBLIGATORIO en las dos ramas: sin eso el CDN de Vercel podría
    // guardar la respuesta y servírsela a alguien que no ha pagado.
    //
    // El index.html NO se cachea: es el que trae las direcciones con versión de
    // todo lo demás, y es donde se revalida la licencia. Si se cacheara, a un
    // revocado no habría forma de cortarle.
    //
    // Los assets al contrario: como su dirección lleva la huella del contenido,
    // si el archivo cambia estrena URL. Por eso se pueden cachear a lo bestia
    // sin riesgo de servir algo viejo.
    if (esPagina) {
      res.setHeader('Cache-Control', 'private, no-store');
    } else {
      res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    }

    res.status(200).send(datos);
  } catch (e) {
    res.status(404).send('No encontrado');
  }
}
