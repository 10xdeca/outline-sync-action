import { readFileSync } from 'fs';
import { OutlineClient } from './outline-client.js';

/**
 * Build an index of existing documents in the collection
 * Returns a Map of title -> document
 */
async function buildDocumentIndex(client, collectionId) {
  console.log('Building document index from Outline...');
  const documents = await client.listDocuments(collectionId);
  const index = new Map();

  for (const doc of documents) {
    index.set(doc.title, doc);
  }

  console.log(`Found ${index.size} existing documents in collection`);
  return index;
}

/**
 * Sync files to Outline
 */
export async function syncFiles(config) {
  const {
    apiKey,
    baseUrl,
    collectionId,
    filesToSync,
    filesToDelete,
    deleteRemoved,
  } = config;

  const client = new OutlineClient(apiKey, baseUrl);
  const results = {
    synced: 0,
    deleted: 0,
    failed: 0,
    errors: [],
  };

  // Build index of existing documents
  const docIndex = await buildDocumentIndex(client, collectionId);

  // Process files to sync (create/update)
  for (const filePath of filesToSync) {
    try {
      console.log(`Processing: ${filePath}`);

      const content = readFileSync(filePath, 'utf-8');
      const title = filePath; // Use file path as title

      const existingDoc = docIndex.get(title);

      if (existingDoc) {
        console.log(`  Updating existing document: ${existingDoc.id}`);
        await client.updateDocument(existingDoc.id, title, content);
      } else {
        console.log(`  Creating new document`);
        await client.createDocument(title, content, collectionId);
      }

      results.synced++;
    } catch (error) {
      console.error(`  Failed: ${error.message}`);
      results.failed++;
      results.errors.push({ file: filePath, error: error.message });
    }
  }

  // Process files to delete
  if (deleteRemoved && filesToDelete.length > 0) {
    console.log(`\nProcessing ${filesToDelete.length} deletions...`);

    for (const filePath of filesToDelete) {
      try {
        console.log(`Deleting: ${filePath}`);

        const existingDoc = docIndex.get(filePath);

        if (existingDoc) {
          await client.deleteDocument(existingDoc.id);
          results.deleted++;
          console.log(`  Deleted document: ${existingDoc.id}`);
        } else {
          console.log(`  Document not found in Outline, skipping`);
        }
      } catch (error) {
        console.error(`  Failed to delete: ${error.message}`);
        results.failed++;
        results.errors.push({ file: filePath, error: error.message });
      }
    }
  }

  return results;
}
