export const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  gray: '\x1b[38;5;242m',
  // Neon vibrant palette (256-color)
  boldWhite: '\x1b[1;38;5;255m',
  boldBlue: '\x1b[1;38;5;39m',       // vivid sky blue
  boldGreen: '\x1b[1;38;5;48m',      // neon green
  boldYellow: '\x1b[1;38;5;220m',    // electric gold
  boldRed: '\x1b[1;38;5;196m',       // hot red
  boldCyan: '\x1b[1;38;5;51m',       // electric cyan
  magenta: '\x1b[1;38;5;201m',       // hot magenta/pink
};

export const RESET = COLORS.reset;

export function colorize(text: string, color: string): string {
  return `${color}${text}${RESET}`;
}

export function gray(text: string): string {
  return colorize(text, COLORS.gray);
}

export function boldWhite(text: string): string {
  return colorize(text, COLORS.boldWhite);
}

export function boldBlue(text: string): string {
  return colorize(text, COLORS.boldBlue);
}

export function boldGreen(text: string): string {
  return colorize(text, COLORS.boldGreen);
}

export function boldYellow(text: string): string {
  return colorize(text, COLORS.boldYellow);
}

export function boldRed(text: string): string {
  return colorize(text, COLORS.boldRed);
}

export function boldCyan(text: string): string {
  return colorize(text, COLORS.boldCyan);
}

export function magenta(text: string): string {
  return colorize(text, COLORS.magenta);
}

export function getColorForPercent(percent: number): string {
  if (percent <= 50) return COLORS.boldGreen;
  if (percent <= 80) return COLORS.boldYellow;
  return COLORS.boldRed;
}
