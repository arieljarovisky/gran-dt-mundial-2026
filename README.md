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

## Deploy: Frontend (Vercel) + Backend (Railway)

| Servicio | Plataforma | Root Directory |
|----------|------------|----------------|
| Frontend (PWA) | Vercel | `frontend` |
| Backend (API) | Railway | `backend` |
| MySQL | Railway | servicio aparte |

### 1. Railway — MySQL (ya creado)

1. Servicio **MySQL** → **Variables** → copiá `MYSQL_PUBLIC_URL`
2. Desde tu PC, creá las tablas:

```bash
# backend/.env con MYSQL_PUBLIC_URL
npm run db:setup
```

### 2. Railway — Backend (nuevo servicio)

1. Mismo proyecto Railway → **New** → **GitHub Repo** → este repo
2. **Settings → Root Directory** → `backend`
3. **Variables** del servicio backend:

```
MYSQL_URL=${{MySQL.MYSQL_URL}}
WORLDCUP_API_URL=http://worldcup26.ir:3050
CURRENT_MATCHDAY=2
FRONTEND_URL=https://tu-app.vercel.app
```

> `MYSQL_URL` referencia el servicio MySQL interno (más rápido). Para `db:setup` local usá `MYSQL_PUBLIC_URL`.

4. Deploy → copiá la URL pública del backend (ej. `https://gran-dt-backend.up.railway.app`)

### 3. Vercel — Frontend

1. **New Project** → GitHub → este repo
2. **Root Directory** → `frontend`
3. Framework: **Vite** (detectado automáticamente)
4. **Environment Variables**:

```
VITE_API_URL=https://tu-backend.up.railway.app
```

5. Deploy

### 4. CORS — conectar ambos

En Railway (backend), actualizá `FRONTEND_URL` con la URL real de Vercel y redeployá el backend.

### Desarrollo local

```env
# frontend/.env — vacío o sin VITE_API_URL (usa proxy Vite → :3001)
# backend/.env — MySQL local o MYSQL_PUBLIC_URL
CORS_ORIGIN=http://localhost:3000
```
