#!/usr/bin/env node
/**
 * Fix cross-feature imports in batch 1 that reference non-migrated features
 */

const fs = require('fs');
const path = require('path');

const BATCH1_FEATURES = new Set(['academic-years-admin', 'admin', 'auth', 'batches', 'batches-admin']);
// Features that haven't been migrated yet
const UNMIGRATED_FEATURES = new Set([
  'calendar', 'clubs', 'course-details', 'courses-admin', 'dean', 'departments',
  'discussions', 'faculties', 'inbox', 'nav', 'notifications', 'offices',
  'overview', 'profile', 'programs', 'reports', 'roles', 'student-courses',
  'teacher-courses', 'users'
]);

const BATCH1_PATHS = [
  path.join(__dirname, '..', 'src', 'lib', 'academic-years-admin'),
  path.join(__dirname, '..', 'src', 'lib', 'admin'),
  path.join(__dirname, '..', 'src', 'lib', 'auth'),
  path.join(__dirname, '..', 'src', 'lib', 'batches'),
  path.join(__dirname, '..', 'src', 'lib', 'batches-admin'),
  path.join(__dirname, '..', 'src', 'components', 'academic-years-admin'),
  path.join(__dirname, '..', 'src', 'components', 'admin'),
  path.join(__dirname, '..', 'src', 'components', 'auth'),
  path.join(__dirname, '..', 'src', 'components', 'batches'),
  path.join(__dirname, '..', 'src', 'components', 'batches-admin'),
];

let filesFixed = 0;

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Fix imports from @/lib/<unmigrated> back to @/features/<unmigrated>
    for (const feature of UNMIGRATED_FEATURES) {
      // Fix @/lib/<feature>/queries → @/features/<feature>/api/queries
      content = content.replace(
        new RegExp(`from ['"]@/lib/${feature}/queries['"]`, 'g'),
        `from '@/features/${feature}/api/queries'`
      );

      // Fix @/lib/<feature>/services → @/features/<feature>/api/service
      content = content.replace(
        new RegExp(`from ['"]@/lib/${feature}/services['"]`, 'g'),
        `from '@/features/${feature}/api/service'`
      );

      // Fix @/lib/<feature>/<file> → @/features/<feature>/lib/<file>
      content = content.replace(
        new RegExp(`from ['"]@/lib/${feature}/([^'"]*)['"]`, 'g'),
        (match, file) => {
          if (file && !file.startsWith('queries') && !file.startsWith('services')) {
            return `from '@/features/${feature}/lib/${file}'`;
          }
          return match;
        }
      );

      // Fix @/lib/<feature> without subpath → @/features/<feature>/api
      content = content.replace(
        new RegExp(`from ['"]@/lib/${feature}['"]`, 'g'),
        `from '@/features/${feature}/api'`
      );

      // Fix @/components/<feature> that should be @/features/<feature>/components
      // (Only for unmigrated features)
      content = content.replace(
        new RegExp(`from ['"]@/components/${feature}/(['"][^;]*)`, 'g'),
        `from '@/features/${feature}/components/$1`
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
      if (file.startsWith('.')) continue;

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

console.log('\n🔧 Fixing cross-feature imports in batch 1...\n');

for (const batchPath of BATCH1_PATHS) {
  if (fs.existsSync(batchPath)) {
    walkDir(batchPath);
  }
}

console.log(`✅ Fixed imports in ${filesFixed} batch 1 files\n`);
