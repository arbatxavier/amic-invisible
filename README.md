# Amic Invisible 🎄🎁

Aplicación web **fullstack** para organizar el sorteo del "Amic Invisible" (amigo invisible) de la familia o los amigos, con reparto secreto de regalos y envío automático por WhatsApp. Hecha en **Next.js (App Router) + TypeScript + Tailwind CSS**, lista para desplegar en **Docker** (`output: 'standalone'`).

> Diseñada para desplegarse en un servidor Hetzner con **Coolify**, pero funciona con cualquier Docker.

---

## Características

- **Sorteo secreto** con motor de *backtracking* + heurística **MRV** (Minimum Remaining Values).
- **Regla de teléfono compartido**: si dos personas del mismo evento comparten número (madre e hija, por ejemplo), se crean exclusiones bidireccionales automáticas (`SAME_PHONE`) para que no se regalen entre sí.
- **Anti-spoiler**: la página pública `/r/[token]` **nunca** devuelve ni pinta a quién le toca regalar hasta que el usuario pulsa "Revelar". El nombre solo se obtiene (y se marca como visto) vía `POST /api/r/[token]/reveal`.
- **Panel de administración** `/admin` protegido por contraseña con cookie HTTP-only.
- **WhatsApp** integrado con [WAHA](https://waha.devlike.pro/) (sesión `default`), con cola de envío controlada desde el frontend y fallback a botón `wa.me`.
- **Festiva y mobile-first**: Framer Motion, canvas-confetti, tarjeta 3D, paleta burdeos / verde bosque / dorado.
- **Calendario**: descarga de un `.ics` con fecha, lugar, normas y enlace privado (sin el nombre asignado en texto plano).

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router, RSC, Server Actions/Route Handlers) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS |
| Animaciones | Framer Motion + canvas-confetti |
| Base de datos | SQLite con `better-sqlite3` + Drizzle ORM |
| Identificadores | nanoid (tokens de 24 caracteres) |
| WhatsApp | WAHA (`devlikeapro/waha`) vía HTTP API |
| Despliegue | Docker (`output: 'standalone'`) |

---

## Cómo funciona

### Modelo de datos

Tres tablas (creadas automáticamente con `CREATE TABLE IF NOT EXISTS` al arrancar la conexión):

- **`events`**: `id`, `title`, `eventDate`, `location`, `budget`, `rules`, `status` (`DRAFT | ACTIVE | ARCHIVED`), `avoidTwoCycles` (booleano), `messageTemplate`.
- **`participants`**: `id`, `eventId`, `name`, `phone` (normalizado a E.164 sin `+`, ej. `34600112233`, **no único**), `token` (nanoid 24), `assignedToId` (nullable), `whatsappStatus` (`PENDING | SENT | FAILED`), `whatsappSentAt`, `viewedAt`.
- **`exclusions`**: `id`, `eventId`, `giverId`, `receiverId`, `reason` (`SAME_PHONE | MANUAL`).

### Motor de sorteo (`src/lib/draw.ts`)

Algoritmo de backtracking con heurística MRV que respeta:

1. **Auto-exclusión** (nadie se regala a sí mismo).
2. **Exclusiones `SAME_PHONE`** (teléfono compartido).
3. **Exclusiones `MANUAL`** (definidas por el admin).
4. **`avoidTwoCycles`** (evita que A→B y B→A).
5. Historial de sorteos anteriores (opcional, vía parámetro).

Si el grafo no tiene solución, devuelve un error descriptivo.

### Anti-spoiler

- `GET /r/[token]` y `generateMetadata` **solo** devuelven datos públicos (nombre del participante y detalles del evento). **Nunca** `assignedTo` ni modifican `viewedAt`.
- El destinatario se obtiene **únicamente** al pulsar "Revelar", mediante `POST /api/r/[token]/reveal`, que marca `viewedAt` y devuelve el nombre.

### WhatsApp

- El admin vincula el número escaneando el **QR** que se muestra en `/admin` (proxy a WAHA, sesión `default`).
- El envío se hace **llamada a llamada** desde el frontend: cada participante dispara `POST /api/admin/participants/[id]/send-whatsapp` con un **retardo aleatorio de 3–5 s** entre mensajes.
- Usa siempre `session: "default"` y `chatId: "{phone}@c.us"`.
- Si falla, marca `whatsappStatus = FAILED` y devuelve un enlace `wa.me` de respaldo.

---

## Puesta en marcha local

Requisitos: Node 18.18+ (o Bun) y Docker para WAHA.

```bash
# 1. Dependencias
npm install        # o: bun install

# 2. Variables de entorno
cp .env.example .env
# edita ADMIN_PASSWORD, APP_URL, WAHA_URL, WAHA_API_KEY

# 3. Base de datos (se crea sola al arrancar, en ./data/amic.db)

# 4. Arrancar WAHA
docker run --rm -p 3001:3000 -e WHATSAPP_API_KEY=tukey \
  -v "$(pwd)/waha-data:/app/.sessions" devlikeapro/waha

# 5. Arrancar la app
npm run dev       # http://localhost:3000
```

Con `WAHA_URL=http://localhost:3001` en local (para que la app llegue a WAHA desde tu máquina).

---

## Despliegue con Docker

```bash
# Construir
docker build -t amic-invisible .

# O levantar app + WAHA con docker-compose
ADMIN_PASSWORD=tupassword WAHA_API_KEY=tukey docker compose up -d
```

Servicios:

- `app` → Next.js en `:3000` (volumen persistente `./data`).
- `waha` → WAHA en `:3001` (volumen persistente `./waha-data`).

---

## Despliegue en Hetzner + Coolify

1. Sube este repo a GitHub/GitLab y créalo en **Coolify** (autodetecta el `Dockerfile`), apuntando el subdominio **amic.xavierarbat.com**.
2. Configura las variables de entorno (ver `.env.example`):
   - `ADMIN_PASSWORD` → contraseña del panel.
   - `APP_URL` → `https://amic.xavierarbat.com` (para los enlaces privados).
   - `WAHA_URL` → `http://waha:3000` (nombre del servicio interno).
   - `WAHA_API_KEY` → misma clave que uses en el contenedor WAHA (`WHATSAPP_API_KEY`).
3. Añade volúmenes persistentes:
   - `./data:/app/data` (SQLite).
   - `./waha-data:/app/.sessions` (sesiones de WhatsApp).
4. Despliega, entra en `/admin`, vincula WhatsApp con el QR y crea tu primer evento.

---

## Uso del panel `/admin`

1. **Crear evento**: título, fecha/hora, lugar, presupuesto, normas y (opcional) plantilla de mensaje.
2. **Añadir participantes**: un participante por línea con formato `Nombre, teléfono` (el teléfono se normaliza solo).
3. **Exclusiones**: las de teléfono compartido son automáticas; puedes añadir exclusiones manuales extra.
4. **Fer el sorteig**: ejecuta el motor. El evento pasa a `ACTIVE`.
5. **Enviar WhatsApp**: envía todos los mensajes en cola (retardo 3–5 s entre ellos) o uno a uno. Cada participante recibe su enlace privado `/r/[token]`.
6. **Anti-spoiler**: con el toggle activado, ni el admin ve las asignaciones.

Cada participante recibe un enlace único. Al abrirlo ve su tarjeta, puede **revelar** su regalo (con confeti) y **descargar el recordatorio** `.ics`.

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Ruta del SQLite | `/app/data/amic.db` |
| `ADMIN_PASSWORD` | Contraseña del panel | `cambia-esta-contrasena` |
| `APP_URL` | URL pública (enlaces privados) | `https://amic.xavierarbat.com` |
| `WAHA_URL` | URL interna de WAHA | `http://waha:3000` |
| `WAHA_API_KEY` | API key de WAHA | `cambia-esta-api-key` |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── admin/…        # login, events, participants, exclusions, draw, send-whatsapp, waha/qr
│   │   └── r/[token]/…    # reveal (POST) y ics (GET)
│   ├── admin/             # panel de administración + login
│   ├── r/[token]/         # tarjeta de revelación (público)
│   ├── page.tsx           # landing
│   └── layout.tsx         # layout raíz + fuentes
├── components/
│   ├── AdminPanel.tsx     # UI del panel (cliente)
│   └── RevealClient.tsx   # tarjeta 3D de revelación (cliente)
├── lib/
│   ├── db/                # conexión better-sqlite3 + schema Drizzle + auto-create
│   ├── draw.ts            # motor de sorteo (MRV + backtracking)
│   ├── phone.ts           # normalización de teléfonos
│   ├── whatsapp.ts        # cliente WAHA
│   ├── ics.ts             # generador de .ics
│   ├── template.ts        # plantilla del mensaje de WhatsApp
│   ├── repo.ts            # helpers de acceso a datos
│   └── auth.ts            # hash de contraseña / cookie
└── middleware.ts          # protección de /admin y /api/admin
```
