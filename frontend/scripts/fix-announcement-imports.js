#!/usr/bin/env node
/**
 * Fix relative imports in announcement components to absolute imports
 */

const fs = require('fs');
const path = require('path');

const COMP_ANN = path.join(__dirname, '..', 'src', 'components', 'announcements');

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Fix all relative imports to absolute ones
  // ../api/* → @/lib/announcements/*
  content = content.replace(/from\s+['"]\.\.\/api\//g, "from '@/lib/announcements/");
  // ../utils/* → @/lib/announcements/*
  content = content.replace(/from\s+['"]\.\.\/utils\//g, "from '@/lib/announcements/");
  // ../../api/* → @/lib/announcements/*
  content = content.replace(/from\s+['"]\.\.\/\.\.\/api\//g, "from '@/lib/announcements/");
  // ../../utils/* → @/lib/announcements/*
  content = content.replace(/from\s+['"]\.\.\/\.\.\/utils\//g, "from '@/lib/announcements/");
  // ../../lib/* → @/lib/announcements/*
  content = content.replace(/from\s+['"]\.\.\/\.\.\/lib\//g, "from '@/lib/announcements/");

  // Remove diagnostic imports
  content = content.replace(/import.*agentDebugLog.*;\n/g, '');
  content = content.replace(/import.*useAnnouncementDiagnostics.*;\n/g, '');
  content = content.replace(/import.*announcement-socket-diagnostics.*;\n/g, '');

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
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      count += walkDir(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (fixImportsInFile(fullPath)) {
        count++;
      }
    }
  }

  return count;
}

console.log('🔧 Fixing relative imports in announcement components...\n');

const count = walkDir(COMP_ANN);

console.log(`✓ Fixed imports in ${count} component files\n`);
