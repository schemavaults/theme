import { toHslChannels } from "./hsl_channels";
import {
  getThemeToken,
  isThemeTokenId,
  listThemeTokens,
  themeTokenDefault,
  themeTokenHasScope,
  type ThemeToken,
  type ThemeTokenID,
  type ThemeTokenScope,
} from "./theme_tokens";

/**
 * Overriding the stylesheet's tokens for one deployment.
 *
 * `globals.css` reads every token through an override variable:
 *   `--background: var(--sv-theme-light-background, 0 0% 100%)`.
 * The helpers here turn a `ThemeOverrides` object into those variables — as
 * a style object for a framework's `<html style={…}>`, or as CSS text for a
 * `<style>` element — after checking and normalising each value, so a hex
 * colour becomes the HSL channels an `hsl-channels` token needs, and a
 * value that would break the stylesheet (or escape an attribute) is
 * refused rather than shipped.
 *
 * Values must be set only for the scopes a token has: `radius` is shared by
 * both modes (`overrides.shared.radius`), every colour has a `light` and a
 * `dark` value. A scope left out keeps the stylesheet default.
 */

/** Which tokens to override, per scope, keyed by token id. Values are raw: hex colours are fine. */
export interface ThemeOverrides {
  light?: Partial<Record<ThemeTokenID, string>>;
  dark?: Partial<Record<ThemeTokenID, string>>;
  shared?: Partial<Record<ThemeTokenID, string>>;
}

export const THEME_OVERRIDE_VARIABLE_PREFIX = "--sv-theme" as const;

/** The custom property `globals.css` reads a token's override from, e.g. `--sv-theme-dark-background`. */
export function themeOverrideVariable(id: ThemeTokenID, scope: ThemeTokenScope): `--${string}` {
  return scope === "shared"
    ? `${THEME_OVERRIDE_VARIABLE_PREFIX}-${id}`
    : `${THEME_OVERRIDE_VARIABLE_PREFIX}-${scope}-${id}`;
}

/** Thrown for a value the token cannot take; `reason` is safe to show to an administrator. */
export class ThemeTokenValueError extends Error {
  public readonly tokenId: ThemeTokenID;
  public readonly scope: ThemeTokenScope;
  public readonly value: string;
  public readonly reason: string;

  public constructor(tokenId: ThemeTokenID, scope: ThemeTokenScope, value: string, reason: string) {
    super(`Invalid ${scope} value for theme token '${tokenId}' (${JSON.stringify(value)}): ${reason}`);
    this.name = "ThemeTokenValueError";
    this.tokenId = tokenId;
    this.scope = scope;
    this.value = value;
    this.reason = reason;
  }
}

// Characters that could end the declaration, the rule or the attribute the
// value is written into. No colour or length legitimately contains them.
const UNSAFE_CHARACTERS = /[;{}<>"'\\\x00-\x1f]|\/\*/;
const CSS_COLOR = /^(#[0-9a-f]{3,8}|[a-z]+|[a-z-]+\([\w\s.,%/+-]*\))$/i;
const CSS_LENGTH = /^(0|-?(?:\d+\.?\d*|\.\d+)(px|rem|em|%|vh|vw|vmin|vmax|ch|ex))$/i;

/**
 * The value as `globals.css` should receive it, or a `ThemeTokenValueError`.
 * `hsl-channels` tokens accept any opaque colour `toHslChannels` understands
 * and come back as channels; the other formats are checked and trimmed.
 */
export function normalizeThemeTokenValue(
  token: ThemeToken,
  scope: ThemeTokenScope,
  rawValue: string,
): string {
  const value = rawValue.trim();
  if (!themeTokenHasScope(token, scope)) {
    throw new ThemeTokenValueError(
      token.id,
      scope,
      rawValue,
      `the token has no ${scope} value; it takes ${token.scopes.map((s) => `'${s}'`).join(" and ")}`,
    );
  }
  if (value.length === 0) {
    throw new ThemeTokenValueError(token.id, scope, rawValue, "the value is empty");
  }
  if (UNSAFE_CHARACTERS.test(value)) {
    throw new ThemeTokenValueError(token.id, scope, rawValue, "the value contains characters a CSS value cannot");
  }

  switch (token.format) {
    case "hsl-channels": {
      const channels = toHslChannels(value);
      if (channels === null) {
        throw new ThemeTokenValueError(
          token.id,
          scope,
          rawValue,
          "expected HSL channels ('222.2 84% 4.9%'), a hex colour, or an opaque rgb()/hsl() colour",
        );
      }
      return channels;
    }
    case "css-color": {
      if (!CSS_COLOR.test(value)) {
        throw new ThemeTokenValueError(
          token.id,
          scope,
          rawValue,
          "expected a CSS colour such as '#60a5fa' or 'oklch(0.985 0 0)'",
        );
      }
      return value;
    }
    case "length": {
      if (!CSS_LENGTH.test(value)) {
        throw new ThemeTokenValueError(token.id, scope, rawValue, "expected a CSS length such as '0.5rem' or '8px'");
      }
      return value;
    }
  }
}

function assertThemeTokenId(maybeId: string, scope: ThemeTokenScope): ThemeTokenID {
  if (!isThemeTokenId(maybeId)) {
    throw new Error(`Unknown theme token '${maybeId}' in the ${scope} overrides!`);
  }
  return maybeId;
}

function* eachOverride(overrides: ThemeOverrides): Generator<[ThemeToken, ThemeTokenScope, string]> {
  for (const scope of ["light", "dark", "shared"] as const) {
    const values = overrides[scope];
    if (!values) continue;
    for (const [maybeId, rawValue] of Object.entries(values)) {
      if (rawValue === undefined || rawValue === null) continue;
      const id = assertThemeTokenId(maybeId, scope);
      yield [getThemeToken(id), scope, rawValue];
    }
  }
}

/**
 * The override variables as a style object — `{ "--sv-theme-light-background": "210 40% 98%" }` —
 * for the <html> element's `style` attribute (React passes custom properties
 * through as given). Only the tokens set in `overrides` appear; a stylesheet
 * default is never restated, so it keeps applying wherever nothing is set.
 * Throws `ThemeTokenValueError` for a value a token cannot take.
 */
export function createThemeOverrideStyle(overrides: ThemeOverrides): Record<`--${string}`, string> {
  const style: Record<`--${string}`, string> = {};
  for (const [token, scope, rawValue] of eachOverride(overrides)) {
    style[themeOverrideVariable(token.id, scope)] = normalizeThemeTokenValue(token, scope, rawValue);
  }
  return style;
}

/**
 * The same declarations as one CSS rule for a `<style>` element:
 * `:root{--sv-theme-light-background:210 40% 98%;}`. Empty when nothing is
 * overridden. `selector` should be the <html> element (`:root`) so the
 * variables are inherited by the `.dark` block wherever the class is placed.
 */
export function renderThemeOverrideCss(overrides: ThemeOverrides, selector: string = ":root"): string {
  const declarations = Object.entries(createThemeOverrideStyle(overrides)).map(
    ([variable, value]) => `${variable}:${value};`,
  );
  if (declarations.length === 0) return "";
  return `${selector}{${declarations.join("")}}`;
}

/** The token's effective value in one scope, for a settings page. */
export interface ResolvedThemeTokenValue {
  scope: ThemeTokenScope;
  /** The stylesheet default. */
  defaultValue: string;
  /** The normalised override, or null when the default applies. */
  override: string | null;
  /** What the token renders as: the override when set, the default otherwise. */
  value: string;
  /** The custom property an override is delivered through. */
  overrideVariable: `--${string}`;
}

export interface ResolvedThemeToken {
  token: ThemeToken;
  /** One entry per scope the token has: light and dark, or shared. */
  values: ResolvedThemeTokenValue[];
}

/**
 * Every token with its defaults and the overrides applied, in stylesheet
 * order: the rows of a "theme" settings page. Throws for an invalid value,
 * like `createThemeOverrideStyle`; validate with `themeOverridesFromEnvironment`
 * (or catch `ThemeTokenValueError`) first when the values are untrusted.
 */
export function resolveThemeTokens(overrides: ThemeOverrides = {}): ResolvedThemeToken[] {
  const style = createThemeOverrideStyle(overrides);
  return listThemeTokens().map((token) => ({
    token,
    values: token.scopes.map((scope): ResolvedThemeTokenValue => {
      const overrideVariable = themeOverrideVariable(token.id, scope);
      const defaultValue = themeTokenDefault(token, scope) as string;
      const override = style[overrideVariable] ?? null;
      return { scope, defaultValue, override, value: override ?? defaultValue, overrideVariable };
    }),
  }));
}

export interface ThemeEnvironmentOptions {
  /** The variable name prefix; `THEME` reads `THEME_LIGHT_BACKGROUND`, `THEME_DARK_BACKGROUND` and `THEME_RADIUS`. */
  prefix?: string;
}

const DEFAULT_ENVIRONMENT_PREFIX = "THEME";

/**
 * The environment variable that configures a token in one scope:
 * `<PREFIX>_<SCOPE>_<TOKEN>` for light and dark values and `<PREFIX>_<TOKEN>`
 * for shared ones, with the token id upper-cased and hyphens turned into
 * underscores (`sidebar-primary-foreground` → `THEME_LIGHT_SIDEBAR_PRIMARY_FOREGROUND`).
 */
export function themeTokenEnvironmentVariable(
  id: ThemeTokenID,
  scope: ThemeTokenScope,
  options: ThemeEnvironmentOptions = {},
): string {
  const prefix = options.prefix ?? DEFAULT_ENVIRONMENT_PREFIX;
  const suffix = id.toUpperCase().replace(/-/g, "_");
  return scope === "shared" ? `${prefix}_${suffix}` : `${prefix}_${scope.toUpperCase()}_${suffix}`;
}

/** A variable whose value was refused, with the reason to show an administrator. */
export interface ThemeOverrideProblem {
  variable: string;
  tokenId: ThemeTokenID;
  scope: ThemeTokenScope;
  value: string;
  reason: string;
}

export interface ThemeOverridesFromEnvironment {
  /** The valid overrides, normalised; safe to pass to `createThemeOverrideStyle`. */
  overrides: ThemeOverrides;
  /** Variables that were set to something the token cannot take; those keep their defaults. */
  problems: ThemeOverrideProblem[];
}

/**
 * Reads every token's override from environment variables named by
 * `themeTokenEnvironmentVariable`. A variable that is unset or blank leaves
 * the default alone; an invalid value is reported in `problems` and skipped
 * rather than thrown, so one typo in a deployment's configuration cannot
 * take its pages down.
 */
export function themeOverridesFromEnvironment(
  env: Readonly<Record<string, string | undefined>>,
  options: ThemeEnvironmentOptions = {},
): ThemeOverridesFromEnvironment {
  const overrides: ThemeOverrides = {};
  const problems: ThemeOverrideProblem[] = [];
  for (const token of listThemeTokens()) {
    for (const scope of token.scopes) {
      const variable = themeTokenEnvironmentVariable(token.id, scope, options);
      const rawValue = env[variable];
      if (rawValue === undefined || rawValue.trim().length === 0) continue;
      try {
        const value = normalizeThemeTokenValue(token, scope, rawValue);
        (overrides[scope] ??= {})[token.id] = value;
      } catch (error) {
        const reason = error instanceof ThemeTokenValueError ? error.reason : String(error);
        problems.push({ variable, tokenId: token.id, scope, value: rawValue, reason });
      }
    }
  }
  return { overrides, problems };
}
