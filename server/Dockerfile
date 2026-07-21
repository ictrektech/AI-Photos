FROM ghcr.io/immich-app/base-server-dev:202603251709@sha256:2bf3053c732fcb87ec90c3c614632ac44847423468ccc57fd935bff771828d9d AS builder
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  CI=1 \
  COREPACK_HOME=/tmp \
  PNPM_HOME=/buildcache/pnpm-store \
  PATH="/buildcache/pnpm-store:$PATH" \
  NPM_REGISTRY=${NPM_REGISTRY}

RUN export HTTP_PROXY=${HTTP_PROXY} HTTPS_PROXY=${HTTPS_PROXY} http_proxy=${HTTP_PROXY} https_proxy=${HTTPS_PROXY} && \
  npm install --global corepack@latest && \
  corepack enable pnpm && \
  pnpm config set store-dir "$PNPM_HOME" && \
  pnpm config set fetch-retries 10 && \
  pnpm config set fetch-retry-mintimeout 10000 && \
  pnpm config set fetch-retry-maxtimeout 120000 && \
  pnpm config set fetch-timeout 300000 && \
  pnpm config set network-concurrency 4 && \
  pnpm config set registry "${NPM_REGISTRY}" && \
  if [ -n "${HTTP_PROXY}" ]; then pnpm config set proxy "${HTTP_PROXY}"; fi && \
  if [ -n "${HTTPS_PROXY}" ]; then pnpm config set https-proxy "${HTTPS_PROXY}"; fi

FROM builder AS server
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NPM_REGISTRY

WORKDIR /usr/src/app
COPY ./server ./server/
RUN --mount=type=cache,id=pnpm-server,target=/buildcache/pnpm-store \
  --mount=type=bind,source=package.json,target=package.json \
  --mount=type=bind,source=.pnpmfile.cjs,target=.pnpmfile.cjs \
  --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
  --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
  export HTTP_PROXY=${HTTP_PROXY} HTTPS_PROXY=${HTTPS_PROXY} http_proxy=${HTTP_PROXY} https_proxy=${HTTPS_PROXY} && \
  SHARP_IGNORE_GLOBAL_LIBVIPS=true pnpm --registry="${NPM_REGISTRY}" --network-concurrency=1 --fetch-retries=10 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=120000 --fetch-timeout=300000 --filter immich build && \
  SHARP_FORCE_GLOBAL_LIBVIPS=true pnpm --registry="${NPM_REGISTRY}" --network-concurrency=1 --fetch-retries=10 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=120000 --fetch-timeout=300000 --filter immich --prod --no-optional deploy /output/server-pruned

FROM builder AS web
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NPM_REGISTRY

WORKDIR /usr/src/app
COPY ./web ./web/
COPY ./i18n ./i18n/
COPY ./open-api ./open-api/
RUN --mount=type=cache,id=pnpm-web,target=/buildcache/pnpm-store \
  --mount=type=bind,source=package.json,target=package.json \
  --mount=type=bind,source=.pnpmfile.cjs,target=.pnpmfile.cjs \
  --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
  --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
  export HTTP_PROXY=${HTTP_PROXY} HTTPS_PROXY=${HTTPS_PROXY} http_proxy=${HTTP_PROXY} https_proxy=${HTTPS_PROXY} && \
  SHARP_IGNORE_GLOBAL_LIBVIPS=true pnpm --registry="${NPM_REGISTRY}" --network-concurrency=1 --fetch-retries=10 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=120000 --fetch-timeout=300000 --filter @immich/sdk --filter immich-web --force install && \
  pnpm --registry="${NPM_REGISTRY}" --network-concurrency=1 --fetch-retries=10 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=120000 --fetch-timeout=300000 --filter @immich/sdk --filter immich-web build

FROM builder AS cli
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NPM_REGISTRY
COPY ./cli ./cli/
COPY ./open-api ./open-api/
RUN --mount=type=cache,id=pnpm-cli,target=/buildcache/pnpm-store \
  --mount=type=bind,source=package.json,target=package.json \
  --mount=type=bind,source=.pnpmfile.cjs,target=.pnpmfile.cjs \
  --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
  --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
  export HTTP_PROXY=${HTTP_PROXY} HTTPS_PROXY=${HTTPS_PROXY} http_proxy=${HTTP_PROXY} https_proxy=${HTTPS_PROXY} && \
  pnpm --registry="${NPM_REGISTRY}" --network-concurrency=1 --fetch-retries=10 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=120000 --fetch-timeout=300000 --filter @immich/sdk --filter @immich/cli install && \
  pnpm --registry="${NPM_REGISTRY}" --network-concurrency=1 --fetch-retries=10 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=120000 --fetch-timeout=300000 --filter @immich/sdk --filter @immich/cli build && \
  pnpm --registry="${NPM_REGISTRY}" --network-concurrency=1 --fetch-retries=10 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=120000 --fetch-timeout=300000 --filter @immich/cli --prod --no-optional deploy /output/cli-pruned

FROM builder AS plugins

ARG TARGETPLATFORM
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NPM_REGISTRY

COPY --from=ghcr.io/jdx/mise:2026.3.12@sha256:0210678cbf58413806531a27adb2c7daf1c37238e56e8f7ea381d73521571775 /usr/local/bin/mise /usr/local/bin/mise

WORKDIR /usr/src/app
COPY ./plugins/mise.toml ./plugins/
ENV MISE_TRUSTED_CONFIG_PATHS=/usr/src/app/plugins/mise.toml
ENV MISE_DATA_DIR=/buildcache/mise
RUN --mount=type=cache,id=mise-tools-${TARGETPLATFORM},target=/buildcache/mise \
  mise install --cd plugins

COPY ./plugins ./plugins/
# Build plugins
RUN --mount=type=cache,id=pnpm-plugins,target=/buildcache/pnpm-store \
  --mount=type=bind,source=package.json,target=package.json \
  --mount=type=bind,source=.pnpmfile.cjs,target=.pnpmfile.cjs \
  --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
  --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
  --mount=type=cache,id=mise-tools-${TARGETPLATFORM},target=/buildcache/mise \
  export HTTP_PROXY=${HTTP_PROXY} HTTPS_PROXY=${HTTPS_PROXY} http_proxy=${HTTP_PROXY} https_proxy=${HTTPS_PROXY} && \
  cd plugins && mise run build

FROM ghcr.io/immich-app/base-server-prod:202603251709@sha256:17de30977ff87aa06758a56ad7f10d6b5c97bf9dab76e4ec4177a2a8d1b2b5f3

WORKDIR /usr/src/app
ENV NODE_ENV=production \
  NVIDIA_DRIVER_CAPABILITIES=all \
  NVIDIA_VISIBLE_DEVICES=all

COPY --from=server /output/server-pruned ./server
COPY --from=web /usr/src/app/web/build /build/www
COPY --from=cli /output/cli-pruned ./cli
COPY --from=plugins /usr/src/app/plugins/dist /build/corePlugin/dist
COPY --from=plugins /usr/src/app/plugins/manifest.json /build/corePlugin/manifest.json
RUN ln -s ../../cli/bin/immich server/bin/immich
COPY LICENSE /licenses/LICENSE.txt
COPY LICENSE /LICENSE

ENV PATH="${PATH}:/usr/src/app/server/bin"

ARG BUILD_ID
ARG BUILD_IMAGE
ARG BUILD_SOURCE_REF
ARG BUILD_SOURCE_COMMIT

ENV IMMICH_BUILD=${BUILD_ID}
ENV IMMICH_BUILD_URL=https://github.com/immich-app/immich/actions/runs/${BUILD_ID}
ENV IMMICH_BUILD_IMAGE=${BUILD_IMAGE}
ENV IMMICH_BUILD_IMAGE_URL=https://github.com/immich-app/immich/pkgs/container/immich-server
ENV IMMICH_REPOSITORY=immich-app/immich
ENV IMMICH_REPOSITORY_URL=https://github.com/immich-app/immich
ENV IMMICH_SOURCE_REF=${BUILD_SOURCE_REF}
ENV IMMICH_SOURCE_COMMIT=${BUILD_SOURCE_COMMIT}
ENV IMMICH_SOURCE_URL=https://github.com/immich-app/immich/commit/${BUILD_SOURCE_COMMIT}

VOLUME /data
EXPOSE 2283
ENTRYPOINT ["tini", "--", "/bin/bash", "-c"]
CMD ["start.sh"]

HEALTHCHECK CMD immich-healthcheck
