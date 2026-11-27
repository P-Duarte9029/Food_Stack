# syntax=docker/dockerfile:1
# Imagem única (API + front na mesma origem) para o Cloud Run. Veja docs/deploy-gcp.md.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages packages
COPY apps apps
# O prisma.config.ts exige DATABASE_URL só para ler a configuração; o generate não conecta.
RUN DATABASE_URL=postgresql://build:build@localhost/build pnpm --filter @food-stack/api prisma:generate \
 && pnpm -r build

# Aplica as migrations (Cloud Run Job). Precisa do CLI do Prisma, que é devDependency.
FROM build AS migrate
WORKDIR /repo/apps/api
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

FROM build AS prune
RUN pnpm --filter @food-stack/api deploy --prod --legacy /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV WEB_DIST_DIR=/app/web
ENV TRUST_PROXY=1
WORKDIR /app
COPY --from=prune /out ./api
COPY --from=build /repo/apps/web/dist ./web
USER node
WORKDIR /app/api
CMD ["node", "dist/main.js"]
