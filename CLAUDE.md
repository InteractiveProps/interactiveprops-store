@C:/Users/verot/Desktop/My Vault/CLAUDE.md

# CLAUDE.md — Interactive Props (sitio principal)

Sitio web de **Interactive Props** — `interactiveprop.com` (+ `www.`). Vite + React 19 + TypeScript. Deploy en Vercel (proyecto `interactiveprops-store`, cuenta/team "Veronica Rey's" Hobby). Repo: `github.com/InteractiveProps/interactiveprops-store` (branch `main`).

## ⚠️ REQUISITO LEGAL — NO ELIMINAR (obligatorio para verificaciones de plataforma)

El sitio DEBE mantener siempre, visible, esta declaración de propiedad exacta:

> **Interactive Props is owned and operated by Veronica Aime Rey, sole proprietor.**

Fue añadida como requisito para las verificaciones de **Meta (Facebook Business Verification)** y **Google** — ambas **EN REVIEW** a fecha 2026-07-06. Si se quita, esas verificaciones fallan.

Vive en DOS lugares — mantener AMBOS:
- `index.html` → `<footer>` estático en el HTML base (línea ~11-13). Este es el más importante: se renderiza siempre, incluso sin JS, así que los revisores/crawlers siempre lo ven. **No borrar este footer.**
- `src/App.tsx` (~línea 579) → footer dentro de la app React.

Al rediseñar/refactorizar el footer o el layout, **conservar el texto exacto** (puede cambiar el estilo, no las palabras).

## ⚠️ DNS e infraestructura compartida — NO TOCAR

`interactiveprop.com` comparte dominio con el subdominio de otro proyecto (**GameCam**, en `gamecam.interactiveprop.com`, otra cuenta Vercel). El DNS está en **Namecheap** (no en Vercel). Al trabajar aquí:
- **NO** borrar los registros TXT en el host `@` de Namecheap: `google-site-verification=...` y `facebook-domain-verification=...` (son las verificaciones en review).
- **NO** tocar el CNAME `gamecam` ni el TXT `_vercel`, ni cambiar nameservers / "Enable Vercel DNS".
- Redeployar este sitio a Vercel es seguro (solo afecta `interactiveprop.com`/`www`, no el subdominio gamecam).

## Comandos
- `npm install` · `npm run dev` (Vite) · `npm run build` → `dist/`
- Deploy: push a `main` (Vercel auto-deploy) o `vercel --prod`.
