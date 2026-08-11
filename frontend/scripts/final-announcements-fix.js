#!/usr/bin/env node
/**
 * Final fix for announcements-view.tsx
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'announcements', 'announcements-view.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all relative imports with absolute ones
content = content.replace(/from ['"]\.\.\/api\//g, "from '@/lib/announcements/");
content = content.replace(/from ['"]\.\.\/utils\//g, "from '@/lib/announcements/");
content = content.replace(/from ['"]\.\.\/lib\//g, "from '@/lib/");

// Remove diagnostic imports entirely
content = content.replace(/import \{\s*isAnnouncementDiagnosticsEnabled,\s*useAnnouncementDiagnostics\s*\} from ['"].*diagnostics.*['"];\n/g, '');
content = content.replace(/import \s+ from ['"].*diagnostics.*['"];\n/g, '');

// Remove diagnostic calls
content = content.replace(/const diagnostics = useAnnouncementDiagnostics\(\);?\n/g, '');
content = content.replace(/if \(isAnnouncementDiagnosticsEnabled\(\)\) \{[^}]*\}\n/g, '');
content = content.replace(/diagnostics\?\..*;\n/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Fixed announcements-view.tsx');
