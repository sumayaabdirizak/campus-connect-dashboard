#!/usr/bin/env node
/**
 * Fix remaining import issues after batch migration
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.join(__dirname, '..');
const SRC = path.join(FRONTEND_ROOT, 'src');

let filesFixed = 0;

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Fix ../api/service imports to './index' (for files in services/)
    content = content.replace(/from ['"]\.\.\/api\/service['"]/g, "from './index'");

    // Fix all service (singular) imports to services (plural) in absolute paths
    content = content.replace(/@\/lib\/([^/]+)\/service(['"])/g, "@/lib/$1/services$2");

    // Fix admin/admin-api references (needs to check if admin-api exists)
    // For now, just map to @/lib/admin
    content = content.replace(/@\/lib\/admin\/admin-api/g, "@/lib/admin");

    // Fix old features/ references in features/ files to lib/
    content = content.replace(/@\/features\/([^/]+)\/api\//g, "@/lib/$1/");
    content = content.replace(/@\/features\/([^/]+)\/lib\//g, "@/lib/$1/services/");
    content = content.replace(/@\/features\/([^/]+)\/components\//g, "@/components/$1/");
    content = content.replace(/@\/features\/([^/]+)['"](?!\/)/g, "@/lib/$1/queries'");

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

console.log('\n🔧 Fixing remaining import issues...\n');

walkDir(SRC);

console.log(`✅ Fixed imports in ${filesFixed} files\n`);
