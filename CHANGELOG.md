# Changelog

English | [简体中文](CHANGELOG.zh-CN.md)

This file records notable changes to PortWarden.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and version numbers follow the spirit of Semantic Versioning.

## [0.1.0] - 2026-07-15

### Added

- Added the base Windows desktop app framework built with Electron, electron-vite, Vue 3, and TypeScript.
- Added TCP Listening port scanning through PowerShell 7 `pwsh`.
- Added port-to-process details, including PID, process name, command line, executable path, parent process, start time, CPU, and memory samples.
- Added service detection rules for common local services such as Vite, Next.js, Webpack, Node.js, FastAPI, Python, Spring Boot, PostgreSQL, Redis, and Node Inspector.
- Added risk level hints based on bind addresses and service types.
- Added the port list, service detail panel, search, quick filters, category navigation, and table sorting.
- Added desktop actions for favorites, ignored items, opening local HTTP addresses, copying text, and revealing executable paths.
- Added process termination support, including a second confirmation flow when Windows requires force termination.
- Added command-line sensitive data masking, with common token, password, and API key fields hidden by default.
- Added user preference read/write support for auto-refresh, refresh interval, language, and theme mode.
- Added light, dark, and system theme modes.
- Added the base Chinese and English i18n copy.
- Added Windows portable packaging configuration with output written to `release/`.
- Added Vitest unit tests covering scan result normalization, service detection, sanitization, and taskkill error normalization.

### Known Limitations

- Windows only.
- Scans TCP Listening ports only and does not scan UDP.
- Requires PowerShell 7, with no fallback to Windows PowerShell 5.
- Does not elevate privileges automatically, so some process details may be unavailable.
- Favorites and ignored items are still stored in the UI session and are not persisted after restart.
- Service detection and risk hints are heuristic and may produce false positives or false negatives.
