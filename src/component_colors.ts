import type { Config as TailwindConfig } from "tailwindcss";
type TailwindConfigTheme = NonNullable<TailwindConfig["theme"]>;
type ThemeExtension = NonNullable<TailwindConfigTheme["extend"]>;
type ThemeValue = ThemeExtension[string];

/**
 * Wraps a CSS variable holding a complete colour (`oklch(...)`, a hex code,
 * `rgb(...)`) so Tailwind's opacity modifier works on it.
 *
 * Tailwind only emits `bg-x/15`, `border-x/40`, `text-x/90` and friends when
 * it can place an alpha channel into the colour. For the tokens below that are
 * stored as bare HSL channels it manages that on its own: it parses
 * `hsl(var(--border))` and rewrites it to `hsl(var(--border) / 0.15)`. A value
 * that is just `var(--warning)` cannot be parsed as a colour, so Tailwind
 * silently emits NO rule at all for `bg-warning/15` — the class lands in the
 * markup and does nothing.
 *
 * `color-mix()` supplies the alpha instead, which keeps the token's own colour
 * space intact (`--warning` is an `oklch()` value, not HSL channels) and works
 * whatever a deployment overrides the token with. Browser support matches
 * `oklch()` itself — Chrome 111+, Safari 16.2+, Firefox 113+ — so this asks
 * nothing of a browser that `globals.css` did not already require.
 *
 * `<alpha-value>` is Tailwind's placeholder: it becomes the literal alpha for
 * a modifier like `/15`, and `var(--tw-bg-opacity, 1)` otherwise.
 */
export function colorWithAlphaChannel(cssVariable: `--${string}`): string {
  return `color-mix(in oklab, var(${cssVariable}) calc(<alpha-value> * 100%), transparent)`;
}

export const componentColors: ThemeValue = {
  border: "hsl(var(--border))",
  input: "hsl(var(--input))",
  ring: "hsl(var(--ring))",
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
  },
  secondary: {
    DEFAULT: "hsl(var(--secondary))",
    foreground: "hsl(var(--secondary-foreground))",
  },
  destructive: {
    DEFAULT: "hsl(var(--destructive))",
    foreground: "hsl(var(--destructive-foreground))",
  },
  warning: {
    DEFAULT: colorWithAlphaChannel("--warning"),
    foreground: colorWithAlphaChannel("--warning-foreground"),
  },
  muted: {
    DEFAULT: "hsl(var(--muted))",
    foreground: "hsl(var(--muted-foreground))",
  },
  accent: {
    DEFAULT: "hsl(var(--accent))",
    foreground: "hsl(var(--accent-foreground))",
  },
  popover: {
    DEFAULT: "hsl(var(--popover))",
    foreground: "hsl(var(--popover-foreground))",
  },
  card: {
    DEFAULT: "hsl(var(--card))",
    foreground: "hsl(var(--card-foreground))",
  },
};
