#!/usr/bin/env node
/**
 * Fix relative imports in migrated component files
 */

const fs = require('fs');
const path = require('path');

const COMPONENTS_PATH = path.join(__dirname, '..', 'src', 'components');
const BATCH_FEATURES = ['academic-years-admin', 'admin', 'auth', 'batches', 'batches-admin'];

function fixComponentImports(featureName) {
  const featurePath = path.join(COMPONENTS_PATH, featureName);

  if (!fs.existsSync(featurePath)) {
    return 0;
  }

  let count = 0;
  const files = fs.readdirSync(featurePath).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

  for (const file of files) {
    const filePath = path.join(featurePath, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Fix ../api/queries → @/lib/<feature>/queries
    content = content.replace(/from ['"]\.\.\/api\/queries['"]/g, `from '@/lib/${featureName}/queries'`);
    content = content.replace(/from ['"]\.\.\/api\/service['"]/g, `from '@/lib/${featureName}/services'`);

    // Fix ../lib/* → @/lib/<feature>/services/*
    content = content.replace(
      /from ['"]\.\.\/lib\/([^'"]+)['"]/g,
      `from '@/lib/${featureName}/services/$1'`
    );

    // Fix ../../lib/* → @/lib/* (for shared lib imports)
    content = content.replace(/from ['"]\.\.\/\.\.\/lib\//g, "from '@/lib/");

    // Fix ../../features/* → @/lib/* (for other feature imports)
    content = content.replace(/from ['"]\.\.\/\.\.\/features\/([^/]+)\//g, "from '@/lib/$1/");
    content = content.replace(/from ['"]\.\.\/\.\.\/features\/([^'"]+)['"]/g, "from '@/lib/$1/queries'");

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      count++;
    }
  }

  return count;
}

console.log('\n🔧 Fixing component relative imports...\n');

let totalUpdated = 0;
for (const feature of BATCH_FEATURES) {
  const updated = fixComponentImports(feature);
  if (updated > 0) {
    console.log(`  ✓ ${feature}: updated ${updated} files`);
    totalUpdated += updated;
  }
}

console.log(`\n✅ Updated ${totalUpdated} component files\n`);
