import { AUTH_BRAND } from '@/config/auth-brand';
import { downloadCsv } from '@/features/pos/components/download-csv';
import type { ClubReportRow } from '@/lib/dean/types';
import type { ClubMember } from '@/lib/clubs/types';
import {
  buildReportInvoiceHeader,
  entityReportId
} from '@/lib/reports/services/report-print-invoice-header';
import { sectionHtml, tableHtml } from '@/lib/reports/services/report-print-helpers';
import { printHtmlDocument } from '@/lib/reports/services/report-print-shell';

const LIST_HEADERS = [
  'Club',
  'Faculty',
  'Status',
  'Scope',
  'Members',
  'Pending requests',
  'Last activity',
  'Created'
] as const;

function dateLabel(v: string | null): string {
  return v ? new Date(v).toLocaleDateString() : '—';
}

export function exportClubsReportListCsv(rows: ClubReportRow[]) {
  downloadCsv(
    'clubs-report.csv',
    [...LIST_HEADERS],
    rows.map((r) => [
      r.name,
      r.facultyName ?? 'Unscoped',
      r.status,
      r.scopeKind,
      r.memberCount,
      r.joinRequests.pending,
      dateLabel(r.lastActivityAt),
      dateLabel(r.createdAt)
    ])
  );
}

export function exportClubsReportListPdf(rows: ClubReportRow[]) {
  const generatedAt = new Date().toLocaleString();
  const header = buildReportInvoiceHeader({
    documentTitle: 'Clubs report',
    documentSubtitle: 'All clubs — membership and activity',
    reportId: entityReportId('clubs', 'list'),
    generatedAt,
    periodLabel: 'Current term',
    fromLines: [AUTH_BRAND.organization, 'Platform clubs report'],
    toTitle: 'All clubs',
    toLines: [`Clubs in export: ${rows.length}`]
  });
  const body = [
    header,
    sectionHtml(
      'Clubs',
      tableHtml(
        [...LIST_HEADERS],
        rows.map((r) => [
          r.name,
          r.facultyName ?? 'Unscoped',
          r.status,
          r.scopeKind,
          r.memberCount,
          r.joinRequests.pending,
          dateLabel(r.lastActivityAt),
          dateLabel(r.createdAt)
        ]),
        'No clubs to export.'
      )
    )
  ].join('');
  printHtmlDocument('Clubs report', body);
}

const MEMBER_HEADERS = ['Name', 'Email', 'Role', 'Joined'] as const;

function memberRows(members: ClubMember[]) {
  return members.map((m) => [
    m.user.full_name,
    m.user.email ?? '—',
    m.clubRole,
    dateLabel(m.joinedAt)
  ]);
}

export function exportClubMembersCsv(clubName: string, members: ClubMember[]) {
  downloadCsv(
    `${clubName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-members.csv`,
    [...MEMBER_HEADERS],
    memberRows(members)
  );
}

export function exportClubMembersPdf(clubName: string, members: ClubMember[]) {
  const generatedAt = new Date().toLocaleString();
  const ownerCount = members.filter((m) => m.clubRole === 'OWNER').length;
  const moderatorCount = members.filter((m) => m.clubRole === 'MODERATOR').length;
  const header = buildReportInvoiceHeader({
    documentTitle: 'Club members',
    documentSubtitle: clubName,
    reportId: entityReportId('clubs', 'detail'),
    generatedAt,
    periodLabel: 'Current term',
    fromLines: [AUTH_BRAND.organization, 'Club membership report'],
    toTitle: clubName,
    toLines: [`Members: ${members.length}`, `Owners: ${ownerCount} · Moderators: ${moderatorCount}`]
  });
  const body = [
    header,
    sectionHtml('Members', tableHtml([...MEMBER_HEADERS], memberRows(members), 'No members yet.'))
  ].join('');
  printHtmlDocument(`${clubName} — Members`, body);
}
