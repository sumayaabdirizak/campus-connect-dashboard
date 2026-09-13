#!/usr/bin/env node
/**
 * Batch migrate features from features/ to lib/ with queries/services structure
 * Handles: moving files, creating index.ts, basic import updates
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.join(__dirname, '..');
const FEATURES_PATH = path.join(FRONTEND_ROOT, 'src', 'features');
const LIB_PATH = path.join(FRONTEND_ROOT, 'src', 'lib');
const COMPONENTS_PATH = path.join(FRONTEND_ROOT, 'src', 'components');

const FEATURES = ['academic-years-admin', 'admin', 'auth', 'batches', 'batches-admin'];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  let content = fs.readFileSync(src, 'utf8');

  // Update relative imports from ./service to ../services
  content = content.replace(/from ['"]\.\/service['"]/g, "from '../services'");
  // Update relative imports from ./queries to ../queries
  content = content.replace(/from ['"]\.\/queries['"]/g, "from '../queries'");
  // Update relative imports from ../../lib/ to ../
  content = content.replace(/from ['"]\.\.\/\.\.\/lib\//g, "from '../");

  fs.writeFileSync(dest, content, 'utf8');
}

function migrateFeature(featureName) {
  console.log(`\n🔄 Migrating ${featureName}...`);

  const featurePath = path.join(FEATURES_PATH, featureName);
  if (!fs.existsSync(featurePath)) {
    console.error(`  ❌ Not found: ${featurePath}`);
    return false;
  }

  // Create lib structure
  const libFeaturePath = path.join(LIB_PATH, featureName);
  const queriesPath = path.join(libFeaturePath, 'queries');
  const servicesPath = path.join(libFeaturePath, 'services');
  const componentsPath = path.join(COMPONENTS_PATH, featureName);

  ensureDir(queriesPath);
  ensureDir(servicesPath);
  ensureDir(componentsPath);

  let stats = { queries: 0, services: 0, types: 0, components: 0, lib: 0 };

  try {
    // Migrate api/queries.ts → queries/index.ts
    const queryFile = path.join(featurePath, 'api', 'queries.ts');
    if (fs.existsSync(queryFile)) {
      copyFile(queryFile, path.join(queriesPath, 'index.ts'));
      stats.queries++;
      console.log(`  ✓ api/queries.ts → queries/index.ts`);
    }

    // Migrate api/service.ts → services/index.ts (includes types)
    const serviceFile = path.join(featurePath, 'api', 'service.ts');
    if (fs.existsSync(serviceFile)) {
      copyFile(serviceFile, path.join(servicesPath, 'index.ts'));
      stats.services++;
      console.log(`  ✓ api/service.ts → services/index.ts`);
    }

    // Migrate lib/* → services/
    const libDir = path.join(featurePath, 'lib');
    if (fs.existsSync(libDir)) {
      const files = fs.readdirSync(libDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
      for (const file of files) {
        copyFile(path.join(libDir, file), path.join(servicesPath, file));
        stats.lib++;
      }
      if (files.length > 0) console.log(`  ✓ lib/* → services/ (${files.length} files)`);
    }

    // Copy components
    const oldComponentsPath = path.join(featurePath, 'components');
    if (fs.existsSync(oldComponentsPath)) {
      const components = fs.readdirSync(oldComponentsPath);
      for (const component of components) {
        const src = path.join(oldComponentsPath, component);
        const dest = path.join(componentsPath, component);
        if (fs.statSync(src).isFile()) {
          copyFile(src, dest);
          stats.components++;
        }
      }
      if (stats.components > 0) console.log(`  ✓ components/* → components/${featureName}/ (${stats.components} files)`);
    }

    console.log(`  📊 Summary: ${stats.queries} queries, ${stats.services} services, ${stats.lib} libs, ${stats.components} components`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

console.log('\n📦 BATCH MIGRATION: Moving features to lib/ structure\n');

let success = 0;
for (const feature of FEATURES) {
  if (migrateFeature(feature)) {
    success++;
  }
}

console.log(`\n✅ Migrated ${success}/${FEATURES.length} features`);
console.log('\n📝 Next steps:');
console.log('1. Run: npm run typecheck');
console.log('2. Fix any import errors');
console.log('3. Verify components work with absolute imports');
console.log('4. Delete old features/ folders');
console.log('5. Run full verification (typecheck + lint + build)');
