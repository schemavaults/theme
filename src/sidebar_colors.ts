import type { Config as TailwindConfig } from "tailwindcss";
import { colorWithAlphaChannel } from "./component_colors";
type TailwindConfigTheme = NonNullable<TailwindConfig["theme"]>;
type ThemeExtension = NonNullable<TailwindConfigTheme["extend"]>;
type ThemeValue = ThemeExtension[string];

/**
 * The two colours of the gradient that marks the active navigation item, as
 * Tailwind colours, so an application can reuse it:
 * `bg-gradient-to-r from-sidebar-active-start to-sidebar-active-end`,
 * `bg-sidebar-active-start/20`.
 *
 * The tokens hold complete colours (by default a `var()` reference to the
 * brand colours), so they go through `color-mix()` like the chart colours
 * do, which keeps Tailwind's opacity modifier working on them. The keys are
 * flat rather than nested under `sidebar` so they never collide with an
 * application's own `sidebar` colour.
 */
export const sidebarColors: ThemeValue = {
  "sidebar-active-start": colorWithAlphaChannel("--sidebar-active-start"),
  "sidebar-active-end": colorWithAlphaChannel("--sidebar-active-end"),
};
