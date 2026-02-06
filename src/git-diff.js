import { execSync } from 'child_process';
import { glob } from 'glob';
import { minimatch } from 'minimatch';

/**
 * Get files that were added or modified compared to a base ref
 */
export function getChangedFiles(baseRef, pattern) {
  try {
    const output = execSync(
      `git diff --name-only --diff-filter=AM ${baseRef}...HEAD`,
      { encoding: 'utf-8' }
    );

    const files = output.trim().split('\n').filter(Boolean);
    return filterByPattern(files, pattern);
  } catch (error) {
    console.error(`Error getting changed files: ${error.message}`);
    return [];
  }
}

/**
 * Get files that were deleted compared to a base ref
 */
export function getDeletedFiles(baseRef, pattern) {
  try {
    const output = execSync(
      `git diff --name-only --diff-filter=D ${baseRef}...HEAD`,
      { encoding: 'utf-8' }
    );

    const files = output.trim().split('\n').filter(Boolean);
    return filterByPattern(files, pattern);
  } catch (error) {
    console.error(`Error getting deleted files: ${error.message}`);
    return [];
  }
}

/**
 * Get all files matching a glob pattern
 */
export async function getAllMatchingFiles(pattern) {
  const files = await glob(pattern, {
    nodir: true,
    ignore: ['node_modules/**', '.git/**'],
  });
  return files;
}

/**
 * Filter a list of files by a glob pattern
 */
function filterByPattern(files, pattern) {
  return files.filter(file => minimatch(file, pattern));
}
