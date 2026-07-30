# =========================================================================
# tomer-admin (Vite + React) — Dockerfile
# שלב 1: build של אפליקציית ה-React ל-dist
# שלב 2: הגשת ה-dist הסטטי דרך Nginx + proxy ל-/api מול ה-backend
# הקונפיגורציה מועברת כ-build-args (לא צורבים .env).
# =========================================================================

# ---------- שלב 1: build ----------
FROM node:18-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# כתובת ה-API יחסית — עוברת דרך ה-proxy של Nginx ל-backend
ARG VITE_APP_API_BASE_URL=/api
ENV VITE_APP_API_BASE_URL=$VITE_APP_API_BASE_URL

# דומיינים/סוקט שהאדמין משתמש בהם (למשל קישור "צפייה בחנות").
# ערכי ברירת מחדל לפרודקשן — כך זה עובד גם אם ה-compose לא מעביר args.
ARG VITE_APP_STORE_DOMAIN=https://tmarim-betomer.com
ARG VITE_APP_ADMIN_DOMAIN=https://admin.tmarim-betomer.com
ARG VITE_APP_API_SOCKET_URL=https://admin.tmarim-betomer.com
ENV VITE_APP_STORE_DOMAIN=$VITE_APP_STORE_DOMAIN \
    VITE_APP_ADMIN_DOMAIN=$VITE_APP_ADMIN_DOMAIN \
    VITE_APP_API_SOCKET_URL=$VITE_APP_API_SOCKET_URL

COPY . .
RUN npm run build

# ---------- שלב 2: serve ----------
FROM nginx:1.27-alpine AS runtime

# קונפיגורציית Nginx (SPA + proxy ל-/api)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# קבצי ה-build הסטטיים
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
