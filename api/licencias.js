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

// ------------------------------------------------------------------ sesión
//
// Verificamos el token de Firebase Auth a mano en vez de usar
// firebase-admin/auth: ese módulo revienta al importarse aquí con
// ERR_REQUIRE_ESM (arrastra una dependencia que solo existe como ESM y su build
// CJS intenta hacerle require). firebase-admin/firestore sí carga bien, así que
// el resto del archivo lo sigue usando.
//
// Un token de Firebase es un JWT firmado por Google. Comprobamos exactamente lo
// mismo que comprobaría la librería: la FIRMA contra las claves públicas de
// Google, que no haya caducado, y que venga de tu proyecto (aud/iss). Sin esas
// cuatro cosas, cualquiera se fabricaría un token.

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let _certs = { pedidas: 0, claves: null };

async function clavesDeGoogle() {
  // Google rota estas claves; una hora de caché es de sobra y evita pedirlas en
  // cada llamada.
  if (_certs.claves && Date.now() - _certs.pedidas < 3600e3) return _certs.claves;
  const r = await fetch(CERTS_URL);
  if (!r.ok) throw new Error('no-hay-claves-de-google');
  _certs = { pedidas: Date.now(), claves: await r.json() };
  return _certs.claves;
}

function deBase64Url(s) {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function proyectoId() {
  return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT).project_id;
}

async function esAdmin(req) {
  const cabecera = req.headers.authorization || '';
  const idToken = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;
  if (!idToken) return { ok: false, motivo: 'sin-token' };

  try {
    const partes = idToken.split('.');
    if (partes.length !== 3) return { ok: false, motivo: 'formato' };

    const cabeceraJwt = JSON.parse(deBase64Url(partes[0]).toString('utf8'));
    const datos = JSON.parse(deBase64Url(partes[1]).toString('utf8'));
    if (cabeceraJwt.alg !== 'RS256') return { ok: false, motivo: 'algoritmo' };

    const claves = await clavesDeGoogle();
    const certificado = claves[cabeceraJwt.kid];
    if (!certificado) return { ok: false, motivo: 'clave-desconocida' };

    const firmaOk = crypto.createVerify('RSA-SHA256')
      .update(partes[0] + '.' + partes[1])
      .verify(certificado, deBase64Url(partes[2]));
    if (!firmaOk) return { ok: false, motivo: 'firma-invalida' };

    const proyecto = proyectoId();
    const ahora = Math.floor(Date.now() / 1000);
    if (!(datos.exp > ahora))                                       return { ok: false, motivo: 'caducado' };
    if (datos.aud !== proyecto)                                     return { ok: false, motivo: 'otro-proyecto' };
    if (datos.iss !== 'https://securetoken.google.com/' + proyecto) return { ok: false, motivo: 'emisor' };
    if (!datos.sub)                                                 return { ok: false, motivo: 'sin-usuario' };

    return { ok: true, uid: datos.sub };
  } catch (e) {
    const motivo = e?.message || 'verificacion-fallida';
    console.error('licencias: verificación falló →', motivo);
    return { ok: false, motivo: String(motivo).slice(0, 120) };
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
  const sesion = await esAdmin(req);
  if (!sesion.ok) {
    res.status(401).json({
      error: 'Necesitas iniciar sesión como administrador',
      motivo: sesion.motivo
    });
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
