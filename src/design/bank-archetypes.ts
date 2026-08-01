// Source: secret/ds_rules_v2_5.md L528-559 (§12-2, 25 symbol archetypes) — transcribed verbatim
// Shared SVG spec (§12-2): viewBox 0 0 24 24, fill=none, stroke=currentColor, stroke-width 1.8 (2.0 for
// yellow-brand exceptions, see BANK_YELLOW_STROKE_EXCEPTIONS in bank-institutions.ts), stroke-linecap/linejoin round.

export type BankArchetype =
  | 'star4' | 'swoosh' | 'ring2' | 'circledot' | 'chevron2' | 'arrowbox' | 'arcband' | 'arcpair'
  | 'wave' | 'pillar' | 'letterk' | 'roundsq' | 'tbar' | 'arrowrise' | 'triangleup' | 'ellipse'
  | 'tri3' | 'card' | 'shield' | 'umbrella' | 'hexcoin' | 'leaf' | 'envelope' | 'home' | 'nmark'

export const BANK_ARCHETYPE_PATHS: Record<BankArchetype, string> = {
  star4: 'M12 3.8 L14.1 9.9 L20.2 12 L14.1 14.1 L12 20.2 L9.9 14.1 L3.8 12 L9.9 9.9 Z',
  swoosh: 'M4.5 18 C10 18 15 14 18.5 5.8 M18.5 5.8 L13.6 7.2 M18.5 5.8 L17.6 10.8',
  ring2: 'M9.6 12 m-5.4 0 a5.4 5.4 0 1 0 10.8 0 a5.4 5.4 0 1 0 -10.8 0 M14.4 12 m-5.4 0 a5.4 5.4 0 1 0 10.8 0 a5.4 5.4 0 1 0 -10.8 0',
  circledot: 'M12 12 m-8.4 0 a8.4 8.4 0 1 0 16.8 0 a8.4 8.4 0 1 0 -16.8 0 M12 12 m-1.9 0 a1.9 1.9 0 1 0 3.8 0 a1.9 1.9 0 1 0 -3.8 0',
  chevron2: 'M4.5 5.5 L12 12.8 L19.5 5.5 M4.5 11.2 L12 18.5 L19.5 11.2',
  arrowbox: 'M4.5 4.5 H19.5 V19.5 H4.5 Z M8.4 15.6 L15.6 8.4 M15.6 8.4 H11.2 M15.6 8.4 V12.8',
  arcband: 'M3.8 15.5 A8.2 8.2 0 0 1 20.2 15.5 M7.6 15.5 A4.4 4.4 0 0 1 16.4 15.5',
  arcpair: 'M6.5 4.6 A9 9 0 0 1 6.5 19.4 M17.5 4.6 A9 9 0 0 0 17.5 19.4',
  wave: 'M3.8 9.4 C6.5 6.4 8.6 12.4 11.2 9.4 C13.8 6.4 16.4 12.4 20.2 9.4 M3.8 15 C6.5 12 8.6 18 11.2 15 C13.8 12 16.4 18 20.2 15',
  pillar: 'M3.8 8.2 L12 4 L20.2 8.2 M6.4 10.4 V16.8 M9.9 10.4 V16.8 M14.1 10.4 V16.8 M17.6 10.4 V16.8 M4.2 19.6 H19.8',
  letterk: 'M7.8 4.2 V19.8 M18 5 L9.4 12.4 M12.2 10.8 L18.4 19.8',
  roundsq: 'M6.2 5.2 H17.8 A3 3 0 0 1 20.8 8.2 V14.6 A3 3 0 0 1 17.8 17.6 H12.4 L8.4 20.8 L8.8 17.6 H6.2 A3 3 0 0 1 3.2 14.6 V8.2 A3 3 0 0 1 6.2 5.2 Z',
  tbar: 'M4.6 6 H19.4 M12 6 V15.4 M12 15.4 m-2.4 0 a2.4 2.4 0 1 0 4.8 0 a2.4 2.4 0 1 0 -4.8 0',
  arrowrise: 'M3.8 17.2 L9.6 11.4 L13.6 15.4 L20.2 7.4 M20.2 7.4 H15.4 M20.2 7.4 V12.2',
  triangleup: 'M6 19.2 L12 4.8 L18 19.2 Z M9 14 H15',
  ellipse: 'M4 14.8 A8.8 5.4 -25 0 1 20 9.2 A8.8 5.4 -25 0 1 4 14.8 Z',
  tri3: 'M12 3.6 L20.4 19.2 H3.6 Z M12 3.6 V19.2',
  card: 'M4 6.4 H20 A1.6 1.6 0 0 1 21.6 8 V16 A1.6 1.6 0 0 1 20 17.6 H4 A1.6 1.6 0 0 1 2.4 16 V8 A1.6 1.6 0 0 1 4 6.4 Z M2.4 10.8 H21.6 M5.6 14.6 H10.4',
  shield: 'M12 3.4 L19.6 6.4 V12 C19.6 16.6 16.2 19.6 12 20.6 C7.8 19.6 4.4 16.6 4.4 12 V6.4 Z',
  umbrella: 'M12 3.2 V6.2 M3.4 13 A8.6 8.6 0 0 1 20.6 13 Z M12 13 V17.8 A2.6 2.6 0 0 1 6.8 17.8',
  hexcoin: 'M12 3.4 L19.6 7.7 V16.3 L12 20.6 L4.4 16.3 V7.7 Z M8.4 14.6 L11 11.4 L13.2 13.6 L15.8 9.6',
  leaf: 'M12 20.6 V11.2 M12 11.2 C12 6.4 15.4 3.8 20 3.8 C20 8.6 17 11.2 12 11.2 Z M12 15.2 C12 11.6 9 9 4.4 9 C4.4 12.6 7.4 15.2 12 15.2 Z',
  envelope: 'M3.6 6.6 H20.4 V17.4 H3.6 Z M3.6 7.2 L12 13 L20.4 7.2',
  home: 'M4 11 L12 4.6 L20 11 V19.6 H4 Z M9.6 19.6 V14 H14.4 V19.6',
  nmark: 'M7.4 19.4 V4.6 L16.6 19.4 V4.6',
}
