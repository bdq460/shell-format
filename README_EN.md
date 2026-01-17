# Shell Format

> Intelligent Shell script formatting and checking tool based on shfmt and shellcheck

**中文版**: [README_CN.md](README.md)

## Quick Start for Developers

### Project Overview

Shell Format is a VSCode extension that provides Shell script formatting and diagnosis features. It adopts a modular architecture with a service layer that encapsulates external tool calls, supporting performance optimizations (caching, parallel diagnosis) and fine-grained configuration management.

### Core Features

- **Formatting** - Automatically format Shell scripts with shfmt
- **Diagnosis** - Detect syntax and semantic errors with shellcheck and shfmt
- **Automatic Diagnosis** - Automatic checking when opening, saving, or editing (500ms debounce)
- **Quick Fixes** - One-click fix for formatting issues

### Developer Documentation

For detailed technical documentation, see [doc/developer/](doc/developer/):

- **[Getting Started Guide](doc/developer/getting-started.md)** - Development environment setup, compilation, debugging
- **[Architecture Design Document](doc/developer/architecture.md)** - Architecture design, module organization, extensibility guide

### Project Structure

```text
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── services/             # Service layer (newly added)
│   │   ├── serviceManager.ts      # Service singleton manager
│   │   ├── shfmtService.ts        # Formatting service
│   │   └── shellcheckService.ts  # Diagnosis service
│   ├── diagnostics/          # Diagnosis module
│   ├── formatters/           # Formatting module
│   ├── providers/            # Provider module
│   ├── commands/             # Command module
│   ├── config/               # Configuration management
│   └── tools/                # Tool layer
└── doc/
    ├── developer/            # Developer documentation
    └── user/                 # User documentation
```

### Technical Architecture

- **Service Layer Pattern** - Encapsulates external tool calls, provides unified service interface
- **Singleton Management** - ServiceManager manages service instances, avoiding duplicate creation
- **Configuration Caching** - Implements configuration snapshot and automatic invalidation based on SettingInfo
- **Performance Optimization** - Diagnostic result caching, parallel diagnosis, debounce mechanism

### Quick Start

```bash
# Install dependencies
npm install

# Watch mode compilation
npm run watch

# Debug
# Press F5 to start VSCode Extension Development Host
```

For more details, refer to the [Getting Started Guide](doc/developer/getting-started.md).

### User Documentation

For end-user documentation, see [doc/user/](doc/user/):

- **Configuration Options** - Complete configuration description
- **Usage Methods** - Formatting, quick fixes, and other operation guides
- **FAQ** - Troubleshooting and common questions

---

## System Requirements

- **Node.js** >= 16.x
- **npm** >= 8.x
- **TypeScript** >= 5.0
- **VSCode** >= 1.74.0

## Links

- [GitHub](https://github.com/bdq460/shell-format)
- [Issues](https://github.com/bdq460/shell-format/issues)
- [License](LICENSE)

## Acknowledgments

Thanks to the following open source tools:

- [shfmt](https://github.com/mvdan/sh) - Shell script formatting tool
- [shellcheck](https://github.com/koalaman/shellcheck) - Shell script static analysis tool
