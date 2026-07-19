function icsDate(date) {
  return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function icsEscape(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildIcs(events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Campus Connect//Assignments//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  const now = icsDate(new Date());
  for (const ev of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${icsDate(ev.start)}`);
    lines.push(`DTEND:${icsDate(ev.end ?? ev.start)}`);
    lines.push(`SUMMARY:${icsEscape(ev.title)}`);
    if (ev.description) lines.push(`DESCRIPTION:${icsEscape(ev.description)}`);
    if (ev.url) lines.push(`URL:${ev.url}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function assignmentCalendarEvents(a) {
  const events = [];
  if (a.open_at) {
    events.push({
      uid: `assignment-${a.id}-open@campus-connect`,
      start: a.open_at,
      end: new Date(a.open_at.getTime() + 30 * 60_000),
      title: `Opens: ${a.title}`,
      description: a.description ?? '',
    });
  }
  events.push({
    uid: `assignment-${a.id}-due@campus-connect`,
    start: a.due_date,
    end: new Date(a.due_date.getTime() + 30 * 60_000),
    title: `Due: ${a.title}`,
    description: a.description ?? '',
  });
  return events;
}
