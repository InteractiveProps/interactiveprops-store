# Donut Bridge — lo que falta para ponerlo a la venta

El código ya está todo en el repo. Falta **solo configuración**, y hay que hacerla
en Vercel y en PayPal — nada de esto se toca desde el código.

## Lo que YA está hecho ✅

| Pieza | Dónde |
|---|---|
| El juego (build) | `juego-privado/` — **fuera de `public/` a propósito**, para que Vercel no lo sirva solo |
| Portero del juego | `api/juego.js` |
| Emisor de licencias | `api/comprar.js` |
| Rutas y `includeFiles` | `vercel.json` |
| `firebase-admin` | instalado en `package.json` |
| Página de compra | `/comprar-donut-bridge` (React, EN/ES, con botones de PayPal) |
| Reglas de Firestore para `licencias` | publicadas — cerradas al navegador |

## Lo que falta — 3 cosas

### 1. Vercel Pro
El plan Hobby es solo para uso **no comercial**. En cuanto vendas, hace falta Pro
(~20 USD/mes). *(Esto ya aplica hoy por la venta de productos físicos.)*

### 2. Variables de entorno en Vercel
*Settings → Environment Variables* del proyecto `interactiveprops-store`:

| Variable | Qué es | Dónde sacarla |
|---|---|---|
| `JUEGO_SECRETO` | firma las cookies de licencia | genérala tú (ver abajo) |
| `FIREBASE_SERVICE_ACCOUNT` | JSON de la service account, **en una sola línea** | Firebase → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada |
| `PAYPAL_CLIENT_ID` | client id de tu app de PayPal | developer.paypal.com |
| `PAYPAL_SECRET` | **el secreto** de esa app — nunca en el código | developer.paypal.com |
| `PAYPAL_ENTORNO` | `sandbox` para probar, `live` para cobrar | — |

Para generar el secreto de las cookies:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Opcional, solo para probar en sandbox: `VITE_PAYPAL_CLIENT_ID` con el client id
de sandbox (ese es público, va en el navegador).

### 3. Probar en sandbox ANTES de cobrar de verdad

⚠️ **Mientras `PAYPAL_ENTORNO` no exista o valga `live`, los botones cobran dinero real.**
Pon `sandbox` en las dos partes (`PAYPAL_ENTORNO` y `VITE_PAYPAL_CLIENT_ID`) y haz
una compra completa con una cuenta de prueba de developer.paypal.com.

Comprueba estas 4 cosas:

| Prueba | Qué tiene que pasar |
|---|---|
| `/juego` sin token | te manda a `/comprar-donut-bridge` |
| `/juego?k=TOKEN_BUENO` | entra y se juega |
| Recargar sin el `?k=` | sigue entrando (tiene la cookie) |
| `/juego/assets/homero.glb` en incógnito | **403 Sin licencia** ← la más importante |

Si la cuarta te descarga el modelo, algo quedó mal y lo demás no sirve.

## El precio está en DOS sitios

Hoy: **9,99 USD**. Si lo cambias, cámbialo en los dos:

- `api/comprar.js` → `const PRECIO = '9.99'` ← el que manda (lo verifica contra PayPal)
- `src/App.tsx` → `const JUEGO_PRECIO = "9.99"` ← el que se enseña y se cobra

El del navegador no es de fiar; por eso el servidor comprueba contra el suyo.

## Operación diaria

- **Un comprador perdió su enlace:** búscalo en Firestore → `licencias` por el campo
  `email` y reenvíale el mismo enlace.
- **Devolución / contracargo / enlace filtrado:** pon `revocada: true` en su documento.
  Deja de entrar en máximo 24 h (es lo que dura la revalidación de la cookie).

## Actualizar el juego después

```bash
node build-release.js              # en la carpeta del juego
```
Luego **reemplaza `juego-privado/` entera** por la nueva `release/` y despliega.
Los compradores no hacen nada: su enlace de siempre les da la versión nueva.

## Lo que esto protege y lo que no

**Sí:** que entre quien no pagó, que se bajen los assets sueltos, que guarden la
página con Ctrl+S y les funcione.

**No:** que un comprador con conocimientos abra la pestaña de Red y se guarde los
archivos que ya cargó. Eso no tiene solución en un juego web — contra eso funciona
la licencia legal, no el código.
