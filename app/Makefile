# AI 相册 VOS 应用打包 Makefile
#
# 版本规范：遵循仓库根 docs/version.md
#   FULL_VERSION = <APP_VERSION>-<BUILD_DATE>.<BUILD_ID>.<GIT_SHA>
#   例：20260624.0.0-20260630.1.abc1234
#
# 镜像版本与应用版本分离：
#   - 各镜像有独立的上游版本号（IMAGE_*_VERSION）
#   - APP_VERSION 为本应用 Semver 核心版本，FULL_VERSION 为本应用安装包版本
#   - manifest.yml 中 `version:` 字段在打包阶段会被替换为 FULL_VERSION
#
# 默认 pull 模式打包：
#   - 安装包仅包含 app.tar.gz，不携带 docker save 离线镜像归档
#   - docker compose up 时由目标环境按 image/pull_policy 拉取镜像
#   - 如需离线镜像归档，可单独执行 make assets
#
# 产物：
#   dist/staging/                                   manifest 替换后的 src 副本
#   dist/app.tar.gz                                 应用定义包
#   dist/$(PACKAGE_NAME)                            最终安装包（pull 模式，仅 app.tar.gz）
#
# 常用目标：
#   make package    构建 pull 模式安装包（默认，不含镜像归档）
#   make app        仅构建 app.tar.gz
#   make assets     仅导出离线镜像资源 + 校验文件（可选）
#   make image-pull 拉取镜像（带代理）
#   make verify     校验产物结构
#   make clean      清理 dist/

APP_ID      := com.example.ai-album
APP_NAME    := ai-album

export TZ := Asia/Shanghai

# ---- server 镜像版本（从 server/package.json 自动读取，与 immich repo 版本同步）----
REPO_ROOT        := $(CURDIR)/..
SERVER_PACKAGE   := $(REPO_ROOT)/server/package.json
IMAGE_SERVER_VERSION := $(shell jq -r '.version' "$(SERVER_PACKAGE)" 2>/dev/null || echo 2.8.1)

# ---- 其他镜像版本（独立管理）----
IMAGE_ML_VERSION          := 1.4.0
IMAGE_VALKEY_VERSION      := 9
IMAGE_POSTGRES_VERSION    := 14-vectorchord0.4.3-pgvectors0.2.0
IMAGE_PROMETHEUS_VERSION  := latest
IMAGE_GRAFANA_VERSION     := 12.4.2-ubuntu

# ---- 各镜像完整引用 ----
IMAGE_SERVER     := registry.example.com/immich-server:$(IMAGE_SERVER_VERSION)
IMAGE_ML         := registry.example.com/album-machine-learning:$(IMAGE_ML_VERSION)
IMAGE_VALKEY     := registry.example.com/valkey/valkey:$(IMAGE_VALKEY_VERSION)
IMAGE_POSTGRES   := registry.example.com/postgres:$(IMAGE_POSTGRES_VERSION)
IMAGE_PROMETHEUS := registry.example.com/prom/prometheus:$(IMAGE_PROMETHEUS_VERSION)
IMAGE_GRAFANA    := registry.example.com/grafana/grafana:$(IMAGE_GRAFANA_VERSION)

# ---- 目标架构 ----
ARCHS ?= arm64

# ---- 豁免目标列表 ----
EXEMPT_GOALS := help clean image-pull version

ifeq ($(strip $(MAKECMDGOALS)),)
  BUILD_ID_REQUIRED := yes
else
  NON_EXEMPT_GOALS := $(filter-out $(EXEMPT_GOALS),$(MAKECMDGOALS))
  ifeq ($(strip $(NON_EXEMPT_GOALS)),)
    BUILD_ID_REQUIRED := no
  else
    BUILD_ID_REQUIRED := yes
  endif
endif

# ---- 应用版本号组装 ----
VERSION ?= $(IMAGE_SERVER_VERSION)
VERSION_PARTS := $(subst ., ,$(VERSION))
VERSION_PART_COUNT := $(words $(VERSION_PARTS))
ifeq ($(VERSION_PART_COUNT),1)
  APP_VERSION := $(VERSION).0.0
else ifeq ($(VERSION_PART_COUNT),2)
  APP_VERSION := $(VERSION).0
else
  APP_VERSION := $(VERSION)
endif
APP_VERSION_VALID := $(shell printf '%s' '$(APP_VERSION)' | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$$' && printf yes || printf no)
ifeq ($(APP_VERSION_VALID),no)
  $(error VERSION 必须是数字 Semver 核心版本，支持传入 x、x.y 或 x.y.z；当前 VERSION=$(VERSION)，归一化后 APP_VERSION=$(APP_VERSION))
endif
BUILD_DATE := $(shell TZ='Asia/Shanghai' date +%Y%m%d)

ifeq ($(BUILD_ID_REQUIRED),yes)
  ifndef AI_ALBUM_BUILD_ID
    $(error 环境变量 AI_ALBUM_BUILD_ID 未设置。\
	请设置 AI_ALBUM_BUILD_ID 后重试，例如：\
	export AI_ALBUM_BUILD_ID=$$(cat /path/to/build-id) && make <target>)
  endif
endif
BUILD_ID := $(AI_ALBUM_BUILD_ID)
GIT_SHA ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)

ifeq ($(strip $(BUILD_ID)),)
  FULL_VERSION := $(APP_VERSION)-$(BUILD_DATE).<unset>.$(GIT_SHA)
else
  FULL_VERSION := $(APP_VERSION)-$(BUILD_DATE).$(BUILD_ID).$(GIT_SHA)
endif

# ---- 目录与产物路径 ----
SRC_DIR       := src
DIST_DIR      := dist
STAGE_DIR     := $(DIST_DIR)/staging

# 各镜像归档文件名
SERVER_ARCHIVE     := ai-album-server-$(IMAGE_SERVER_VERSION).tar.gz
ML_ARCHIVE         := album-machine-learning-$(IMAGE_ML_VERSION).tar.gz
VALKEY_ARCHIVE     := valkey-$(IMAGE_VALKEY_VERSION).tar.gz
POSTGRES_ARCHIVE   := postgres-$(IMAGE_POSTGRES_VERSION).tar.gz
PROMETHEUS_ARCHIVE := prometheus-$(IMAGE_PROMETHEUS_VERSION).tar.gz
GRAFANA_ARCHIVE    := grafana-$(IMAGE_GRAFANA_VERSION).tar.gz

APP_TARBALL  := $(DIST_DIR)/app.tar.gz
PACKAGE_NAME := $(APP_NAME)_$(FULL_VERSION).tar
PACKAGE_PATH := $(DIST_DIR)/$(PACKAGE_NAME)

APP_FILES := $(notdir $(wildcard $(SRC_DIR)/manifest.yml \
                                  $(SRC_DIR)/docker-compose.yml \
                                  $(SRC_DIR)/configs.yml \
                                  $(SRC_DIR)/routers.yml \
                                  $(SRC_DIR)/traefik.yml \
                                  $(SRC_DIR)/icon.png \
                                  $(SRC_DIR)/README.zh-CN.md \
                                  $(SRC_DIR)/README.en.md))

PROXY_USER    := $(HOME)/.setup_proxy
LOG_DIR       := /tmp

# 列出所有架构的产物路径
ARCH_ASSETS := $(foreach a,$(ARCHS),\
	$(DIST_DIR)/assets/$(a)/$(SERVER_ARCHIVE) \
	$(DIST_DIR)/assets/$(a)/$(ML_ARCHIVE) \
	$(DIST_DIR)/assets/$(a)/$(VALKEY_ARCHIVE) \
	$(DIST_DIR)/assets/$(a)/$(POSTGRES_ARCHIVE) \
	$(DIST_DIR)/assets/$(a)/$(PROMETHEUS_ARCHIVE) \
	$(DIST_DIR)/assets/$(a)/$(GRAFANA_ARCHIVE))

ARCH_SHA256S := $(ARCH_ASSETS:=.sha256)

.PHONY: all package app assets verify clean image-pull help version publish FORCE

all: package

help:
	@echo "AI 相册 VOS 应用打包"
	@echo ""
	@echo "目标："
	@echo "  make package    构建 pull 模式安装包（默认，不含镜像归档）"
	@echo "  make app        仅构建 app.tar.gz"
	@echo "  make assets     仅导出离线镜像资源 + 校验文件（可选，arm64）"
	@echo "  make image-pull 拉取所有镜像（带代理）"
	@echo "  make verify     校验产物结构"
	@echo "  make publish    发布安装包到远端应用目录"
	@echo "  make version    打印当前版本信息"
	@echo "  make clean      清理 dist/"
	@echo ""
	@echo "变量："
	@echo "  AI_ALBUM_BUILD_ID        应用构建序号（环境变量，必填）"
	@echo ""
	@echo "典型调用："
	@echo "  export AI_ALBUM_BUILD_ID=<build-id> && make package"

version:
	@echo "APP_ID                = $(APP_ID)"
	@echo "IMAGE_SERVER_VERSION  = $(IMAGE_SERVER_VERSION)"
	@echo "IMAGE_ML_VERSION      = $(IMAGE_ML_VERSION)"
	@echo "VERSION               = $(VERSION)"
	@echo "APP_VERSION           = $(APP_VERSION)"
	@echo "BUILD_DATE            = $(BUILD_DATE)"
	@echo "BUILD_ID              = $(BUILD_ID)"
	@echo "GIT_SHA               = $(GIT_SHA)"
	@echo "FULL_VERSION          = $(FULL_VERSION)"
	@echo "ARCHS                 = $(ARCHS)"
	@echo "PACKAGE_NAME          = $(PACKAGE_NAME)"

# ----------------------------------------------------------------------------
# 镜像拉取：一次性拉取所有镜像（仅 arm64）
# ----------------------------------------------------------------------------
image-pull:
	@set -e; \
	if [ -f "$(PROXY_USER)" ]; then \
	  echo "    使用用户级代理配置 $(PROXY_USER)"; \
	  set -a; . "$(PROXY_USER)"; set +a; \
	else \
	  echo "    未发现代理配置，直接拉取"; \
	fi; \
	for img in "$(IMAGE_SERVER)" "$(IMAGE_ML)" "$(IMAGE_VALKEY)" "$(IMAGE_POSTGRES)" "$(IMAGE_PROMETHEUS)" "$(IMAGE_GRAFANA)"; do \
	  echo ">>> 拉取 $$img"; \
	  docker pull --platform "linux/arm64" "$$img" 2>&1 \
	    | tee "$(LOG_DIR)/ai-album-pull.log" | tail -n 10; \
	done

# ----------------------------------------------------------------------------
# 单个镜像 pull + save + sha256 规则
# ----------------------------------------------------------------------------
define PULL_SAVE_RULE
$(DIST_DIR)/assets/$(1)/$(2):
	@mkdir -p $$(dir $$@)
	@echo ">>> [$(1)] 拉取镜像 $(3)（platform=linux/$(1)）"
	@set -e; \
	if [ -f "$(PROXY_USER)" ]; then \
	  set -a; . "$(PROXY_USER)"; set +a; \
	fi; \
	docker pull --platform "linux/$(1)" "$(3)" 2>&1 | tail -n 5; \
	echo ">>> [$(1)] 导出镜像 -> $$@"; \
	docker save "$(3)" | gzip > "$$@"

$(DIST_DIR)/assets/$(1)/$(2).sha256: $(DIST_DIR)/assets/$(1)/$(2)
	@echo ">>> [$(1)] 生成 SHA-256 校验文件"
	@cd $$(dir $$@) && sha256sum "$(2)" > "$(2).sha256"
endef

# 为每个架构 + 每个镜像生成规则
$(foreach arch,$(ARCHS),\
  $(eval $(call PULL_SAVE_RULE,$(arch),$(SERVER_ARCHIVE),$(IMAGE_SERVER))) \
  $(eval $(call PULL_SAVE_RULE,$(arch),$(ML_ARCHIVE),$(IMAGE_ML))) \
  $(eval $(call PULL_SAVE_RULE,$(arch),$(VALKEY_ARCHIVE),$(IMAGE_VALKEY))) \
  $(eval $(call PULL_SAVE_RULE,$(arch),$(POSTGRES_ARCHIVE),$(IMAGE_POSTGRES))) \
  $(eval $(call PULL_SAVE_RULE,$(arch),$(PROMETHEUS_ARCHIVE),$(IMAGE_PROMETHEUS))) \
  $(eval $(call PULL_SAVE_RULE,$(arch),$(GRAFANA_ARCHIVE),$(IMAGE_GRAFANA))))

assets: $(ARCH_SHA256S)

# ----------------------------------------------------------------------------
# app.tar.gz：将 src 拷贝到 staging，替换 manifest.yml 中的 version 字段后打包
# ----------------------------------------------------------------------------
app: $(APP_TARBALL)

$(APP_TARBALL): FORCE $(wildcard $(SRC_DIR)/*)
	@rm -rf "$(STAGE_DIR)"
	@mkdir -p "$(STAGE_DIR)"
	@cp -r $(SRC_DIR)/. "$(STAGE_DIR)/"
	@echo ">>> 替换 manifest.yml 中的 version 字段 -> $(FULL_VERSION)"
	@sed -i.bak -E "1,/^version:[[:space:]]+.*/s|^version:[[:space:]]+.*|version: $(FULL_VERSION)|" "$(STAGE_DIR)/manifest.yml"
	@rm -f "$(STAGE_DIR)/manifest.yml.bak"
	@echo ">>> 打包 app.tar.gz: $(APP_FILES)"
	@tar czf "$(APP_TARBALL)" -C "$(STAGE_DIR)" $(APP_FILES)

# ----------------------------------------------------------------------------
# 最终安装包
# ----------------------------------------------------------------------------
package: app
	@echo ">>> 构建安装包 $(PACKAGE_PATH)"
	@tar cf "$(PACKAGE_PATH)" -C "$(DIST_DIR)" app.tar.gz
	@echo ">>> 完成：$(PACKAGE_PATH)"
	@$(MAKE) --no-print-directory verify

# ----------------------------------------------------------------------------
# 产物校验
# ----------------------------------------------------------------------------
verify:
	@echo ">>> 校验 app.tar.gz 内容"
	@tar tzf "$(APP_TARBALL)"
	@echo ">>> 校验 app.tar.gz 中 manifest.yml 的 version 字段"
	@manifest_version="$$(tar xzf "$(APP_TARBALL)" -O manifest.yml | sed -nE '0,/^version:[[:space:]]+/s|^version:[[:space:]]+(.*)|\1|p')"; \
	echo "    manifest.yml version = $$manifest_version"; \
	if [ "$$manifest_version" != "$(FULL_VERSION)" ]; then \
	  echo "    ERROR: 期望 $(FULL_VERSION)" >&2; exit 1; \
	fi
	@echo ">>> 校验 pull 模式安装包内容（应仅包含 app.tar.gz）"
	@tar tf "$(PACKAGE_PATH)"
	@if tar tf "$(PACKAGE_PATH)" | grep -q '^assets/'; then \
	  echo "    ERROR: pull 模式安装包不应包含 assets/" >&2; exit 1; \
	fi

# ----------------------------------------------------------------------------
# 发布
# ----------------------------------------------------------------------------
publish:
	@if [ -z "$(RELEASE_REMOTE_HOST)" ]; then \
		echo "[make][publish] 错误: RELEASE_REMOTE_HOST 未设置" >&2; exit 1; \
	fi
	@if [ -z "$(RELEASE_REMOTE_USER)" ]; then \
		echo "[make][publish] 错误: RELEASE_REMOTE_USER 未设置" >&2; exit 1; \
	fi
	@if [ -z "$(RELEASE_REMOTE_PASSWORD)" ]; then \
		echo "[make][publish] 错误: RELEASE_REMOTE_PASSWORD 未设置" >&2; exit 1; \
	fi
	@if [ ! -f "$(PACKAGE_PATH)" ]; then \
		echo "[make][publish] 错误: 安装包不存在: $(PACKAGE_PATH)" >&2; \
		echo "[make][publish] 请先执行: make package" >&2; exit 1; \
	fi
	$(eval REMOTE_ROOT := $(or $(RELEASE_REMOTE_ROOT),/data/files/component))
	$(eval REMOTE_DIR := $(REMOTE_ROOT)/apps/$(APP_ID)/$(FULL_VERSION))
	@echo "[make][publish] 发布: $(PACKAGE_PATH)"
	@echo "[make][publish] 远端: $(RELEASE_REMOTE_USER)@$(RELEASE_REMOTE_HOST):$(REMOTE_DIR)"
	@SSHPASS="$(RELEASE_REMOTE_PASSWORD)" sshpass -e ssh \
		-o "StrictHostKeyChecking=no" \
		-o "UserKnownHostsFile=/dev/null" \
		-o "LogLevel=ERROR" \
		"$(RELEASE_REMOTE_USER)@$(RELEASE_REMOTE_HOST)" \
		"mkdir -p '$(REMOTE_DIR)'"
	@SSHPASS="$(RELEASE_REMOTE_PASSWORD)" sshpass -e scp \
		-o "StrictHostKeyChecking=no" \
		-o "UserKnownHostsFile=/dev/null" \
		-o "LogLevel=ERROR" \
		"$(PACKAGE_PATH)" \
		"$(RELEASE_REMOTE_USER)@$(RELEASE_REMOTE_HOST):$(REMOTE_DIR)/"
	@echo "[make][publish] 完成"

clean:
	@echo ">>> 清理 $(DIST_DIR)"
	@rm -rf "$(DIST_DIR)"
