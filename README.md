# Outline Markdown Sync

A GitHub Action that syncs markdown files from your repository to an [Outline](https://www.getoutline.com/) knowledge base. The repository is the source of truth.

## Features

- Syncs markdown files to Outline documents
- Uses file paths as document titles (e.g., `docs/setup.md`)
- Supports incremental sync (only changed files on PR) or full sync
- Deletes documents when source files are removed
- Handles rate limits with exponential backoff
- Works with self-hosted Outline instances

## Usage

### Basic Example

```yaml
name: Sync Docs to Outline
on:
  pull_request:
    paths: ['**/*.md']

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for git diff

      - uses: 10xdeca/outline-sync-action@main
        with:
          outline_api_key: ${{ secrets.OUTLINE_API_KEY }}
          collection_id: ${{ secrets.OUTLINE_COLLECTION_ID }}
```

### Full Sync on Push to Main

```yaml
name: Full Docs Sync
on:
  push:
    branches: [main]
    paths: ['docs/**/*.md']

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: 10xdeca/outline-sync-action@main
        with:
          outline_api_key: ${{ secrets.OUTLINE_API_KEY }}
          collection_id: ${{ secrets.OUTLINE_COLLECTION_ID }}
          sync_mode: full
          file_pattern: 'docs/**/*.md'
```

### Self-Hosted Outline

```yaml
- uses: 10xdeca/outline-sync-action@main
  with:
    outline_api_key: ${{ secrets.OUTLINE_API_KEY }}
    collection_id: ${{ secrets.OUTLINE_COLLECTION_ID }}
    outline_base_url: 'https://outline.yourcompany.com'
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `outline_api_key` | Yes | - | API key for Outline authentication |
| `collection_id` | Yes | - | Target collection ID in Outline |
| `outline_base_url` | No | `https://app.getoutline.com` | Base URL for self-hosted instances |
| `sync_mode` | No | `changed` | `changed` (only changed files on PR) or `full` (all files) |
| `delete_removed` | No | `true` | Delete documents from Outline when source files are deleted |
| `file_pattern` | No | `**/*.md` | Glob pattern for files to sync |
| `exclude_pattern` | No | - | Comma-separated glob patterns to exclude (e.g. `CLAUDE.md,**/CLAUDE.md`) |

## Outputs

| Output | Description |
|--------|-------------|
| `synced_count` | Number of documents created or updated |
| `deleted_count` | Number of documents deleted |
| `failed_count` | Number of operations that failed |

## How It Works

1. **Changed mode** (default on PRs): Uses `git diff` to detect added, modified, and deleted files
2. **Full mode**: Syncs all files matching the pattern
3. Documents are identified by title (which matches the file path)
4. Existing documents are updated; new files create new documents
5. Deleted files result in deleted documents (when `delete_removed` is true)

## Getting Your Outline API Key

1. Go to your Outline settings
2. Navigate to **API** section
3. Create a new API key
4. Store it as a GitHub secret (e.g., `OUTLINE_API_KEY`)

## Getting a Collection ID

1. Open the collection in Outline
2. The collection ID is in the URL: `https://app.getoutline.com/collection/<collection-id>`
3. Store it as a GitHub secret (e.g., `OUTLINE_COLLECTION_ID`)

## Important Notes

- **Checkout depth**: Use `fetch-depth: 0` with `actions/checkout` for changed-file detection to work
- **Document titles**: File paths are used as titles. `docs/setup.md` creates a document titled "docs/setup.md"
- **Rate limits**: The action handles Outline's rate limits with automatic retry and exponential backoff
- **Partial failures**: If some files fail to sync, the action continues with others and reports failures at the end

## Error Handling

The action will:
- Retry failed requests up to 3 times with exponential backoff
- Continue processing remaining files after individual failures
- Exit with code 1 if any operations failed
- Report all errors in the action output

## License

MIT
