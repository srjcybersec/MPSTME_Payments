FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/types/package.json packages/types/package.json

RUN npm ci

COPY . .

RUN npm run prisma:generate --workspace=@mpstme/server
RUN npm run build --workspace=@mpstme/server

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server ./apps/server
COPY --from=builder /app/packages ./packages

EXPOSE 8080

CMD ["sh", "-c", "npm exec --workspace=@mpstme/server prisma migrate deploy --schema apps/server/prisma/schema.prisma && npm run start --workspace=@mpstme/server"]
