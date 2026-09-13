#!/usr/bin/env node
/**
 * Fix remaining relative import issues in Batch 2 features
 */

const fs = require('fs');
const path = require('path');

const LIB_PATH = path.join(__dirname, '..', 'src', 'lib');
const BATCH2_FEATURES = ['calendar', 'clubs', 'course-details', 'dean'];

let filesFixed = 0;

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Get the directory of the current file
    const dir = path.dirname(filePath);
    const isQueries = dir.includes('queries');
    const isServices = dir.includes('services');
    const isSubquery = dir.includes('queries') && dir.split(path.sep).length > path.join(LIB_PATH, 'x', 'queries').split(path.sep).length;

    // Fix relative imports based on file location
    if (isQueries) {
      // In queries folder: ./file → ./file (same level), ../types → ../types

      // club-keys → ./club-keys (if not already specified)
      content = content.replace(/from ['"]\.\/club-keys['"]/g, "from './club-keys'");
      content = content.replace(/from ['"]club-keys['"]/g, "from './club-keys'");

      // club-admin-mutations, club-member-mutations
      content = content.replace(/from ['"]\.\/club-admin-mutations['"]/g, "from './club-admin-mutations'");
      content = content.replace(/from ['"]\.\/club-member-mutations['"]/g, "from './club-member-mutations'");
      content = content.replace(/from ['"]club-admin-mutations['"]/g, "from './club-admin-mutations'");
      content = content.replace(/from ['"]club-member-mutations['"]/g, "from './club-member-mutations'");

      // Access-service, chat-service, etc. in course-details
      content = content.replace(/from ['"]\.\/access-service['"]/g, "from '../services/access-service'");
      content = content.replace(/from ['"]\.\/chat-service['"]/g, "from '../services/chat-service'");
      content = content.replace(/from ['"]\.\/chat-types['"]/g, "from '../types'");
      content = content.replace(/from ['"]\.\/feed-service['"]/g, "from '../services/feed-service'");
      content = content.replace(/from ['"]\.\/feed-types['"]/g, "from '../types'");
      content = content.replace(/from ['"]\.\/gradebook-service['"]/g, "from '../services/gradebook-service'");
      content = content.replace(/from ['"]\.\/groups-service['"]/g, "from '../services/groups-service'");
      content = content.replace(/from ['"]\.\/groups-types['"]/g, "from '../types'");
      content = content.replace(/from ['"]\.\/question-bank-service['"]/g, "from '../services/question-bank-service'");
      content = content.replace(/from ['"]\.\/question-bank-types['"]/g, "from '../types'");
      content = content.replace(/from ['"]\.\/report-service['"]/g, "from '../services/report-service'");
      content = content.replace(/from ['"]\.\/resources-service['"]/g, "from '../services/resources-service'");
      content = content.replace(/from ['"]\.\/resources-types['"]/g, "from '../types'");
      content = content.replace(/from ['"]\.\/roster-service['"]/g, "from '../services/roster-service'");
      content = content.replace(/from ['"]\.\/student-profile-service['"]/g, "from '../services/student-profile-service'");

      // Index imports
      content = content.replace(/from ['"]\.\/index['"]/g, "from './'");

      // Types from parent
      content = content.replace(/from ['"]\.\/types['"]/g, "from '../types'");

    } else if (isServices) {
      // In services folder: ./file → ./file (same level), ../types (parent types)
      content = content.replace(/from ['"]\.\/types['"]/g, "from '../types'");

      // Imports to assignment/quiz/resource types should reference ../types
      content = content.replace(/from ['"]assignment-types['"]/g, "from '../types'");
      content = content.replace(/from ['"]quiz-types['"]/g, "from '../types'");
      content = content.replace(/from ['"]resource-types['"]/g, "from '../types'");
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
      } else if (file.endsWith('.ts')) {
        fixFile(fullPath);
      }
    }
  } catch (error) {
    // Silently skip
  }
}

console.log('\n🔧 Fixing remaining relative imports in Batch 2...\n');

for (const feature of BATCH2_FEATURES) {
  const featurePath = path.join(LIB_PATH, feature);
  if (fs.existsSync(featurePath)) {
    walkDir(featurePath);
  }
}

console.log(`✅ Fixed imports in ${filesFixed} files\n`);
