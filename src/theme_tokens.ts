/**
 * The design tokens `globals.css` declares, as data: which CSS variable each
 * one is, the value format it expects, its light and dark defaults, and a
 * label and description an application can show on a theming settings page.
 *
 * `globals.css` declares every token as
 *   `--token: var(--sv-theme-<scope>-<id>, <default>)`,
 * so an application overrides a token by setting the override variable on
 * the <html> element; see `theme_overrides.ts`. A unit test checks that the
 * stylesheet and this manifest agree.
 */

/** Which stylesheet block a value belongs to: the light `:root`, the `.dark` class, or both. */
export type ThemeTokenScope = "light" | "dark" | "shared";

/** The two colour modes the stylesheet declares tokens for. */
export type ThemeMode = Exclude<ThemeTokenScope, "shared">;

/**
 * How a token's value is written.
 * - `hsl-channels`: the three space-separated channels of an HSL colour
 *   (`222.2 84% 4.9%`), which the Tailwind theme wraps in `hsl()`.
 * - `css-color`: any CSS `<color>` (`#60a5fa`, `oklch(0.985 0 0)`, `rgb(…)`).
 * - `length`: a CSS `<length>` such as `0.5rem`.
 */
export type ThemeTokenFormat = "hsl-channels" | "css-color" | "length";

/** A heading a settings page can group tokens under. */
export type ThemeTokenGroup =
  | "brand"
  | "page"
  | "surfaces"
  | "actions"
  | "states"
  | "outlines"
  | "shape"
  | "sidebar";

interface ThemeTokenBase {
  /** The CSS variable the token is read from, e.g. `--background`. */
  readonly cssVariable: `--${string}`;
  readonly format: ThemeTokenFormat;
  readonly group: ThemeTokenGroup;
  /** A short human-readable name, e.g. "Page background". */
  readonly label: string;
  /** Where the token shows up, for a settings page. */
  readonly description: string;
}

/** A token with a separate value in light and dark mode. */
export interface ModeThemeToken extends ThemeTokenBase {
  readonly id: ModeThemeTokenID;
  readonly scopes: readonly ["light", "dark"];
  readonly defaults: { readonly light: string; readonly dark: string };
}

/** A token declared once, for both modes. */
export interface SharedThemeToken extends ThemeTokenBase {
  readonly id: SharedThemeTokenID;
  readonly scopes: readonly ["shared"];
  readonly defaults: { readonly shared: string };
}

export type ThemeToken = ModeThemeToken | SharedThemeToken;

const MODE_THEME_TOKEN_IDS = [
  "brand-blue",
  "brand-red",
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "warning",
  "warning-foreground",
  "border",
  "input",
  "ring",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const satisfies readonly string[];

const SHARED_THEME_TOKEN_IDS = ["radius"] as const satisfies readonly string[];

export type ModeThemeTokenID = (typeof MODE_THEME_TOKEN_IDS)[number];
export type SharedThemeTokenID = (typeof SHARED_THEME_TOKEN_IDS)[number];
export type ThemeTokenID = ModeThemeTokenID | SharedThemeTokenID;

const MODE_SCOPES = ["light", "dark"] as const;
const SHARED_SCOPES = ["shared"] as const;

function hsl(
  id: ModeThemeTokenID,
  group: ThemeTokenGroup,
  label: string,
  description: string,
  light: string,
  dark: string,
): ModeThemeToken {
  return {
    id,
    cssVariable: `--${id}`,
    format: "hsl-channels",
    group,
    label,
    description,
    scopes: MODE_SCOPES,
    defaults: { light, dark },
  };
}

function color(
  id: ModeThemeTokenID,
  cssVariable: `--${string}`,
  group: ThemeTokenGroup,
  label: string,
  description: string,
  light: string,
  dark: string,
): ModeThemeToken {
  return {
    id,
    cssVariable,
    format: "css-color",
    group,
    label,
    description,
    scopes: MODE_SCOPES,
    defaults: { light, dark },
  };
}

/**
 * Every token, in the order `globals.css` declares them. Tokens whose format
 * is `hsl-channels` are the shadcn/ui component colours the Tailwind theme
 * exposes as `bg-background`, `text-primary-foreground` and so on.
 */
export const THEME_TOKENS: readonly ThemeToken[] = [
  color(
    "brand-blue",
    "--schemavaults-brand-blue",
    "brand",
    "Brand blue",
    "The SchemaVaults brand blue, available as the `schemavaults-brand-blue` Tailwind colour.",
    "#60a5fa",
    "#60a5fa",
  ),
  color(
    "brand-red",
    "--schemavaults-brand-red",
    "brand",
    "Brand red",
    "The SchemaVaults brand red, available as the `schemavaults-brand-red` Tailwind colour.",
    "#dc2626",
    "#dc2626",
  ),

  hsl("background", "page", "Page background", "The background of the page body.", "0 0% 100%", "222.2 84% 4.9%"),
  hsl("foreground", "page", "Page text", "The default text colour on the page background.", "222.2 84% 4.9%", "210 40% 98%"),

  hsl("card", "surfaces", "Card background", "The background of cards and panels.", "0 0% 100%", "222.2 84% 4.9%"),
  hsl("card-foreground", "surfaces", "Card text", "Text on a card.", "222.2 84% 4.9%", "210 40% 98%"),
  hsl("popover", "surfaces", "Popover background", "The background of dropdown menus, popovers and tooltips.", "0 0% 100%", "222.2 84% 4.9%"),
  hsl("popover-foreground", "surfaces", "Popover text", "Text in a popover.", "222.2 84% 4.9%", "210 40% 98%"),

  hsl("primary", "actions", "Primary", "Primary buttons, links and selected controls.", "222.2 47.4% 11.2%", "210 40% 98%"),
  hsl("primary-foreground", "actions", "Primary text", "Text on a primary-coloured control.", "210 40% 98%", "222.2 47.4% 11.2%"),
  hsl("secondary", "actions", "Secondary", "Secondary buttons and badges.", "210 40% 96.1%", "217.2 32.6% 17.5%"),
  hsl("secondary-foreground", "actions", "Secondary text", "Text on a secondary-coloured control.", "222.2 47.4% 11.2%", "210 40% 98%"),
  hsl("muted", "actions", "Muted", "Subdued backgrounds: table stripes, disabled controls, skeletons.", "210 40% 96.1%", "217.2 32.6% 17.5%"),
  hsl("muted-foreground", "actions", "Muted text", "Secondary text such as descriptions and captions.", "215.4 16.3% 46.9%", "215 20.2% 65.1%"),
  hsl("accent", "actions", "Accent", "Hover and focus backgrounds of menu items and list rows.", "210 40% 96.1%", "217.2 32.6% 17.5%"),
  hsl("accent-foreground", "actions", "Accent text", "Text on an accent background.", "222.2 47.4% 11.2%", "210 40% 98%"),

  hsl("destructive", "states", "Destructive", "Delete buttons and error states.", "0 84.2% 60.2%", "0 62.8% 30.6%"),
  hsl("destructive-foreground", "states", "Destructive text", "Text on a destructive-coloured control.", "210 40% 98%", "210 40% 98%"),
  color("warning", "--warning", "states", "Warning", "Warning callouts and badges.", "oklch(82% 0.189 84.429)", "oklch(82% 0.189 84.429)"),
  color("warning-foreground", "--warning-foreground", "states", "Warning text", "Text on a warning background.", "oklch(41% 0.112 45.904)", "oklch(41% 0.112 45.904)"),

  hsl("border", "outlines", "Border", "The default border colour of every element.", "214.3 31.8% 91.4%", "217.2 32.6% 17.5%"),
  hsl("input", "outlines", "Input border", "The border of text inputs, selects and textareas.", "214.3 31.8% 91.4%", "217.2 32.6% 17.5%"),
  hsl("ring", "outlines", "Focus ring", "The outline drawn around a focused control.", "222.2 84% 4.9%", "212.7 26.8% 83.9%"),

  {
    id: "radius",
    cssVariable: "--radius",
    format: "length",
    group: "shape",
    label: "Corner radius",
    description: "The rounding of buttons, inputs and cards (`rounded-lg`); `rounded-md` and `rounded-sm` are derived from it.",
    scopes: SHARED_SCOPES,
    defaults: { shared: "0.5rem" },
  },

  color("sidebar", "--sidebar", "sidebar", "Sidebar background", "The background of the navigation sidebar.", "oklch(0.985 0 0)", "oklch(0.205 0 0)"),
  color("sidebar-foreground", "--sidebar-foreground", "sidebar", "Sidebar text", "Text in the sidebar.", "oklch(0.145 0 0)", "oklch(0.985 0 0)"),
  color("sidebar-primary", "--sidebar-primary", "sidebar", "Sidebar primary", "The active navigation item's background.", "oklch(0.205 0 0)", "oklch(0.488 0.243 264.376)"),
  color("sidebar-primary-foreground", "--sidebar-primary-foreground", "sidebar", "Sidebar primary text", "Text of the active navigation item.", "oklch(0.985 0 0)", "oklch(0.985 0 0)"),
  color("sidebar-accent", "--sidebar-accent", "sidebar", "Sidebar accent", "The hovered navigation item's background.", "oklch(0.97 0 0)", "oklch(0.269 0 0)"),
  color("sidebar-accent-foreground", "--sidebar-accent-foreground", "sidebar", "Sidebar accent text", "Text of a hovered navigation item.", "oklch(0.205 0 0)", "oklch(0.985 0 0)"),
  color("sidebar-border", "--sidebar-border", "sidebar", "Sidebar border", "The sidebar's edge and separators.", "oklch(0.922 0 0)", "oklch(1 0 0 / 10%)"),
  color("sidebar-ring", "--sidebar-ring", "sidebar", "Sidebar focus ring", "The outline around a focused sidebar item.", "oklch(0.708 0 0)", "oklch(0.439 0 0)"),
];

const THEME_TOKENS_BY_ID: ReadonlyMap<ThemeTokenID, ThemeToken> = new Map(
  THEME_TOKENS.map((token) => [token.id, token]),
);

/** Every token, in stylesheet order. */
export function listThemeTokens(): readonly ThemeToken[] {
  return THEME_TOKENS;
}

/** The ids of every token, in stylesheet order. */
export function listThemeTokenIds(): readonly ThemeTokenID[] {
  return THEME_TOKENS.map((token) => token.id);
}

export function isThemeTokenId(maybeId: string): maybeId is ThemeTokenID {
  return THEME_TOKENS_BY_ID.has(maybeId as ThemeTokenID);
}

export function getThemeToken(id: ThemeTokenID): ThemeToken {
  const token = THEME_TOKENS_BY_ID.get(id);
  if (!token) {
    throw new Error(
      `Unknown theme token '${id}'! Valid tokens: ${listThemeTokenIds()
        .map((k) => `'${k}'`)
        .join(", ")}`,
    );
  }
  return token;
}

/** Whether the token has a value in the given scope (`radius` has none in `light`). */
export function themeTokenHasScope(token: ThemeToken, scope: ThemeTokenScope): boolean {
  return (token.scopes as readonly ThemeTokenScope[]).includes(scope);
}

/** The stylesheet's default for the token in a scope, or undefined when the scope does not apply. */
export function themeTokenDefault(token: ThemeToken, scope: ThemeTokenScope): string | undefined {
  return (token.defaults as Partial<Record<ThemeTokenScope, string>>)[scope];
}
