import fs from "fs";

const p = "prisma/migrations/20260502143000_discussion_hybrid_chat_module/migration.sql";
let s = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");

const enums = [
  ["DiscussionScopeType", "('FACULTY', 'DEPARTMENT', 'BATCH', 'SECTION')"],
  ["DiscussionMembershipRole", "('STUDENT', 'LECTURER', 'HEAD', 'DEAN', 'ADMIN', 'ADVISOR')"],
  ["DiscussionMessageType", "('TEXT', 'MEDIA', 'SYSTEM')"],
  ["DiscussionAttachmentType", "('IMAGE', 'VIDEO', 'FILE')"],
  [
    "DiscussionNotificationType",
    "('MESSAGE', 'MENTION', 'ADMIN_ANNOUNCEMENT', 'THREAD', 'REACTION', 'PIN')",
  ],
  ["DiscussionGroupStatus", "('ACTIVE', 'ARCHIVED')"],
  [
    "DiscussionServerKind",
    "('SCOPE_GROUP', 'FACULTY_SERVER', 'USER_SERVER', 'DEPARTMENT_LEGACY', 'BATCH_LEGACY', 'SECTION_LEGACY')",
  ],
  ["DiscussionChannelKind", "('TEXT', 'ANNOUNCEMENT', 'FORUM')"],
  ["DiscussionOverwriteTarget", "('ROLE', 'MEMBER')"],
  ["GroupDmMemberRole", "('OWNER', 'MEMBER')"],
];

let head =
  "-- Discussion + hybrid chat (align DB with Prisma; missing from earlier migrations)\n\n";
for (const [n, v] of enums) {
  head += `DO $$ BEGIN CREATE TYPE "${n}" AS ENUM ${v}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;\n\n`;
}

const dgRe = /CREATE TABLE (?:IF NOT EXISTS )?"DiscussionGroup"/;
const dgMatch = s.match(dgRe);
if (!dgMatch || dgMatch.index == null) throw new Error("CREATE TABLE DiscussionGroup not found");
s = head + s.slice(dgMatch.index);

s = s.replaceAll('CREATE TABLE "', 'CREATE TABLE IF NOT EXISTS "');
s = s.replaceAll('CREATE UNIQUE INDEX "', 'CREATE UNIQUE INDEX IF NOT EXISTS "');
s = s.replaceAll('CREATE INDEX "', 'CREATE INDEX IF NOT EXISTS "');

const lines = s.split("\n");
const out = [];
for (const line of lines) {
  const t = line.trim();
  if (t.startsWith('ALTER TABLE "') && t.includes("ADD CONSTRAINT")) {
    out.push("DO $$ BEGIN");
    out.push(`  ${t}`);
    out.push("EXCEPTION WHEN duplicate_object THEN NULL; END $$;");
  } else {
    out.push(line);
  }
}
s = out.join("\n");

const driftRepair = `

-- Repair older "DiscussionGroup" tables missing hybrid columns (safe no-ops on fresh DBs)
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "kind" "DiscussionServerKind" NOT NULL DEFAULT 'SCOPE_GROUP';
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "parentServerId" INTEGER;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "ownerId" INTEGER;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "iconUrl" TEXT;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "defaultChannelId" INTEGER;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "e2eeEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "e2eeCurrentKeyVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "e2eeRotationRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
`;

/** Remove every hybrid-column drift block (idempotent; avoids duplicate or EOF ordering bugs). */
function stripDiscussionGroupDriftBlocks(sql) {
  const startNeedle =
    "\n\n-- Repair older \"DiscussionGroup\" tables missing hybrid columns (safe no-ops on fresh DBs)\n";
  const endNeedle =
    'ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);';
  let out = sql;
  let idx;
  while ((idx = out.indexOf(startNeedle)) >= 0) {
    const end = out.indexOf(endNeedle, idx);
    if (end < 0) throw new Error("malformed DiscussionGroup drift block (missing archivedAt line)");
    const after = end + endNeedle.length;
    let tail = out.slice(after).replace(/^\r?\n+/, "\n");
    out = out.slice(0, idx) + "\n" + tail;
  }
  return out;
}

/** Remove every DiscussionMessage drift block (idempotent). */
function stripDiscussionMessageDriftBlocks(sql) {
  const startNeedle =
    "\n\n-- Repair older \"DiscussionMessage\" tables missing hybrid / DM columns (safe no-ops on fresh DBs)\n";
  const endNeedle =
    'ALTER TABLE IF EXISTS "DiscussionMessage" ADD COLUMN IF NOT EXISTS "senderDeviceId" TEXT;';
  let out = sql;
  let idx;
  while ((idx = out.indexOf(startNeedle)) >= 0) {
    const end = out.indexOf(endNeedle, idx);
    if (end < 0) throw new Error("malformed DiscussionMessage drift block (missing senderDeviceId line)");
    const after = end + endNeedle.length;
    let tail = out.slice(after).replace(/^\r?\n+/, "\n");
    out = out.slice(0, idx) + "\n" + tail;
  }
  return out;
}

s = stripDiscussionGroupDriftBlocks(s);
s = stripDiscussionMessageDriftBlocks(s);

const driftAnchor =
  /(\n    CONSTRAINT "DiscussionGroup_pkey" PRIMARY KEY \("id"\)\n\);)(\n\n-- CreateTable\nCREATE TABLE IF NOT EXISTS "DiscussionChannelCategory")/;
if (!driftAnchor.test(s)) {
  throw new Error(
    "Could not insert DiscussionGroup drift repair: expected DiscussionGroup_pkey then DiscussionChannelCategory",
  );
}
s = s.replace(driftAnchor, `$1${driftRepair}$2`);

const messageDriftRepair = `

-- Repair older "DiscussionMessage" tables missing hybrid / DM columns (safe no-ops on fresh DBs)
ALTER TABLE IF EXISTS "DiscussionMessage" ADD COLUMN IF NOT EXISTS "channelId" INTEGER;
ALTER TABLE IF EXISTS "DiscussionMessage" ADD COLUMN IF NOT EXISTS "groupDmId" INTEGER;
ALTER TABLE IF EXISTS "DiscussionMessage" ADD COLUMN IF NOT EXISTS "senderDeviceId" TEXT;
`;

const messageDriftAnchor =
  /(\n    CONSTRAINT "DiscussionMessage_pkey" PRIMARY KEY \("id"\)\n\);)(\n\n-- CreateTable\nCREATE TABLE IF NOT EXISTS "DiscussionAttachment")/;
if (!messageDriftAnchor.test(s)) {
  throw new Error(
    "Could not insert DiscussionMessage drift repair: expected DiscussionMessage_pkey then DiscussionAttachment",
  );
}
s = s.replace(messageDriftAnchor, `$1${messageDriftRepair}$2`);

s = s.replace(/^\uFEFF/, "");
fs.writeFileSync(p, Buffer.from(s, "utf8"));
console.log("patched", p, "bytes", Buffer.byteLength(s, "utf8"));
