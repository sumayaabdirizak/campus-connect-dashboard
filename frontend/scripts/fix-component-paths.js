#!/usr/bin/env node
/**
 * Fix component imports: batch 1 → @/components/<feature>, others → @/features/<feature>/components
 */

const fs = require('fs');
const path = require('path');

const BATCH1 = new Set(['academic-years-admin', 'auth', 'batches', 'batches-admin']);
const SRC = path.join(__dirname, '..', 'src');

let filesFixed = 0;

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // For unmigrated features, revert @/components/<feature> back to @/features/<feature>/components
    // Get all @/components/<feature> imports
    const componentMatches = content.matchAll(/@\/components\/([a-z-]+)/g);
    for (const match of componentMatches) {
      const feature = match[1];
      if (!BATCH1.has(feature)) {
        // This is an unmigrated feature, revert it
        content = content.replace(
          new RegExp(`@/components/${feature}/`, 'g'),
          `@/features/${feature}/components/`
        );
      }
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesFixed++;
      return true;
    }
  } catch (error) {
    // Silently skip
  }
  return false;
}

function walkDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.startsWith('.') || file === 'node_modules') continue;

      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        fixFile(fullPath);
      }
    }
  } catch (error) {
    // Silently skip
  }
}

console.log('\n🔧 Fixing component paths for unmigrated features...\n');

walkDir(SRC);

console.log(`✅ Fixed imports in ${filesFixed} files\n`);
