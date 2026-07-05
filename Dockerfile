FROM node:22.7-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json ./
RUN npm ci


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN mkdir -p /app/drizzle/db
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# tshark dissects the router's live pcap stream for the Device Monitor feature.
ARG TSHARK_ENABLED=false
RUN if [ "$TSHARK_ENABLED" = "true" ]; then \
        apt-get update \
        && echo "wireshark-common wireshark-common/install-setuid boolean false" | debconf-set-selections \
        && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends tshark libcap2-bin \
        && (setcap -r /usr/bin/dumpcap 2>/dev/null || true) \
        && rm -rf /var/lib/apt/lists/*
    fi

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

# Set the correct permission for prerender cache
RUN mkdir .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/.next/standalone ./
COPY presence-cron.js ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY ./drizzle ./drizzle
RUN mkdir -p /app/drizzle/db
RUN cd ./drizzle && npm install

COPY ./entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

ENTRYPOINT [ "/app/entrypoint.sh" ]

# TODO: Run as non-root user