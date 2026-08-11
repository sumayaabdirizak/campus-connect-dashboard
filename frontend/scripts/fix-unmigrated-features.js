#!/usr/bin/env node
/**
 * Fix imports in unmigrated features back to features/ paths
 */

const fs = require('fs');
const path = require('path');

const BATCH1 = new Set(['academic-years-admin', 'auth', 'batches', 'batches-admin']);
const FEATURES_PATH = path.join(__dirname, '..', 'src', 'features');

let filesFixed = 0;

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // For each batch 1 feature, revert @/lib/<feature> back to @/features/<feature>
    for (const feature of BATCH1) {
      // @/lib/<feature>/queries → @/features/<feature>/api/queries
      content = content.replace(
        new RegExp(`@/lib/${feature}/queries`, 'g'),
        `@/features/${feature}/api/queries`
      );

      // @/lib/<feature>/services → @/features/<feature>/api/service
      content = content.replace(
        new RegExp(`@/lib/${feature}/services`, 'g'),
        `@/features/${feature}/api/service`
      );

      // @/lib/<feature>/(file) → @/features/<feature>/lib/(file)
      content = content.replace(
        new RegExp(`@/lib/${feature}/([^'"]*)`, 'g'),
        (match, file) => {
          if (file && !file.startsWith('queries') && !file.startsWith('services')) {
            return `@/features/${feature}/lib/${file}`;
          }
          return match;
        }
      );

      // @/lib/<feature> → @/features/<feature>/api
      content = content.replace(
        new RegExp(`@/lib/${feature}['"]`, 'g'),
        `@/features/${feature}/api'`
      );

      // @/components/<feature> → @/features/<feature>/components
      content = content.replace(
        new RegExp(`@/components/${feature}/`, 'g'),
        `@/features/${feature}/components/`
      );
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
  return false;
}

console.log('\n🔧 Reverting imports in unmigrated features back to features/ paths...\n');

walkDir(FEATURES_PATH);

console.log(`✅ Fixed imports in ${filesFixed} unmigrated feature files\n`);
