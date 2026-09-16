/**
 * Converts a CSS colour to the space-separated HSL channels the
 * `hsl-channels` tokens expect (`222.2 84% 4.9%`), so a deployment can
 * configure `#1e293b` rather than work the channels out by hand.
 *
 * Accepted inputs: bare channels, `#rgb`, `#rrggbb` (and their 4/8-digit
 * forms when fully opaque), `rgb()` and `hsl()` with comma or space
 * separators. Anything translucent is rejected — the channels carry no
 * alpha, and silently dropping it would render a different colour.
 */

const NUMBER = "-?(?:\\d+\\.?\\d*|\\.\\d+)";
const BARE_CHANNELS = new RegExp(`^(${NUMBER})(?:deg)?\\s+(${NUMBER})%\\s+(${NUMBER})%$`);
const HEX = /^#([0-9a-f]{3,8})$/i;
const FUNCTIONAL = /^(rgba?|hsla?)\(\s*([^)]*?)\s*\)$/i;

function formatChannel(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatChannels(hue: number, saturation: number, lightness: number): string {
  const h = ((hue % 360) + 360) % 360;
  return `${formatChannel(h)} ${formatChannel(saturation)}% ${formatChannel(lightness)}%`;
}

/** Red, green and blue in 0–255 to HSL channels in degrees and percentages. */
export function rgbToHslChannels(red: number, green: number, blue: number): string {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;
  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
  }

  return formatChannels(hue, saturation * 100, lightness * 100);
}

function isOpaqueAlpha(alpha: string | undefined): boolean {
  if (alpha === undefined) return true;
  if (alpha.endsWith("%")) return Number(alpha.slice(0, -1)) === 100;
  return Number(alpha) === 1;
}

function parseHex(digits: string): string | null {
  let expanded: string;
  if (digits.length === 3 || digits.length === 4) {
    expanded = digits
      .split("")
      .map((d) => d + d)
      .join("");
  } else if (digits.length === 6 || digits.length === 8) {
    expanded = digits;
  } else {
    return null;
  }
  if (expanded.length === 8) {
    if (expanded.slice(6).toLowerCase() !== "ff") return null;
    expanded = expanded.slice(0, 6);
  }
  const red = parseInt(expanded.slice(0, 2), 16);
  const green = parseInt(expanded.slice(2, 4), 16);
  const blue = parseInt(expanded.slice(4, 6), 16);
  return rgbToHslChannels(red, green, blue);
}

function parseRgbComponent(component: string): number | null {
  if (component.endsWith("%")) {
    const percent = Number(component.slice(0, -1));
    return Number.isFinite(percent) ? (percent / 100) * 255 : null;
  }
  const value = Number(component);
  return Number.isFinite(value) ? value : null;
}

function parseFunctional(name: string, body: string): string | null {
  // "r, g, b", "r g b", "r g b / a" and "r, g, b, a" all split the same way.
  const parts = body.split(/\s*[,/]\s*|\s+/).filter((part) => part.length > 0);
  if (parts.length < 3 || parts.length > 4) return null;
  const [first, second, third, alpha] = parts as [string, string, string, string?];
  if (!isOpaqueAlpha(alpha)) return null;

  if (name.startsWith("rgb")) {
    const red = parseRgbComponent(first);
    const green = parseRgbComponent(second);
    const blue = parseRgbComponent(third);
    if (red === null || green === null || blue === null) return null;
    const clamp = (v: number) => Math.min(255, Math.max(0, v));
    return rgbToHslChannels(clamp(red), clamp(green), clamp(blue));
  }

  const hue = Number(first.replace(/deg$/i, ""));
  if (!second.endsWith("%") || !third.endsWith("%")) return null;
  const saturation = Number(second.slice(0, -1));
  const lightness = Number(third.slice(0, -1));
  if (![hue, saturation, lightness].every(Number.isFinite)) return null;
  return formatChannels(hue, saturation, lightness);
}

/**
 * The HSL channels for a CSS colour, or null when the input is not a colour
 * this understands (a named colour, an `oklch()`, anything translucent).
 */
export function toHslChannels(input: string): string | null {
  const value = input.trim();
  if (value.length === 0) return null;

  const bare = BARE_CHANNELS.exec(value);
  if (bare) {
    const [, hue, saturation, lightness] = bare as unknown as [string, string, string, string];
    return formatChannels(Number(hue), Number(saturation), Number(lightness));
  }

  const hex = HEX.exec(value);
  if (hex) return parseHex(hex[1] as string);

  const functional = FUNCTIONAL.exec(value);
  if (functional) {
    return parseFunctional((functional[1] as string).toLowerCase(), functional[2] as string);
  }

  return null;
}
