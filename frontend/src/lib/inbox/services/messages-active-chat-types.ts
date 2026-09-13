export type ActiveChat =
  | { kind: 'discover'; href: string }
  | { kind: 'club'; slug: string; href: string }
  | { kind: 'club-manage'; slug: string; href: string }
  | { kind: 'dm'; id: string; href: string }
  | { kind: 'channel'; id: string; href: string };
