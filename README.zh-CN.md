# PortWarden

[English](README.md) | 简体中文

![PortWarden 横幅头图](docs/images/portwarden-hero-banner.png)

PortWarden 是一款面向开发者的 Windows 桌面应用，用于发现、查看和管理本机正在监听的 TCP 端口、关联进程与本地开发服务。

当前版本聚焦 Windows 本机开发场景，仅扫描 TCP Listening 端口，并依赖 PowerShell 7 的 `pwsh`。

## 界面预览

浅色主题：

![PortWarden 浅色主题界面](docs/images/portwarden-light-theme.png)

深色主题：

![PortWarden 深色主题界面](docs/images/portwarden-dark-theme.png)

## 功能

- 查看本机监听端口、地址、PID、进程名、命令行和可执行文件路径。
- 识别常见本地服务，例如 Vite、Next.js、Webpack、Node.js、FastAPI、Spring Boot、PostgreSQL 和 Redis。
- 基于绑定地址和服务类型提示风险等级。
- 支持搜索、筛选、排序、收藏、忽略和自动刷新。
- 支持打开本地 HTTP 地址、复制文本、打开可执行文件路径。
- 支持结束进程；需要强制结束时会二次确认。
- 默认脱敏命令行中的常见敏感字段。
- 支持浅色、深色和跟随系统主题。

## 要求

- Windows 10/11
- PowerShell 7.x，且 `pwsh` 在 `PATH` 中可用
- Node.js LTS
- pnpm 10

检查 PowerShell：

```powershell
pwsh -NoLogo -NoProfile -Command "$PSVersionTable.PSVersion"
```

## 开发

```bash
pnpm install
pnpm dev
```

常用命令：

| 命令                | 用途                       |
| ------------------- | -------------------------- |
| `pnpm dev`          | 启动开发环境               |
| `pnpm check`        | 格式、lint 和类型检查      |
| `pnpm format`       | 格式化代码                 |
| `pnpm format:check` | 检查格式化状态             |
| `pnpm test`         | 运行单元测试               |
| `pnpm build`        | 构建应用                   |
| `pnpm package:win`  | 构建 Windows portable 版本 |

## 打包

```bash
pnpm package:win
```

产物输出到 `release/`：

```text
release/PortWarden-<version>-portable.exe
```

例如当前版本：

```text
PortWarden-0.1.0-portable.exe
```

Portable 版本无需安装即可运行，但目标机器仍需要安装 PowerShell 7。

## 项目结构

```text
src/
  main/       Electron 主进程、端口扫描、进程操作、偏好读写
  preload/    Renderer 可访问的白名单 IPC API
  renderer/   Vue 3 桌面界面
  shared/     共享类型、脱敏逻辑、服务识别规则
tests/        单元测试
```

## 本地数据

用户偏好保存到 Electron 的 `userData/preferences.json`，包括自动刷新、刷新间隔、语言和主题模式。

收藏和忽略列表目前只保存在当前应用会话中，重启后不会保留。

## 限制

- 仅支持 Windows。
- 仅扫描 TCP Listening 端口。
- 不扫描 UDP。
- 不自动提权，部分进程信息可能不可见。
- 服务识别和风险提示基于启发式规则，可能存在误判。

## 变更日志

版本记录见 [CHANGELOG.zh-CN.md](CHANGELOG.zh-CN.md)。

## 许可证

MIT
