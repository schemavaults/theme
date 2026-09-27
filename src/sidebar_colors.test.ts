import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { createRequire } from "node:module";
import { join } from "path";
import type { Config as TailwindConfig } from "tailwindcss";
import SchemaVaultsTailwindConfigFactory from "./TailwindConfigFactory";
import {
  createThemeOverrideStyle,
  renderThemeOverrideCss,
  resolveThemeTokens,
  themeOverridesFromEnvironment,
  themeTokenEnvironmentVariable,
  type ResolvedThemeTokenValue,
  type ThemeOverrides,
} from "./theme_overrides";
import { getThemeToken, listThemeTokenIds, type ThemeTokenID } from "./theme_tokens";

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

/** The light and dark values `resolveThemeTokens` reports for a token. */
function resolved(id: ThemeTokenID, overrides: ThemeOverrides = {}): ResolvedThemeTokenValue[] {
  return resolveThemeTokens(overrides).find((row) => row.token.id === id)!.values;
}

describe("sidebar active gradient tokens", () => {
  test("follow sidebar-ring in the manifest", () => {
    const ids = listThemeTokenIds();
    const ring = ids.indexOf("sidebar-ring");
    expect(ids.slice(ring + 1, ring + 3)).toEqual(["sidebar-active-start", "sidebar-active-end"]);
  });

  test.each([
    [
      "sidebar-active-start",
      "Sidebar active gradient start",
      "First colour of the gradient marking the active nav item.",
      "brand-blue",
      "--schemavaults-brand-blue",
    ],
    ["sidebar-active-end", "Sidebar active gradient end", "Second colour of that gradient.", "brand-red", "--schemavaults-brand-red"],
  ] as const)("'%s' is a sidebar css-color that defaults to the brand colour", (id, label, description, source, sourceVariable) => {
    expect(getThemeToken(id)).toEqual({
      id,
      cssVariable: `--${id}`,
      format: "css-color",
      group: "sidebar",
      label,
      description,
      scopes: ["light", "dark"],
      defaults: { light: `var(${sourceVariable})`, dark: `var(${sourceVariable})` },
      defaultFrom: source,
    });
  });

  test("globals.css reads the override variable and falls back to the brand colour in both modes", () => {
    const css = readFileSync(join(import.meta.dir, "..", "globals.css"), "utf8");
    for (const mode of ["light", "dark"]) {
      expect(css).toContain(
        `--sidebar-active-start: var(--sv-theme-${mode}-sidebar-active-start, var(--schemavaults-brand-blue));`,
      );
      expect(css).toContain(`--sidebar-active-end: var(--sv-theme-${mode}-sidebar-active-end, var(--schemavaults-brand-red));`);
    }
  });
});

describe("sidebar active gradient overrides", () => {
  test("have environment variables named after the token", () => {
    expect(themeTokenEnvironmentVariable("sidebar-active-start", "light")).toBe("THEME_LIGHT_SIDEBAR_ACTIVE_START");
    expect(themeTokenEnvironmentVariable("sidebar-active-start", "dark")).toBe("THEME_DARK_SIDEBAR_ACTIVE_START");
    expect(themeTokenEnvironmentVariable("sidebar-active-end", "light")).toBe("THEME_LIGHT_SIDEBAR_ACTIVE_END");
    expect(themeTokenEnvironmentVariable("sidebar-active-end", "dark")).toBe("THEME_DARK_SIDEBAR_ACTIVE_END");
  });

  test("are read from the environment", () => {
    const { overrides, problems } = themeOverridesFromEnvironment({
      THEME_LIGHT_SIDEBAR_ACTIVE_START: "#7c3aed",
      THEME_DARK_SIDEBAR_ACTIVE_END: " oklch(0.65 0.2 350) ",
      THEME_LIGHT_SIDEBAR_ACTIVE_END: "url(https://example.com)",
    });
    expect(overrides).toEqual({
      light: { "sidebar-active-start": "#7c3aed" },
      dark: { "sidebar-active-end": "oklch(0.65 0.2 350)" },
    });
    expect(problems.map((problem) => problem.variable)).toEqual(["THEME_LIGHT_SIDEBAR_ACTIVE_END"]);
  });

  test("render as override variables per mode", () => {
    const overrides: ThemeOverrides = {
      light: { "sidebar-active-start": "#7c3aed", "sidebar-active-end": "#db2777" },
      dark: { "sidebar-active-start": "#a78bfa" },
    };
    expect(createThemeOverrideStyle(overrides)).toEqual({
      "--sv-theme-light-sidebar-active-start": "#7c3aed",
      "--sv-theme-light-sidebar-active-end": "#db2777",
      "--sv-theme-dark-sidebar-active-start": "#a78bfa",
    });
    expect(renderThemeOverrideCss(overrides)).toBe(
      ":root{--sv-theme-light-sidebar-active-start:#7c3aed;--sv-theme-light-sidebar-active-end:#db2777;--sv-theme-dark-sidebar-active-start:#a78bfa;}",
    );
  });
});

describe("sidebar active gradient defaults", () => {
  test("resolve to the brand colours", () => {
    expect(resolved("sidebar-active-start")).toEqual([
      {
        scope: "light",
        defaultValue: "#60a5fa",
        override: null,
        value: "#60a5fa",
        overrideVariable: "--sv-theme-light-sidebar-active-start",
      },
      {
        scope: "dark",
        defaultValue: "#60a5fa",
        override: null,
        value: "#60a5fa",
        overrideVariable: "--sv-theme-dark-sidebar-active-start",
      },
    ]);
    expect(resolved("sidebar-active-end").map((value) => value.value)).toEqual(["#dc2626", "#dc2626"]);
  });

  test("follow a re-themed brand colour, in that mode only", () => {
    const overrides: ThemeOverrides = { light: { "brand-blue": "#0ea5e9" }, dark: { "brand-red": "#f43f5e" } };
    expect(resolved("sidebar-active-start", overrides).map((value) => [value.defaultValue, value.override, value.value])).toEqual([
      ["#0ea5e9", null, "#0ea5e9"],
      ["#60a5fa", null, "#60a5fa"],
    ]);
    expect(resolved("sidebar-active-end", overrides).map((value) => value.value)).toEqual(["#dc2626", "#f43f5e"]);
  });

  test("give way to the token's own override", () => {
    const overrides: ThemeOverrides = {
      light: { "brand-blue": "#0ea5e9", "sidebar-active-start": "#7c3aed" },
    };
    const [light, dark] = resolved("sidebar-active-start", overrides);
    expect(light).toMatchObject({ defaultValue: "#0ea5e9", override: "#7c3aed", value: "#7c3aed" });
    expect(dark).toMatchObject({ defaultValue: "#60a5fa", override: null, value: "#60a5fa" });
    // The brand colour itself is untouched by the gradient's override.
    expect(resolved("brand-blue", overrides).map((value) => value.value)).toEqual(["#0ea5e9", "#60a5fa"]);
  });
});

describe("sidebar active gradient Tailwind colours", () => {
  test("build the gradient", async () => {
    const emitted = await compileUtilities([
      "from-sidebar-active-start",
      "via-sidebar-active-start",
      "to-sidebar-active-end",
      "from-sidebar-active-end",
      "to-sidebar-active-start",
    ]);
    expect(emitted.get("from-sidebar-active-start")).toContain("--tw-gradient-from: color-mix(in oklab, var(--sidebar-active-start)");
    expect(emitted.get("via-sidebar-active-start")).toContain("var(--sidebar-active-start)");
    expect(emitted.get("to-sidebar-active-end")).toContain("--tw-gradient-to: color-mix(in oklab, var(--sidebar-active-end)");
    expect(emitted.get("from-sidebar-active-end")).toContain("var(--sidebar-active-end)");
    expect(emitted.get("to-sidebar-active-start")).toContain("var(--sidebar-active-start)");
  });

  test("take the opacity modifier", async () => {
    const emitted = await compileUtilities([
      "bg-sidebar-active-start/20",
      "bg-sidebar-active-end/10",
      "from-sidebar-active-start/15",
      "shadow-sidebar-active-start/50",
    ]);
    expect(emitted.get("bg-sidebar-active-start/20")).toContain("var(--sidebar-active-start) calc(0.2 * 100%)");
    expect(emitted.get("bg-sidebar-active-end/10")).toContain("var(--sidebar-active-end) calc(0.1 * 100%)");
    expect(emitted.get("from-sidebar-active-start/15")).toContain("var(--sidebar-active-start) calc(0.15 * 100%)");
    expect(emitted.get("shadow-sidebar-active-start/50")).toContain("var(--sidebar-active-start)");
  });

  test("emit background, text and border utilities", async () => {
    const classNames: string[] = ["sidebar-active-start", "sidebar-active-end"].flatMap((color: string): string[] => [
      `bg-${color}`,
      `text-${color}`,
      `border-${color}`,
    ]);
    const emitted = await compileUtilities(classNames);
    expect(classNames.filter((className: string): boolean => !emitted.has(className))).toEqual([]);
  });
});
