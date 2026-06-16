# Gran DT Mundial 2026

Fantasy football para el Mundial 2026. El backend consume la [FIFA World Cup 2026 API](https://worldcup26.ir/api-docs/#/) y MySQL solo guarda el estado de tu equipo fantasy.

## Estructura

```
gran-dt-mundial-2026/
├── backend/     # Express + proxy worldcup26.ir + MySQL (fantasy)
└── frontend/    # React + Vite
```

## Fuente de datos

| Dato | Origen |
|------|--------|
| Selecciones, partidos, grupos, estadios | [worldcup26.ir API](https://worldcup26.ir/api-docs/#/) |
| Jugadores del mercado | Generados desde equipos + goleadores de partidos + tabla de grupos |
| Equipo fantasy del usuario | MySQL local |

## Requisitos

- Node.js 18+
- MySQL 8+ (solo para guardar tu plantilla fantasy)

## Configuración

```bash
npm run install:all
cp backend/.env.example backend/.env
```

Edita `backend/.env` con tu contraseña de MySQL y, si quieres, la URL de la API:

```env
WORLDCUP_API_URL=http://worldcup26.ir:3050
DB_PASSWORD=tu_password
```

```bash
npm run db:setup
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## API del backend

### Mundial (proxy de worldcup26.ir)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/worldcup/health` | Estado de la API externa |
| GET | `/api/worldcup/teams` | Selecciones |
| GET | `/api/worldcup/games` | Partidos |
| GET | `/api/worldcup/groups` | Grupos y tabla |
| GET | `/api/worldcup/stadiums` | Estadios |
| POST | `/api/worldcup/refresh` | Limpiar caché |

### Fantasy

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/players?position=&search=&teamCode=` | Mercado de jugadores |
| GET | `/api/team` | Tu equipo |
| POST | `/api/team/slots/:slotId/players` | Fichar (`{ playerId }`) |
| DELETE | `/api/team/slots/:slotId/players` | Liberar |
| POST | `/api/team/reset` | Reiniciar equipo |

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Frontend + backend |
| `npm run dev:frontend` | Solo frontend |
| `npm run dev:backend` | Solo backend |
| `npm run db:setup` | Tablas MySQL para fantasy |
| `npm run build` | Build del frontend |

## Deploy en Vercel + Railway MySQL

| Servicio | Dónde |
|----------|-------|
| Frontend + API | Vercel |
| MySQL | Railway |

### 1. Railway — copiar credenciales

1. Entrá a [railway.app](https://railway.app) → tu proyecto → servicio **MySQL**
2. Pestaña **Variables** (o **Connect**)
3. Copiá **`MYSQL_PUBLIC_URL`** (la URL pública, no la interna)

### 2. Configurar local (`backend/.env`)

```env
MYSQL_PUBLIC_URL=mysql://root:xxxx@xxxx.railway.app:port/railway
```

Comentá o borrá las líneas `DB_HOST=localhost` si usás Railway.

### 3. Crear tablas en Railway

```bash
npm run db:setup
```

### 4. Vercel — mismas variables

En Vercel → **Settings → Environment Variables**, agregá:

```
MYSQL_PUBLIC_URL = (la misma URL de Railway)
WORLDCUP_API_URL = http://worldcup26.ir:3050
CURRENT_MATCHDAY = 2
```

Redeploy en Vercel.

### Notas Railway

- Usá **`MYSQL_PUBLIC_URL`** para conexiones desde Vercel y tu PC
- SSL se activa automáticamente en hosts remotos
- La base `railway` ya existe; no hace falta crearla manualmente
