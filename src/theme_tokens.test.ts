import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { getThemeToken, listThemeTokens, themeTokenDefault, type ModeThemeToken } from "./theme_tokens";
import { themeOverrideVariable } from "./theme_overrides";

/**
 * `globals.css` and the token manifest describe the same tokens: every
 * declaration in the stylesheet reads its override variable and falls back
 * to the manifest's default, and the stylesheet declares nothing the
 * manifest does not know about.
 */
const globalsCss = readFileSync(join(import.meta.dir, "..", "globals.css"), "utf8");

function block(selector: string): string {
  const start = globalsCss.indexOf(`${selector} {`);
  expect(start).toBeGreaterThan(-1);
  const end = globalsCss.indexOf("}", start);
  return globalsCss.slice(start, end);
}

const rootBlock = block(":root");
const darkBlock = block(".dark");

function declarations(cssBlock: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const line of cssBlock.split("\n")) {
    const match = /^\s*(--[\w-]+):\s*(.+);$/.exec(line);
    if (match) found.set(match[1] as string, match[2] as string);
  }
  return found;
}

describe("THEME_TOKENS", () => {
  test("has a unique id and css variable per token", () => {
    const tokens = listThemeTokens();
    expect(new Set(tokens.map((t) => t.id)).size).toBe(tokens.length);
    expect(new Set(tokens.map((t) => t.cssVariable)).size).toBe(tokens.length);
  });

  test.each(listThemeTokens().map((token) => [token.id, token] as const))(
    "globals.css declares '%s' from its override variable with the manifest default",
    (_id, token) => {
      for (const scope of token.scopes) {
        const cssBlock = scope === "dark" ? darkBlock : rootBlock;
        const expected = `${token.cssVariable}: var(${themeOverrideVariable(token.id, scope)}, ${themeTokenDefault(token, scope)});`;
        expect(cssBlock).toContain(expected);
      }
    },
  );

  test.each(
    listThemeTokens()
      .filter((token): token is ModeThemeToken => "defaultFrom" in token && token.defaultFrom !== undefined)
      .map((token) => [token.id, token] as const),
  )("'%s' falls back to the variable of the token it takes its default from", (_id, token) => {
    const source = getThemeToken(token.defaultFrom!);
    expect(source.id).not.toBe(token.id);
    expect(source.scopes).toEqual(token.scopes);
    for (const scope of token.scopes) {
      expect(themeTokenDefault(token, scope)).toBe(`var(${source.cssVariable})`);
    }
  });

  test("a default that references another variable is declared through defaultFrom", () => {
    // Otherwise resolveThemeTokens would report the raw `var()` as the value.
    for (const token of listThemeTokens()) {
      if ("defaultFrom" in token && token.defaultFrom !== undefined) continue;
      for (const scope of token.scopes) expect(themeTokenDefault(token, scope)).not.toContain("var(");
    }
  });

  test("globals.css declares no token the manifest lacks", () => {
    const known = new Set(listThemeTokens().map((t) => t.cssVariable));
    for (const variable of declarations(rootBlock).keys()) expect(known).toContain(variable as `--${string}`);
    for (const variable of declarations(darkBlock).keys()) expect(known).toContain(variable as `--${string}`);
  });

  test("the dark block declares every mode token and no shared one", () => {
    const dark = declarations(darkBlock);
    for (const token of listThemeTokens()) {
      expect(dark.has(token.cssVariable)).toBe(token.scopes.includes("dark" as never));
    }
  });
});
