import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";
import type { Config as TailwindConfig } from "tailwindcss";
import { CHART_SERIES_SLOT_COUNT } from "./chart_colors";
import SchemaVaultsTailwindConfigFactory from "./TailwindConfigFactory";
import { getThemeToken, listThemeTokens, type ModeThemeToken, type ThemeMode } from "./theme_tokens";

const require_ = createRequire(import.meta.url);
const postcss = require_("postcss") as (
  plugins: readonly import("postcss").AcceptedPlugin[],
) => import("postcss").Processor;
const tailwind = require_("tailwindcss") as (
  config: TailwindConfig,
) => import("postcss").AcceptedPlugin;

/** The declarations Tailwind emits for each class, keyed by class name (see component_colors.test.ts). */
async function compileUtilities(classNames: readonly string[]): Promise<Map<string, string>> {
  const config: TailwindConfig = new SchemaVaultsTailwindConfigFactory().createConfig({
    content: ["./src/**/*.tsx"],
  });
  config.content = [{ raw: classNames.join(" "), extension: "html" }];
  const compiled = await postcss([tailwind(config)]).process("@tailwind utilities;", { from: undefined });
  const emitted = new Map<string, string>();
  compiled.root.walkRules((rule) => {
    const declarations: string[] = [];
    rule.walkDecls((declaration) => {
      declarations.push(`${declaration.prop}: ${declaration.value}`);
    });
    emitted.set(rule.selector.replace(/^\./, "").replace(/\\/g, ""), declarations.join("; "));
  });
  return emitted;
}

const SERIES_IDS: readonly string[] = Array.from(
  { length: CHART_SERIES_SLOT_COUNT },
  (_, index: number): string => `chart-${index + 1}`,
);
const CHART_COLOR_IDS: readonly string[] = [...SERIES_IDS, "chart-other"];

function chartToken(id: string): ModeThemeToken {
  return getThemeToken(id as ModeThemeToken["id"]) as ModeThemeToken;
}

// -- WCAG contrast, for the surfaces charts render on ---------------------------

function hexToRgb(hex: string): [number, number, number] {
  const digits: string = hex.replace(/^#/, "");
  return [0, 2, 4].map((offset: number): number => parseInt(digits.slice(offset, offset + 2), 16)) as [
    number,
    number,
    number,
  ];
}

/** `222.2 84% 4.9%` to 0–255 RGB. */
function hslChannelsToRgb(channels: string): [number, number, number] {
  const [h, s, l] = channels.split(/\s+/).map((part: string): number => parseFloat(part)) as [number, number, number];
  const saturation: number = s / 100;
  const lightness: number = l / 100;
  const chroma: number = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const f = (n: number): number => {
    const k: number = (n + h / 30) % 12;
    return lightness - (chroma / 2) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)].map((value: number): number => Math.round(value * 255)) as [number, number, number];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const linear = (channel: number): number => {
    const c: number = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x: number, y: number): number => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

function cardSurface(mode: ThemeMode): [number, number, number] {
  return hslChannelsToRgb((getThemeToken("card") as ModeThemeToken).defaults[mode]);
}

describe("chart colour tokens", () => {
  test("the manifest has one token per series slot plus 'other', all in the charts group", () => {
    const charts = listThemeTokens().filter((token) => token.group === "charts");
    expect(charts.map((token) => token.id)).toEqual(CHART_COLOR_IDS as never);
    for (const token of charts) {
      expect(token.format).toBe("css-color");
      expect(token.cssVariable).toBe(`--${token.id}`);
    }
  });

  test("every series colour is a distinct hex code in each mode", () => {
    for (const mode of ["light", "dark"] as const) {
      const values: string[] = SERIES_IDS.map((id: string): string => chartToken(id).defaults[mode]);
      for (const value of values) expect(value).toMatch(/^#[0-9a-f]{6}$/);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  test("the card surfaces are the ones the palette was validated against", () => {
    expect(cardSurface("light")).toEqual(hexToRgb("#ffffff"));
    // hsl(222.2 84% 4.9%) rounds to #020817 within a channel step.
    const dark = cardSurface("dark");
    const expected = hexToRgb("#020817");
    dark.forEach((channel: number, index: number): void => {
      expect(Math.abs(channel - expected[index]!)).toBeLessThanOrEqual(1);
    });
  });

  test("every dark-mode series colour clears 3:1 against the dark card", () => {
    const surface = cardSurface("dark");
    for (const id of SERIES_IDS) {
      expect(contrast(hexToRgb(chartToken(id).defaults.dark), surface)).toBeGreaterThanOrEqual(3);
    }
  });

  test("only aqua, yellow and magenta fall under 3:1 on the light card (they need labels or a table)", () => {
    const surface = cardSurface("light");
    const below: string[] = SERIES_IDS.filter(
      (id: string): boolean => contrast(hexToRgb(chartToken(id).defaults.light), surface) < 3,
    );
    expect(below).toEqual(["chart-3", "chart-4", "chart-5"]);
  });

  test("the 'other' grey clears 3:1 on both cards", () => {
    const other = hexToRgb(chartToken("chart-other").defaults.light);
    expect(contrast(other, cardSurface("light"))).toBeGreaterThanOrEqual(3);
    expect(contrast(other, cardSurface("dark"))).toBeGreaterThanOrEqual(3);
  });
});

describe("chart Tailwind colours", () => {
  test("every chart colour emits fill, stroke, background and text utilities", async () => {
    const classNames: string[] = CHART_COLOR_IDS.flatMap((id: string): string[] => [
      `fill-${id}`,
      `stroke-${id}`,
      `bg-${id}`,
      `text-${id}`,
    ]);
    const emitted = await compileUtilities(classNames);
    expect(classNames.filter((className: string): boolean => !emitted.has(className))).toEqual([]);
    for (const id of CHART_COLOR_IDS) {
      expect(emitted.get(`fill-${id}`)).toContain(`var(--${id})`);
    }
  });

  test("the opacity modifier carries its alpha into the chart colours", async () => {
    const emitted = await compileUtilities(["bg-chart-1/10", "fill-chart-other/40"]);
    expect(emitted.get("bg-chart-1/10")).toContain("var(--chart-1)");
    expect(emitted.get("bg-chart-1/10")).toContain("0.1");
    expect(emitted.get("fill-chart-other/40")).toContain("var(--chart-other)");
    expect(emitted.get("fill-chart-other/40")).toContain("0.4");
  });
});
