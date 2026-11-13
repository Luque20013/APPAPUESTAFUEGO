# IceFire · Lista y Marcador (app aparte)

- `/` → **Marcador** con 3 pestañas: **3 Equipos** (ronda con apuesta), **4 Equipos** (todos contra todos en 3 rondas con 2 canchas a la vez, con cuentas y quién le paga a quién) e **Individual** (penas por set y liquidación).
- `/lista/` → **Lista**: cupos, posición fija, pago por Yape con check de los admins, WhatsApp.

Usa la misma base de datos Firebase de siempre. No hay que activar ni crear nada en Firebase.

## Cómo reemplazar en tu repositorio de GitHub
1. Abre el repositorio → **Add file → Upload files**.
2. Arrastra **todo el contenido** de esta carpeta (`index.html`, `script.js`, `style.css`, `config.js`, `logo.webp`, la carpeta `lista/`). Confirma con **Commit changes** y se sobrescriben los archivos viejos.
3. **Borra a mano** `lista/imagen.png` (es el QR de Angelo, del grupo anterior). El QR de Yulisa (`lista/imagen2.png`) se queda y se sobrescribe.
4. Espera 1–2 minutos y abre la página con Ctrl+F5 (o borra la caché del navegador).

## Edita `config.js` (único archivo que tienes que tocar)
Revisa las líneas con ✏️: cancha y mapa, cupos, cuota, días y horas, Yape (número y QR) y **los PIN de admin**.
Los QR nuevos se suben a la carpeta `lista/` y se ponen en `qr: 'nombre.png'`.

## Limpiar los datos del grupo anterior (una sola vez)
Como la base de datos es la misma, puede tener datos viejos. Entra como admin y usa:
- Lista: **🗑️ Limpiar toda la lista**
- Marcador: **🔄 Reiniciar todo** (3 equipos) y **🔄 Reiniciar cuentas** (individual)

## Ojo
- Los PIN de admin viven en `config.js`: es una traba simple, no seguridad fuerte. Cualquiera que abra el código del repo los ve.
- Si el grupo anterior sigue usando el mismo link, verá la app de IceFire y compartirá la misma base de datos.
