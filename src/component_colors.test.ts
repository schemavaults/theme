import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";
import type { Config as TailwindConfig } from "tailwindcss";
import SchemaVaultsTailwindConfigFactory from "./TailwindConfigFactory";

// PostCSS and Tailwind are CommonJS (`export = `), and this project keeps
// `allowSyntheticDefaultImports` off, so they are required rather than
// default-imported.
const require_ = createRequire(import.meta.url);
const postcss = require_("postcss") as (
  plugins: readonly import("postcss").AcceptedPlugin[],
) => import("postcss").Processor;
const tailwind = require_("tailwindcss") as (
  config: TailwindConfig,
) => import("postcss").AcceptedPlugin;

/**
 * Compiles a set of utility classes against the generated theme and returns
 * the declarations Tailwind emitted for each one, keyed by class name.
 *
 * A class Tailwind refuses to emit a rule for is simply absent from the map —
 * which is the failure this file is here to catch. Tailwind does not warn when
 * it cannot fit an alpha channel into a colour; it just drops the utility, so
 * the only way to know `bg-warning/15` works is to compile it and look.
 */
async function compileUtilities(
  classNames: readonly string[],
): Promise<Map<string, string>> {
  // Build the config through the factory so the colours under test are exactly
  // the ones consumers get, then point Tailwind at the class list in memory
  // (createConfig only accepts content globs).
  const config: TailwindConfig = new SchemaVaultsTailwindConfigFactory().createConfig({
    content: ["./src/**/*.tsx"],
  });
  config.content = [{ raw: classNames.join(" "), extension: "html" }];
  const compiled = await postcss([tailwind(config)]).process(
    "@tailwind utilities;",
    { from: undefined },
  );

  const emitted = new Map<string, string>();
  compiled.root.walkRules((rule) => {
    const declarations: string[] = [];
    rule.walkDecls((declaration) => {
      declarations.push(`${declaration.prop}: ${declaration.value}`);
    });
    // ".bg-warning\/15" -> "bg-warning/15"
    emitted.set(rule.selector.replace(/^\./, "").replace(/\\/g, ""), declarations.join("; "));
  });
  return emitted;
}

/** Every colour the theme exposes that a component might tint. */
const TINTABLE_COLORS = [
  "border",
  "input",
  "ring",
  "background",
  "foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "destructive",
  "destructive-foreground",
  "warning",
  "warning-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "popover",
  "popover-foreground",
  "card",
  "card-foreground",
] as const;

describe("componentColors opacity modifiers", () => {
  test("every component colour emits a rule for the opacity modifier", async () => {
    const classNames = TINTABLE_COLORS.flatMap((color) => [
      `bg-${color}`,
      `bg-${color}/15`,
      `text-${color}/90`,
      `border-${color}/40`,
    ]);
    const emitted = await compileUtilities(classNames);

    const missing = classNames.filter((className) => !emitted.has(className));
    expect(missing).toEqual([]);
  });

  test("the warning colour carries the requested alpha into the emitted value", async () => {
    const emitted = await compileUtilities([
      "bg-warning",
      "bg-warning/15",
      "text-warning-foreground/50",
    ]);

    // The token keeps its own colour space; only the alpha channel is added.
    expect(emitted.get("bg-warning/15")).toContain("var(--warning)");
    expect(emitted.get("bg-warning/15")).toContain("0.15");
    expect(emitted.get("text-warning-foreground/50")).toContain(
      "var(--warning-foreground)",
    );
    expect(emitted.get("text-warning-foreground/50")).toContain("0.5");

    // Without a modifier the colour stays fully opaque.
    expect(emitted.get("bg-warning")).toContain("--tw-bg-opacity");
  });

  test("an unmodified warning utility still resolves to the bare token", async () => {
    const emitted = await compileUtilities(["text-warning"]);
    expect(emitted.get("text-warning")).toContain("var(--warning)");
  });
});
