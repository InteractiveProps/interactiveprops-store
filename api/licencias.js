/*
  api/licencias.js — licencias de regalo (prensa, streamers, soporte).

  Una licencia es solo un documento en la colección 'licencias'. api/juego.js no
  pregunta si hubo pago: pregunta si el documento existe y si no está revocada.
  Así que regalar el juego es, literalmente, crear una licencia a mano.

  ¿Por qué en el servidor y con sesión?

  La colección está cerrada al navegador en las reglas de Firestore (a propósito:
  si el cliente pudiera escribir ahí, cualquiera se regalaría el juego). Esta
  función entra con el SDK de administrador, que se salta las reglas — así que
  antes de dejar hacer nada comprueba que quien llama tiene sesión de Firebase
  Auth, o sea, que eres tú desde /admin.

  Acciones:
    GET                                → lista de licencias
    POST {accion:'crear', nota}        → crea una y devuelve el enlace
    POST {accion:'revocar', token, revocada} → corta (o restaura) el acceso
*/

import crypto from 'node:crypto';

// ------------------------------------------------------------------ firebase
let _app = null;
async function iniciaApp() {
  if (_app) return _app;
  const { getApps, initializeApp, cert } = await import('firebase-admin/app');
  _app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  return _app;
}

async function db() {
  await iniciaApp();
  const { getFirestore } = await import('firebase-admin/firestore');
  return getFirestore();
}

// Solo pasa quien trae un token de sesión válido de Firebase Auth.
async function esAdmin(req) {
  const cabecera = req.headers.authorization || '';
  const idToken = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;
  if (!idToken) return false;
  try {
    await iniciaApp();
    const { getAuth } = await import('firebase-admin/auth');
    await getAuth().verifyIdToken(idToken);
    return true;
  } catch (e) {
    return false;
  }
}

function enlaceDe(token, req) {
  const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
  const proto = req?.headers?.['x-forwarded-proto'] || 'https';
  const base = host ? proto + '://' + host : 'https://www.interactiveprop.com';
  return base + '/juego?k=' + token;
}

// ------------------------------------------------------------------ la función
export default async function handler(req, res) {
  if (!(await esAdmin(req))) {
    res.status(401).json({ error: 'Necesitas iniciar sesión como administrador' });
    return;
  }

  try {
    const base = await db();

    // ---- listar
    if (req.method === 'GET') {
      const snap = await base.collection('licencias').orderBy('creada', 'desc').limit(200).get();
      const items = [];
      snap.forEach(d => {
        const x = d.data();
        items.push({
          token: d.id,
          enlace: enlaceDe(d.id, req),
          email: x.email || null,
          nota: x.nota || null,
          origen: x.origen || 'compra',
          importe: x.importe || null,
          revocada: !!x.revocada,
          creada: x.creada?.toDate ? x.creada.toDate().toISOString() : (x.creada || null)
        });
      });
      res.status(200).json({ items });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' });
      return;
    }

    const { accion, nota, token, revocada } = req.body || {};

    // ---- crear una licencia de regalo
    if (accion === 'crear') {
      const nuevo = crypto.randomUUID().replace(/-/g, '') +
                    crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      await base.collection('licencias').doc(nuevo).set({
        email: null,
        nota: (typeof nota === 'string' ? nota.slice(0, 120) : '') || 'Regalo',
        origen: 'regalo',
        ordenPayPal: null,
        creada: new Date(),
        revocada: false
      });
      res.status(200).json({ token: nuevo, enlace: enlaceDe(nuevo, req) });
      return;
    }

    // ---- revocar / restaurar
    if (accion === 'revocar') {
      if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'Falta el token' });
        return;
      }
      await base.collection('licencias').doc(token).update({ revocada: !!revocada });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Acción desconocida' });
  } catch (e) {
    console.error('licencias', e);
    res.status(500).json({ error: 'No se pudo completar la operación' });
  }
}
