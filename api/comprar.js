/*
  api/comprar.js — emite la licencia después de comprobar el pago con PayPal.

  Va en tu repo de interactiveprop.com, en api/comprar.js.

  ¿Por qué en el servidor y no en el React?

  Porque el navegador del cliente no es de fiar. Si la licencia se creara desde
  React (aunque fuera "solo después de que PayPal apruebe"), cualquiera podría
  abrir la consola, llamar a esa misma función de Firestore y regalarse una
  licencia sin pagar un céntimo. No hay forma de evitarlo desde el cliente.

  Aquí no: esta función recibe SOLO el id de la orden, se lo pregunta a PayPal
  con tus credenciales secretas, y hasta que PayPal no confirma que está pagada
  y por el importe correcto, no escribe nada.

  Va de la mano de las reglas de Firestore: la colección 'licencias' tiene que
  estar cerrada a cal y canto para el cliente. Esta función la escribe con el
  SDK de administrador, que se salta las reglas.
*/

import crypto from 'node:crypto';

// ------------------------------------------------------------------ ajustes

// Lo que cuesta el juego. Se comprueba contra lo que PayPal dice que se pagó,
// para que nadie cree una orden de 0,01 y se lleve el juego.
const PRECIO = '9.99';
const MONEDA = 'USD';

// 'sandbox' mientras pruebas, 'live' cuando cobres de verdad
const ENTORNO = process.env.PAYPAL_ENTORNO || 'sandbox';
const API = ENTORNO === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// ------------------------------------------------------------------ PayPal

async function tokenPayPal() {
  const cred = Buffer.from(
    process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_SECRET
  ).toString('base64');

  const r = await fetch(API + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + cred,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!r.ok) throw new Error('PayPal no da token: ' + r.status);
  return (await r.json()).access_token;
}

// Cobra la orden. Si ya estaba cobrada, PayPal responde con un error que
// tratamos aparte: consultamos la orden y seguimos si está pagada.
async function cobraOrden(idOrden) {
  const acceso = await tokenPayPal();

  const r = await fetch(API + '/v2/checkout/orders/' + idOrden + '/capture', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + acceso,
      'Content-Type': 'application/json'
    }
  });

  if (r.ok) return r.json();

  // ya estaba cobrada (el cliente recargó, reintentó, etc.)
  const consulta = await fetch(API + '/v2/checkout/orders/' + idOrden, {
    headers: { Authorization: 'Bearer ' + acceso }
  });
  if (!consulta.ok) throw new Error('PayPal no reconoce la orden');
  return consulta.json();
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

// ------------------------------------------------------------------ la función

export default async function handler(req, res) {
  // GET = "¿en qué entorno estás?". La página de compra lo pregunta ANTES de
  // pintar los botones, para no dejar que el navegador cobre en producción
  // mientras el servidor está en sandbox (o al revés). Sin esto, una variable
  // mal puesta puede cobrar dinero de verdad en una prueba.
  if (req.method === 'GET') {
    res.status(200).json({ entorno: ENTORNO });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Solo POST' });
    return;
  }

  const idOrden = req.body?.idOrden;
  if (!idOrden || typeof idOrden !== 'string' || idOrden.length > 64) {
    res.status(400).json({ error: 'Falta el id de la orden' });
    return;
  }

  try {
    const base = await db();

    // ---- ¿ya emitimos licencia para esta orden?
    // Sin esto, mandar el mismo id dos veces crearía dos licencias.
    const yaEsta = await base.collection('licencias')
      .where('ordenPayPal', '==', idOrden).limit(1).get();

    if (!yaEsta.empty) {
      res.status(200).json({ enlace: enlaceDe(yaEsta.docs[0].id) });
      return;
    }

    // ---- que lo diga PayPal, no el navegador
    const orden = await cobraOrden(idOrden);

    if (orden.status !== 'COMPLETED') {
      res.status(402).json({ error: 'El pago no está completado' });
      return;
    }

    const compra = orden.purchase_units?.[0];
    const pago = compra?.payments?.captures?.[0]?.amount || compra?.amount;

    if (!pago || pago.currency_code !== MONEDA || Number(pago.value) < Number(PRECIO)) {
      res.status(402).json({ error: 'El importe no coincide' });
      return;
    }

    const email = orden.payer?.email_address || compra?.payee?.email_address || null;

    // ---- ahora sí: la licencia
    const token = crypto.randomUUID().replace(/-/g, '') +
                  crypto.randomUUID().replace(/-/g, '').slice(0, 8);

    await base.collection('licencias').doc(token).set({
      email,
      ordenPayPal: idOrden,
      importe: pago.value,
      moneda: pago.currency_code,
      creada: new Date(),
      revocada: false
    });

    res.status(200).json({ enlace: enlaceDe(token), email });
  } catch (e) {
    console.error('fallo emitiendo licencia', e);
    res.status(500).json({ error: 'No se pudo emitir la licencia' });
  }
}

function enlaceDe(token) {
  return 'https://interactiveprop.com/juego?k=' + token;
}
