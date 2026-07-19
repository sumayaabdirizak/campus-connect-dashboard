import type { CalendarItem } from '../types';

export const HOUR_HEIGHT = 48;
export const HOURS = Array.from({ length: 24 }, (_, i) => i);

export interface Placed {
  item: CalendarItem;
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
}

/** Greedy lane layout for overlapping timed events. */
export function layoutDay(items: CalendarItem[], minutesSinceMidnight: (iso: string) => number): Placed[] {
  const timed = items
    .filter((i) => !i.allDay && i.startsAt)
    .map((i) => {
      const startMin = minutesSinceMidnight(i.startsAt);
      const endMin = i.endsAt
        ? Math.max(minutesSinceMidnight(i.endsAt), startMin + 30)
        : startMin + 30;
      return { item: i, startMin, endMin };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const placed: Placed[] = [];
  let cluster: typeof timed = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const laneOf = new Map<(typeof cluster)[number], number>();
    for (const ev of cluster) {
      let lane = laneEnds.findIndex((end) => end <= ev.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(ev.endMin);
      } else {
        laneEnds[lane] = ev.endMin;
      }
      laneOf.set(ev, lane);
    }
    const lanes = laneEnds.length;
    for (const ev of cluster) {
      placed.push({ ...ev, lane: laneOf.get(ev) ?? 0, lanes });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const ev of timed) {
    if (cluster.length > 0 && ev.startMin >= clusterEnd) flush();
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.endMin);
  }
  flush();
  return placed;
}
