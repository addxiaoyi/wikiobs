# WIKIOBS

WIKIOBS is a local-first desktop workspace for building and exploring a personal knowledge base. Write Markdown notes, connect ideas with backlinks and a knowledge graph, search locally, and use AI tools with the model provider you choose.

## Download

Get the latest WIKIOBS desktop installer for Windows, macOS, or Linux from [GitHub Releases](https://github.com/addxiaoyi/wikiobs/releases). If no release is listed yet, use the source setup below.

## Features

- Markdown editing and local file management
- Full-text and semantic search with related-note discovery
- Backlinks and an interactive knowledge graph
- Local LLMs and OpenAI-compatible providers
- AI-assisted note organization and cancellable scheduled tasks
- Wiki import with progress, cancellation, and retry support
- Multiple Vaults with per-window data isolation
- Built-in plugin catalog and local plugin installation

## Requirements

- Node.js 20 or newer
- npm
- Windows, macOS, or Linux for development; some Electron end-to-end checks are Windows-only

## Quick Start

```bash
git clone https://github.com/addxiaoyi/wikiobs.git
cd wikiobs
npm install
npm run dev
```

On first launch, choose a Vault folder for your notes. Configure an embedding model and an LLM provider in Settings to enable semantic search and AI features.

## Development Commands

```bash
npm run type-check
npm test
npm run lint
npm run build
```

Run the two-window Vault isolation check on Windows:

```bash
npm run e2e:multivault-two-windows
```

## Plugins

Plugins can be installed from the in-app catalog or from a local directory or ZIP package. A plugin package contains a `manifest.json` and the entry file declared by its manifest.

Plugins execute in the Electron main process and can affect application behavior. Install only plugins you trust, and review their declared permissions. File access through the plugin API is restricted to the active Vault context.

## Repository Layout

- `src/` - React renderer and application interface
- `electron/main/` - Electron main process, IPC handlers, and services
- `electron/preload/` - renderer-facing bridge APIs
- `plugins/` - bundled first-party plugins
- `scripts/` - development and end-to-end checks
- `public/` and `build/` - application assets

## Privacy

Notes and indexes are stored locally. When you configure a remote model provider, requests sent to that provider are governed by its own privacy policy. Review provider settings before sending note content to external services.

## License

WIKIOBS is licensed under AGPL-3.0. See [LICENSE](LICENSE).
