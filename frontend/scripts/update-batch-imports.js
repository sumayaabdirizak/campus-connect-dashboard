#!/usr/bin/env node
/**
 * Update imports after batch migration
 * Changes references from features/<feature> to lib/<feature> and components/<feature>
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.join(__dirname, '..');
const SRC = path.join(FRONTEND_ROOT, 'src');

const BATCH_FEATURES = ['academic-years-admin', 'admin', 'auth', 'batches', 'batches-admin'];

const IMPORT_PATTERNS = [
  {
    from: /from ['"]@\/features\/([^/]+)\/api\//g,
    to: (match, feature) => {
      if (BATCH_FEATURES.includes(feature)) {
        return `from '@/lib/${feature}/`;
      }
      return match;
    }
  },
  {
    from: /from ['"]@\/features\/([^/]+)\/lib\//g,
    to: (match, feature) => {
      if (BATCH_FEATURES.includes(feature)) {
        return `from '@/lib/${feature}/services/`;
      }
      return match;
    }
  },
  {
    from: /from ['"]@\/features\/([^/]+)\/components\//g,
    to: (match, feature) => {
      if (BATCH_FEATURES.includes(feature)) {
        return `from '@/components/${feature}/`;
      }
      return match;
    }
  },
  {
    from: /from ['"]@\/features\/([^/]+)['"]/g,
    to: (match, feature) => {
      if (BATCH_FEATURES.includes(feature)) {
        // Default to queries for direct feature imports
        return `from '@/lib/${feature}/queries'`;
      }
      return match;
    }
  },
];

let filesUpdated = 0;

function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    for (const pattern of IMPORT_PATTERNS) {
      content = content.replace(pattern.from, pattern.to);
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesUpdated++;
      return true;
    }
  } catch (error) {
    // Silently skip unreadable files
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
        updateImportsInFile(fullPath);
      }
    }
  } catch (error) {
    // Silently skip on permission errors
  }
}

console.log('\n🔄 Updating imports for batch migrated features...\n');

walkDir(SRC);

console.log(`✅ Updated imports in ${filesUpdated} files\n`);
