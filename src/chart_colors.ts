import type { Config as TailwindConfig } from "tailwindcss";
import { colorWithAlphaChannel } from "./component_colors";
type TailwindConfigTheme = NonNullable<TailwindConfig["theme"]>;
type ThemeExtension = NonNullable<TailwindConfigTheme["extend"]>;
type ThemeValue = ThemeExtension[string];

/** How many categorical colours the palette has; a ninth series folds into `chart-other`. */
export const CHART_SERIES_SLOT_COUNT = 8 as const;

/**
 * The categorical chart colours as Tailwind colours: `chart-1` … `chart-8`
 * for series in slot order, and `chart-other` for the de-emphasis grey
 * (`fill-chart-3`, `bg-chart-other/40`, `stroke-chart-1`).
 *
 * The tokens hold complete colours (hex codes), so they go through
 * `color-mix()` like `warning` does, which keeps Tailwind's opacity modifier
 * working on them.
 */
export const chartColors: ThemeValue = {
  chart: {
    ...Object.fromEntries(
      Array.from({ length: CHART_SERIES_SLOT_COUNT }, (_, index: number) => {
        const slot: number = index + 1;
        return [String(slot), colorWithAlphaChannel(`--chart-${slot}`)];
      }),
    ),
    other: colorWithAlphaChannel("--chart-other"),
  },
};
