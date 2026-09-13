#!/usr/bin/env node
/**
 * Update imports after announcements folder restructuring
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

function updateImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Update queries imports
  content = content.replace(
    /from ['"]@\/lib\/announcements\/queries['"]/g,
    "from '@/lib/announcements/queries'"
  );
  content = content.replace(
    /from ['"]@\/lib\/announcements['"](?!\/)/g,
    "from '@/lib/announcements/queries'"
  );

  // Update service imports
  content = content.replace(
    /from ['"]@\/lib\/announcements\/service['"]/g,
    "from '@/lib/announcements/services'"
  );

  // Update specific query hook imports
  content = content.replace(
    /from ['"]@\/lib\/announcements\/use-announcement-analytics['"]/g,
    "from '@/lib/announcements/queries/use-announcement-analytics'"
  );
  content = content.replace(
    /from ['"]@\/lib\/announcements\/use-announcement-socket['"]/g,
    "from '@/lib/announcements/queries/use-announcement-socket'"
  );

  // Update specific service imports
  content = content.replace(
    /from ['"]@\/lib\/announcements\/announcement-socket-/g,
    "from '@/lib/announcements/services/announcement-socket-"
  );
  content = content.replace(
    /from ['"]@\/lib\/announcements\/announcementAudienceFilter['"]/g,
    "from '@/lib/announcements/services/announcementAudienceFilter'"
  );
  content = content.replace(
    /from ['"]@\/lib\/announcements\/announcementPin['"]/g,
    "from '@/lib/announcements/services/announcementPin'"
  );
  content = content.replace(
    /from ['"]@\/lib\/announcements\/bookmark-store['"]/g,
    "from '@/lib/announcements/services/bookmark-store'"
  );
  content = content.replace(
    /from ['"]@\/lib\/announcements\/socket-payloads['"]/g,
    "from '@/lib/announcements/services/socket-payloads'"
  );

  // Update types imports (keep at root)
  content = content.replace(
    /from ['"]@\/lib\/announcements\/types['"]/g,
    "from '@/lib/announcements/types'"
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let count = 0;

  for (const file of files) {
    if (file.startsWith('.')) continue;
    if (file === 'node_modules') continue;

    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      count += walkDir(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (updateImportsInFile(fullPath)) {
        count++;
      }
    }
  }

  return count;
}

console.log('🔄 Updating imports across codebase...\n');

const updateCount = walkDir(SRC);

console.log(`✓ Updated imports in ${updateCount} files\n`);
