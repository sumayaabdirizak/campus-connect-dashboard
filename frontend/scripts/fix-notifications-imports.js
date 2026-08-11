#!/usr/bin/env node
/**
 * Fix notifications imports - they should come from @/lib/notifications, not @/features
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

let filesFixed = 0;

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Fix @/features/notifications back to @/lib/notifications
    content = content.replace(/@\/features\/notifications\/api/g, '@/lib/notifications');
    content = content.replace(/@\/features\/notifications(['"'])/g, "@/lib/notifications$1");

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

console.log('\n🔧 Fixing notifications imports...\n');

walkDir(SRC);

console.log(`✅ Fixed ${filesFixed} files\n`);
