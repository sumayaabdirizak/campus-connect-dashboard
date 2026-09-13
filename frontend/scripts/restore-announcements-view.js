#!/usr/bin/env node
/**
 * Restore announcements-view from git and remove diagnostics code
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outputPath = path.join(__dirname, '..', 'src', 'components', 'announcements', 'announcements-view.tsx');

// Get the file from git
let content = execSync(
  'git show refs/remotes/v2/HEAD:frontend/src/features/announcements/components/announcements-view.tsx',
  { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' }
);

// Fix imports to use absolute paths to @/lib/announcements
content = content.replace(/from ['"]\.\.\/api\//g, "from '@/lib/announcements/");
content = content.replace(/from ['"]\.\.\/diagnostics\//g, "from '@/lib/announcements/diagnostics/");

// Remove diagnostic imports entirely
content = content.replace(
  /import \{\s*isAnnouncementDiagnosticsEnabled,\s*useAnnouncementDiagnostics\s*\} from ['"].*diagnostics.*['"];\n/g,
  ''
);

// Remove diagnostic setup line
content = content.replace(/const diagnosticEnabled = useMemo\(\(\) => isAnnouncementDiagnosticsEnabled\(\), \[\]\);\n/g, '');

// Remove diagnostics usage object and any logic that depends on it
// This is more complex - we need to find and remove the useAnnouncementDiagnostics call
const lines = content.split('\n');
const filtered = [];
let inDiagnosticsBlock = false;
let blockDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('const diagnostics = useAnnouncementDiagnostics(')) {
    inDiagnosticsBlock = true;
    blockDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    continue;
  }

  if (inDiagnosticsBlock) {
    blockDepth += (line.match(/\{/g) || []).length;
    blockDepth -= (line.match(/\}/g) || []).length;
    if (blockDepth <= 0) {
      inDiagnosticsBlock = false;
    }
    continue;
  }

  // Skip lines that reference diagnosticEnabled or diagnostics
  if (line.includes('diagnosticEnabled') || (line.includes('diagnostics') && line.includes('.'))) {
    continue;
  }

  filtered.push(line);
}

content = filtered.join('\n');

fs.writeFileSync(outputPath, content, 'utf8');
console.log('✓ Restored and cleaned announcements-view.tsx');
