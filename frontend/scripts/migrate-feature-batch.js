#!/usr/bin/env node
/**
 * Migrate feature modules from features/ to lib/ with queries/services structure
 * Usage: node migrate-feature-batch.js feature1 feature2 feature3...
 */

const fs = require('fs');
const path = require('path');

const FEATURES = process.argv.slice(2);
const FRONTEND_ROOT = path.join(__dirname, '..');
const FEATURES_PATH = path.join(FRONTEND_ROOT, 'src', 'features');
const LIB_PATH = path.join(FRONTEND_ROOT, 'src', 'lib');
const COMPONENTS_PATH = path.join(FRONTEND_ROOT, 'src', 'components');

if (!FEATURES.length) {
  console.error('Usage: node migrate-feature-batch.js feature1 feature2...');
  process.exit(1);
}

// File categorization patterns
const QUERY_PATTERNS = [
  /queries?\.(ts|tsx)$/i,
  /use-.*\.(ts|tsx)$/i,
  /hooks?\.(ts|tsx)$/i,
  /api\.(ts|tsx)$/i,
  /fetch.*\.(ts|tsx)$/i,
];

const SERVICE_PATTERNS = [
  /service[s]?\.(ts|tsx)$/i,
  /handler[s]?\.(ts|tsx)$/i,
  /transform[er]?[s]?\.(ts|tsx)$/i,
  /util[s]?\.(ts|tsx)$/i,
  /helper[s]?\.(ts|tsx)$/i,
  /socket.*\.(ts|tsx)$/i,
  /store\.(ts|tsx)$/i,
];

function categorizeFile(filename) {
  if (/types?\.(ts|tsx)$/.test(filename)) return 'types';
  if (/components?\.(ts|tsx)$/.test(filename)) return 'component';
  if (/^index\./.test(filename)) return 'skip';
  if (QUERY_PATTERNS.some(p => p.test(filename))) return 'queries';
  if (SERVICE_PATTERNS.some(p => p.test(filename))) return 'services';
  return 'unknown';
}

function migrateFeature(featureName) {
  console.log(`\n🔄 Migrating ${featureName}...`);

  const featurePath = path.join(FEATURES_PATH, featureName);

  if (!fs.existsSync(featurePath)) {
    console.error(`  ❌ Feature path not found: ${featurePath}`);
    return false;
  }

  try {
    // Create lib structure
    const libFeaturePath = path.join(LIB_PATH, featureName);
    const queriesPath = path.join(libFeaturePath, 'queries');
    const servicesPath = path.join(libFeaturePath, 'services');

    fs.mkdirSync(queriesPath, { recursive: true });
    fs.mkdirSync(servicesPath, { recursive: true });

    // Migrate files from features/feature/api/ or features/feature/
    const srcDirs = ['api', 'utils', 'lib', ''];
    const migratedFiles = { queries: 0, services: 0, types: 0, components: 0 };

    for (const srcDir of srcDirs) {
      const searchPath = srcDir ? path.join(featurePath, srcDir) : featurePath;

      if (!fs.existsSync(searchPath)) continue;

      const files = fs.readdirSync(searchPath).filter(f =>
        (f.endsWith('.ts') || f.endsWith('.tsx')) && f !== 'index.ts'
      );

      for (const file of files) {
        const srcFile = path.join(searchPath, file);
        const category = categorizeFile(file);

        if (category === 'skip') continue;
        if (category === 'unknown') continue; // Skip unknown categorization

        if (category === 'types') {
          const destFile = path.join(libFeaturePath, 'types.ts');
          // Merge types if multiple type files exist
          if (!fs.existsSync(destFile)) {
            fs.copyFileSync(srcFile, destFile);
          }
          migratedFiles.types++;
        } else if (category === 'queries') {
          const destFile = path.join(queriesPath, file);
          fs.copyFileSync(srcFile, destFile);
          migratedFiles.queries++;
        } else if (category === 'services') {
          const destFile = path.join(servicesPath, file);
          fs.copyFileSync(srcFile, destFile);
          migratedFiles.services++;
        } else if (category === 'component') {
          // Components stay in components/ folder
          migratedFiles.components++;
        }
      }
    }

    // Create index files if not exist
    if (!fs.existsSync(path.join(queriesPath, 'index.ts'))) {
      fs.writeFileSync(path.join(queriesPath, 'index.ts'), '// Query hooks and API calls\n');
    }
    if (!fs.existsSync(path.join(servicesPath, 'index.ts'))) {
      fs.writeFileSync(path.join(servicesPath, 'index.ts'), '// Business logic and services\n');
    }

    console.log(`  ✓ Created lib/${featureName}/ structure`);
    console.log(`    • Queries: ${migratedFiles.queries} files`);
    console.log(`    • Services: ${migratedFiles.services} files`);
    console.log(`    • Types: ${migratedFiles.types} files`);

    return true;
  } catch (error) {
    console.error(`  ❌ Error migrating ${featureName}:`, error.message);
    return false;
  }
}

console.log(`\n📦 Starting migration of ${FEATURES.length} features...`);

let successCount = 0;
for (const feature of FEATURES) {
  if (migrateFeature(feature)) {
    successCount++;
  }
}

console.log(`\n✅ Migration complete: ${successCount}/${FEATURES.length} features migrated`);
console.log('\nNext steps:');
console.log('1. Review newly created lib/<feature>/ folders');
console.log('2. Create index.ts exports in queries/ and services/ folders');
console.log('3. Update all imports throughout the codebase');
console.log('4. Delete old features/<feature>/ folders');
console.log('5. Run typecheck, lint, and build verification');
