#!/usr/bin/env node
/**
 * Refactor announcements feature from features/ to lib/ and components/
 * Carefully moves files and updates all imports
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const FEATURES_ANN = path.join(SRC, 'features', 'announcements');
const LIB_ANN = path.join(SRC, 'lib', 'announcements');
const COMP_ANN = path.join(SRC, 'components', 'announcements');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyDir(src, dst) {
  ensureDir(dst);
  const files = fs.readdirSync(src);

  for (const file of files) {
    const srcPath = path.join(src, file);
    const dstPath = path.join(dst, file);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function updateImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Update imports from features/announcements to new locations
  content = content.replace(
    /@\/features\/announcements\/api\//g,
    '@/lib/announcements/'
  );
  content = content.replace(
    /@\/features\/announcements\/lib\//g,
    '@/lib/announcements/'
  );
  content = content.replace(
    /@\/features\/announcements\/utils\//g,
    '@/lib/announcements/'
  );
  content = content.replace(
    /@\/features\/announcements\/components\//g,
    '@/components/announcements/'
  );

  // Remove diagnostic imports (they were debug-only)
  content = content.replace(/import.*agentDebugLog.*;\n/g, '');
  content = content.replace(/import.*useAnnouncementDiagnostics.*;\n/g, '');
  content = content.replace(/import.*announcement-socket-diagnostics.*;\n/g, '');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function updateAllImports() {
  const allFiles = [];

  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.startsWith('.') || file === 'node_modules') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        allFiles.push(fullPath);
      }
    }
  }

  walkDir(SRC);

  let updateCount = 0;
  for (const file of allFiles) {
    if (updateImportsInFile(file)) {
      updateCount++;
    }
  }

  return updateCount;
}

function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

console.log('📦 Starting careful refactor...\n');

console.log('1️⃣  Copying API/utils files to lib/announcements/');
ensureDir(LIB_ANN);
const apiPath = path.join(FEATURES_ANN, 'api');
const utilsPath = path.join(FEATURES_ANN, 'utils');
const diagPath = path.join(FEATURES_ANN, 'diagnostics');
if (fs.existsSync(apiPath)) copyDir(apiPath, LIB_ANN);
if (fs.existsSync(utilsPath)) copyDir(utilsPath, LIB_ANN);
if (fs.existsSync(diagPath)) copyDir(diagPath, path.join(LIB_ANN, 'diagnostics'));
console.log('   ✓ Done\n');

console.log('2️⃣  Copying components to components/announcements/');
ensureDir(COMP_ANN);
copyDir(path.join(FEATURES_ANN, 'components'), COMP_ANN);
console.log('   ✓ Done\n');

console.log('3️⃣  Updating imports across entire src/');
const updateCount = updateAllImports();
console.log(`   ✓ Updated ${updateCount} files\n`);

console.log('4️⃣  Deleting old features/announcements/');
removeDir(FEATURES_ANN);
console.log('   ✓ Done\n');

console.log('✅ Refactor complete!\n');
console.log('New structure:');
console.log('  • src/lib/announcements/');
console.log('  • src/components/announcements/\n');
