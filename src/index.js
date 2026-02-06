import { appendFileSync } from 'fs';
import { getChangedFiles, getDeletedFiles, getAllMatchingFiles } from './git-diff.js';
import { syncFiles } from './sync.js';

async function main() {
  // Parse environment variables
  const apiKey = process.env.OUTLINE_API_KEY;
  const baseUrl = process.env.OUTLINE_BASE_URL || 'https://app.getoutline.com';
  const collectionId = process.env.COLLECTION_ID;
  const syncMode = process.env.SYNC_MODE || 'changed';
  const deleteRemoved = process.env.DELETE_REMOVED !== 'false';
  const filePattern = process.env.FILE_PATTERN || '**/*.md';
  const baseRef = process.env.GITHUB_BASE_REF;
  const eventName = process.env.GITHUB_EVENT_NAME;

  // Validate required inputs
  if (!apiKey) {
    console.error('Error: OUTLINE_API_KEY is required');
    process.exit(1);
  }

  if (!collectionId) {
    console.error('Error: COLLECTION_ID is required');
    process.exit(1);
  }

  console.log('Outline Markdown Sync');
  console.log('=====================');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Collection ID: ${collectionId}`);
  console.log(`Sync Mode: ${syncMode}`);
  console.log(`Delete Removed: ${deleteRemoved}`);
  console.log(`File Pattern: ${filePattern}`);
  console.log('');

  let filesToSync = [];
  let filesToDelete = [];

  // Determine files to process based on sync mode
  if (syncMode === 'changed' && eventName === 'pull_request' && baseRef) {
    console.log(`Detecting changes against origin/${baseRef}...`);
    filesToSync = getChangedFiles(`origin/${baseRef}`, filePattern);
    filesToDelete = deleteRemoved ? getDeletedFiles(`origin/${baseRef}`, filePattern) : [];
  } else {
    console.log('Running full sync of all matching files...');
    filesToSync = await getAllMatchingFiles(filePattern);
    filesToDelete = []; // Full sync doesn't delete (no way to know what was removed)
  }

  console.log(`Files to sync: ${filesToSync.length}`);
  console.log(`Files to delete: ${filesToDelete.length}`);
  console.log('');

  if (filesToSync.length === 0 && filesToDelete.length === 0) {
    console.log('No files to process');
    writeOutputs({ synced: 0, deleted: 0, failed: 0 });
    return;
  }

  // Run sync
  const results = await syncFiles({
    apiKey,
    baseUrl,
    collectionId,
    filesToSync,
    filesToDelete,
    deleteRemoved,
  });

  // Report results
  console.log('');
  console.log('Results');
  console.log('=======');
  console.log(`Synced: ${results.synced}`);
  console.log(`Deleted: ${results.deleted}`);
  console.log(`Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('');
    console.log('Errors:');
    for (const err of results.errors) {
      console.log(`  ${err.file}: ${err.error}`);
    }
  }

  // Write outputs
  writeOutputs(results);

  // Exit with error if any failures
  if (results.failed > 0) {
    process.exit(1);
  }
}

function writeOutputs(results) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `synced_count=${results.synced}\n`);
    appendFileSync(outputFile, `deleted_count=${results.deleted}\n`);
    appendFileSync(outputFile, `failed_count=${results.failed}\n`);
  }
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
