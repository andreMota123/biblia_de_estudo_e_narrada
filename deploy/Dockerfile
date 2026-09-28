# Imagem de produção do Bíblia Origens (Next.js standalone).
# Build a partir da raiz do projeto:
#   docker build -f deploy/Dockerfile -t biblia-origens .

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# As variáveis NEXT_PUBLIC_* entram no código do navegador no momento do build.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_READER_NAME
ENV NEXT_TELEMETRY_DISABLED=1
# A narração (~2 GB) não entra na imagem: é montada como volume.
RUN rm -rf public/narracao && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
