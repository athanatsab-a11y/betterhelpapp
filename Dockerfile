# ---- build: χτίζει το frontend με τις μεταβλητές του Supabase ----
FROM node:22-slim AS build
WORKDIR /app

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY package*.json ./
COPY client/package*.json client/
RUN npm ci --no-audit --no-fund --ignore-scripts \
 && npm ci --prefix client --no-audit --no-fund

COPY . .
RUN npm run build

# ---- runtime: μόνο ο server και το έτοιμο frontend ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Χωρίς optional deps: σε production η βάση είναι το Supabase Postgres, οπότε
# δεν χρειάζεται καθόλου το native better-sqlite3.
COPY package*.json ./
RUN npm ci --omit=dev --omit=optional --no-audit --no-fund --ignore-scripts

COPY server ./server
COPY shared ./shared
COPY scripts ./scripts
COPY supabase ./supabase
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
