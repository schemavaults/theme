import { describe, expect, test } from "bun:test";
import {
  createThemeOverrideStyle,
  normalizeThemeTokenValue,
  renderThemeOverrideCss,
  resolveThemeTokens,
  ThemeTokenValueError,
  themeOverridesFromEnvironment,
  themeOverrideVariable,
  themeTokenEnvironmentVariable,
} from "./theme_overrides";
import { getThemeToken, listThemeTokens } from "./theme_tokens";

describe("themeOverrideVariable", () => {
  test("names light, dark and shared variables", () => {
    expect(themeOverrideVariable("background", "light")).toBe("--sv-theme-light-background");
    expect(themeOverrideVariable("sidebar-primary-foreground", "dark")).toBe(
      "--sv-theme-dark-sidebar-primary-foreground",
    );
    expect(themeOverrideVariable("radius", "shared")).toBe("--sv-theme-radius");
  });
});

describe("normalizeThemeTokenValue", () => {
  test("turns a hex colour into HSL channels for hsl-channels tokens", () => {
    expect(normalizeThemeTokenValue(getThemeToken("background"), "light", "#0f172a")).toBe("222.2 47.4% 11.2%");
  });

  test("passes channels through unchanged", () => {
    expect(normalizeThemeTokenValue(getThemeToken("primary"), "dark", " 210 40% 98% ")).toBe("210 40% 98%");
  });

  test("keeps css-color tokens as written", () => {
    expect(normalizeThemeTokenValue(getThemeToken("sidebar"), "light", "oklch(0.985 0 0)")).toBe("oklch(0.985 0 0)");
    expect(normalizeThemeTokenValue(getThemeToken("brand-blue"), "dark", "#60a5fa")).toBe("#60a5fa");
    expect(normalizeThemeTokenValue(getThemeToken("sidebar-border", ), "dark", "oklch(1 0 0 / 10%)")).toBe(
      "oklch(1 0 0 / 10%)",
    );
    expect(normalizeThemeTokenValue(getThemeToken("warning"), "light", "gold")).toBe("gold");
  });

  test("accepts lengths for the radius", () => {
    expect(normalizeThemeTokenValue(getThemeToken("radius"), "shared", "8px")).toBe("8px");
    expect(normalizeThemeTokenValue(getThemeToken("radius"), "shared", "0")).toBe("0");
  });

  test.each([
    ["background", "light", "", "empty"],
    ["background", "light", "white", "expected HSL channels"],
    ["background", "light", "#60a5fa80", "expected HSL channels"],
    ["background", "shared", "#fff", "has no shared value"],
    ["radius", "light", "8px", "has no light value"],
    ["radius", "shared", "8", "expected a CSS length"],
    ["radius", "shared", "calc(1rem)", "expected a CSS length"],
    ["sidebar", "light", "red; background: url(x)", "characters a CSS value cannot"],
    ["sidebar", "light", "oklch(1 0 0) } body { display: none", "characters a CSS value cannot"],
    ["sidebar", "light", "url(https://example.com)", "expected a CSS colour"],
    ["brand-blue", "light", "</style><script>", "characters a CSS value cannot"],
  ] as const)("rejects %s/%s = %j", (id, scope, value, reason) => {
    expect(() => normalizeThemeTokenValue(getThemeToken(id), scope, value)).toThrow(ThemeTokenValueError);
    try {
      normalizeThemeTokenValue(getThemeToken(id), scope, value);
    } catch (error) {
      expect((error as ThemeTokenValueError).reason).toContain(reason);
    }
  });
});

describe("createThemeOverrideStyle", () => {
  test("emits only the overridden tokens, normalised", () => {
    const style = createThemeOverrideStyle({
      light: { background: "#f8fafc", sidebar: "oklch(0.97 0 0)" },
      dark: { background: "#020617" },
      shared: { radius: "0.75rem" },
    });
    expect(style).toEqual({
      "--sv-theme-light-background": "210 40% 98%",
      "--sv-theme-light-sidebar": "oklch(0.97 0 0)",
      "--sv-theme-dark-background": "228.6 84% 4.9%",
      "--sv-theme-radius": "0.75rem",
    });
  });

  test("is empty when nothing is overridden", () => {
    expect(createThemeOverrideStyle({})).toEqual({});
    expect(createThemeOverrideStyle({ light: {}, dark: undefined })).toEqual({});
  });

  test("throws for an unknown token", () => {
    expect(() => createThemeOverrideStyle({ light: { bogus: "#fff" } as never })).toThrow(/Unknown theme token 'bogus'/);
  });

  test("throws for an invalid value", () => {
    expect(() => createThemeOverrideStyle({ light: { background: "white" } })).toThrow(ThemeTokenValueError);
  });
});

describe("renderThemeOverrideCss", () => {
  test("renders one :root rule", () => {
    expect(renderThemeOverrideCss({ light: { background: "#fff" }, shared: { radius: "0" } })).toBe(
      ":root{--sv-theme-light-background:0 0% 100%;--sv-theme-radius:0;}",
    );
  });

  test("renders nothing without overrides", () => {
    expect(renderThemeOverrideCss({})).toBe("");
  });

  test("takes a selector", () => {
    expect(renderThemeOverrideCss({ shared: { radius: "0" } }, "html")).toBe("html{--sv-theme-radius:0;}");
  });
});

describe("resolveThemeTokens", () => {
  test("lists every token in stylesheet order with defaults and overrides", () => {
    const rows = resolveThemeTokens({ light: { background: "#fff" }, dark: { background: "#000" } });
    expect(rows.map((r) => r.token.id)).toEqual(listThemeTokens().map((t) => t.id));

    const background = rows.find((r) => r.token.id === "background")!;
    expect(background.values).toEqual([
      {
        scope: "light",
        defaultValue: "0 0% 100%",
        override: "0 0% 100%",
        value: "0 0% 100%",
        overrideVariable: "--sv-theme-light-background",
      },
      {
        scope: "dark",
        defaultValue: "222.2 84% 4.9%",
        override: "0 0% 0%",
        value: "0 0% 0%",
        overrideVariable: "--sv-theme-dark-background",
      },
    ]);

    const radius = rows.find((r) => r.token.id === "radius")!;
    expect(radius.values).toEqual([
      { scope: "shared", defaultValue: "0.5rem", override: null, value: "0.5rem", overrideVariable: "--sv-theme-radius" },
    ]);

    const foreground = rows.find((r) => r.token.id === "foreground")!;
    expect(foreground.values.map((v) => v.override)).toEqual([null, null]);
    expect(foreground.values.map((v) => v.value)).toEqual(["222.2 84% 4.9%", "210 40% 98%"]);
  });
});

describe("themeTokenEnvironmentVariable", () => {
  test("derives names from the token id and scope", () => {
    expect(themeTokenEnvironmentVariable("background", "light")).toBe("THEME_LIGHT_BACKGROUND");
    expect(themeTokenEnvironmentVariable("sidebar-primary-foreground", "dark")).toBe(
      "THEME_DARK_SIDEBAR_PRIMARY_FOREGROUND",
    );
    expect(themeTokenEnvironmentVariable("radius", "shared")).toBe("THEME_RADIUS");
    expect(themeTokenEnvironmentVariable("brand-blue", "light", { prefix: "BRANDING_THEME" })).toBe(
      "BRANDING_THEME_LIGHT_BRAND_BLUE",
    );
  });
});

describe("themeOverridesFromEnvironment", () => {
  test("reads set variables, skips blank ones and reports bad ones", () => {
    const { overrides, problems } = themeOverridesFromEnvironment(
      {
        THEME_LIGHT_BACKGROUND: "#f8fafc",
        THEME_DARK_BACKGROUND: "  ",
        THEME_LIGHT_PRIMARY: "not a colour",
        THEME_RADIUS: "0.25rem",
        THEME_LIGHT_RADIUS: "1rem",
        UNRELATED: "value",
      },
      {},
    );
    expect(overrides).toEqual({ light: { background: "210 40% 98%" }, shared: { radius: "0.25rem" } });
    expect(problems).toEqual([
      {
        variable: "THEME_LIGHT_PRIMARY",
        tokenId: "primary",
        scope: "light",
        value: "not a colour",
        reason: "expected HSL channels ('222.2 84% 4.9%'), a hex colour, or an opaque rgb()/hsl() colour",
      },
    ]);
  });

  test("honours a prefix", () => {
    const { overrides, problems } = themeOverridesFromEnvironment(
      { BRANDING_THEME_DARK_SIDEBAR: "oklch(0.2 0 0)", THEME_DARK_SIDEBAR: "oklch(0.9 0 0)" },
      { prefix: "BRANDING_THEME" },
    );
    expect(problems).toEqual([]);
    expect(overrides).toEqual({ dark: { sidebar: "oklch(0.2 0 0)" } });
  });

  test("its output round-trips through createThemeOverrideStyle", () => {
    const { overrides } = themeOverridesFromEnvironment({ THEME_LIGHT_BACKGROUND: "#0f172a" });
    expect(createThemeOverrideStyle(overrides)).toEqual({ "--sv-theme-light-background": "222.2 47.4% 11.2%" });
  });
});
