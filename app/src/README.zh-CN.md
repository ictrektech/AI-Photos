# AI 相册应用

AI 相册，自建照片与视频管理平台。

## 运行说明

| 服务 | 镜像 | 端口 |
| --- | --- | --- |
| immich-server | immich-server | 2283 |
| redis | valkey/valkey | - |
| database | postgres | - |

## 配置项

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `DB_PASSWORD` | `postgres` | PostgreSQL 数据库密码，**务必修改** |
| `DB_USERNAME` | `postgres` | PostgreSQL 数据库用户名 |
| `DB_DATABASE_NAME` | `immich` | 数据库名 |
| `TZ` | `Asia/Shanghai` | 容器时区 |
