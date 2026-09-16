/**
 * "@schemavaults/theme/tokens": the token manifest and the override helpers.
 * Everything here is plain data and pure functions with no Node.js
 * dependencies, so it can be imported from browser bundles and client
 * components — unlike the package root, whose Tailwind config factory reads
 * the filesystem.
 */

export {
  THEME_TOKENS,
  listThemeTokens,
  listThemeTokenIds,
  isThemeTokenId,
  getThemeToken,
  themeTokenHasScope,
  themeTokenDefault,
} from "./theme_tokens";
export type {
  ThemeToken,
  ModeThemeToken,
  SharedThemeToken,
  ThemeTokenID,
  ModeThemeTokenID,
  SharedThemeTokenID,
  ThemeTokenScope,
  ThemeMode,
  ThemeTokenFormat,
  ThemeTokenGroup,
} from "./theme_tokens";

export {
  THEME_OVERRIDE_VARIABLE_PREFIX,
  ThemeTokenValueError,
  themeOverrideVariable,
  normalizeThemeTokenValue,
  createThemeOverrideStyle,
  renderThemeOverrideCss,
  resolveThemeTokens,
  themeTokenEnvironmentVariable,
  themeOverridesFromEnvironment,
} from "./theme_overrides";
export type {
  ThemeOverrides,
  ResolvedThemeToken,
  ResolvedThemeTokenValue,
  ThemeEnvironmentOptions,
  ThemeOverrideProblem,
  ThemeOverridesFromEnvironment,
} from "./theme_overrides";

export { toHslChannels, rgbToHslChannels } from "./hsl_channels";
