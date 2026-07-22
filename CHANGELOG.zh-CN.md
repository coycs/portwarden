# 变更日志

[English](CHANGELOG.md) | 简体中文

本文档记录 PortWarden 的重要变更。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循语义化版本思路。

## [0.1.0] - 2026-07-15

### Added

- 新增 Windows 桌面应用基础框架，基于 Electron、electron-vite、Vue 3 和 TypeScript。
- 新增 TCP Listening 端口扫描能力，通过 PowerShell 7 `pwsh` 获取本机监听端口。
- 新增端口到进程的关联展示，包括 PID、进程名、命令行、可执行文件路径、父进程、启动时间、CPU 和内存采样。
- 新增服务识别规则，支持识别 Vite、Next.js、Webpack、Node.js、FastAPI、Python、Spring Boot、PostgreSQL、Redis 和 Node Inspector 等常见本地服务。
- 新增基于绑定地址和服务类型的风险等级提示。
- 新增端口列表、服务详情面板、搜索、快速筛选、分类导航和表格排序。
- 新增收藏、忽略、打开本地 HTTP 地址、复制文本、打开可执行文件路径等桌面操作。
- 新增停止进程能力，并在 Windows 要求强制结束时提供二次确认流程。
- 新增命令行敏感信息脱敏，默认遮蔽常见 token、password 和 API key 字段。
- 新增用户偏好读写，支持自动刷新、刷新间隔、语言和主题模式。
- 新增浅色、深色和跟随系统主题。
- 新增中英文 i18n 文案基础。
- 新增 Windows portable 打包配置，输出到 `release/`。
- 新增 Vitest 单元测试，覆盖扫描结果归一化、服务识别、脱敏和 taskkill 错误归一化。

### Known Limitations

- 当前仅支持 Windows。
- 当前仅扫描 TCP Listening 端口，不扫描 UDP。
- 当前要求 PowerShell 7，不回退到 Windows PowerShell 5。
- 当前不自动提权，部分进程信息可能无法读取。
- 收藏和忽略列表目前仍是界面会话状态，重启应用后不会持久化。
- 服务识别和风险提示基于启发式规则，可能存在误判或漏判。
