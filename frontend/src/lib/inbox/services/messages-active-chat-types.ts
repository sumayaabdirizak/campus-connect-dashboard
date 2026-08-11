export type ActiveChat =
  | { kind: 'dm'; id: string; href: string }
  | { kind: 'channel'; id: string; href: string }
  | { kind: 'office'; id: number; href: string }
  | { kind: 'office-desk'; slug: string; href: string }
  | { kind: 'club'; slug: string; href: string }
  | { kind: 'club-manage'; slug: string; href: string }
  | { kind: 'discover'; href: string }
