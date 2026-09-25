# 🎨 @schemavaults/theme

## About 🎨

Package containing code for building opionated TailwindCSS themes/configurations that contain SchemaVaults branding colors and shared styles.

To see the theme in action you can check out the [`@schemavaults/ui` preview site](https://ui.schemavaults.com) showcasing some styled React.js components and the features available in this theme.

## Usage

### Ensure that globals.css is imported

The generated TailwindCSS config sets colors based on CSS variables. It's important that `globals.css` is imported, so that these colors can be resolved. E.g. `var(--foreground)` and `var(--card)` become functional after this CSS import.

```javascript
// within App.jsx / layout.jsx
import "@schemavaults/theme/globals.css"
```

### Import and run the TailwindCSS Config Factory from your `tailwind.config.mjs` or `tailwind.config.ts`

#### Simple example using withSchemaVaultsTailwindTheme
```typescript
import { withSchemaVaultsTailwindTheme } from "@schemavaults/theme";
const config = withSchemaVaultsTailwindTheme({
  "./src/**/*.tsx|jsx|js|ts",
  "@schemavaults/ui", // resolved and converted to an absolute path to the schemavaults package in the node_modules folder
});
export default config;
````

#### Simple example using SchemaVaultsTailwindConfigFactory
```typescript
// tailwind.config.ts
import { SchemaVaultsTailwindConfigFactory } from "@schemavaults/theme";
const config = new SchemaVaultsTailwindConfigFactory().createConfig({
  content: [
    "./src/**/*.tsx|jsx|js|ts",
    "@schemavaults/ui", // resolved and converted to an absolute path to the schemavaults package in the node_modules folder
  ],
});
export default config;
```

#### More complex example using SchemaVaultsTailwindConfigFactory
```typescript
// tailwind.config.ts

// Import the config factory
import { SchemaVaultsTailwindConfigFactory } from "@schemavaults/theme";


// Initialize the config factory
const configFactory = new SchemaVaultsTailwindConfigFactory({
  scope: 'schemavaults'
});

// Generate and export the config
const config = configFactory.createConfig({
  content: [
    "./src/**/*.tsx|jsx|js|ts",
    "./app/**/*.tsx|jsx|js|ts",
    "@schemavaults/ui", // resolved and converted to an absolute path to the schemavaults package in the node_modules folder. i.e. @schemavaults/ui => .../node_modules/@schemavaults/ui/dist/**/*.tsx|jsx|js|ts
    "@schemavaults/schema-ui",
  ],
});
export default config;
```

You may wish to also dig deeper on the options passed to the factory / `createConfig` in order to customize the final Tailwind configuration generated. Notably, the `content` parameter to `createConfig`, if the code for styles to be generated from is not found within `./src/**/*.ts|tsx|js|jsx`!

```typescript
// tailwind.config.ts
// ... initialize the factory somewhere

// An example demonstrating customization of where Tailwind searches for classnames
const config = configFactory.createConfig({
  content: ["./src/**/*.ts|tsx|js|jsx", "@schemavaults/ui", "@schemavaults/schema-ui"]
});
export default config;
```

In the above example, local `.js`/`.ts`/`.jsx`/`.tsx` paths will be resolved in the app that `@schemavaults/theme` config factory is running in. Also, `@schemavaults/*` scoped packages will be resolved from `node_modules`.


### Theming a deployment (overriding the tokens)

`globals.css` declares every design token through an *override variable* with the stock value as its fallback:

```css
:root  { --background: var(--sv-theme-light-background, 0 0% 100%); }
.dark  { --background: var(--sv-theme-dark-background, 222.2 84% 4.9%); }
:root  { --radius: var(--sv-theme-radius, 0.5rem); }
```

So a white-labelled deployment re-themes itself by setting `--sv-theme-light-*`, `--sv-theme-dark-*` and (for tokens shared by both modes) `--sv-theme-*` on the `<html>` element — no fork of `globals.css`, and the stylesheet's defaults keep applying to whatever is not set. A light override only affects light mode; the `.dark` block reads its own variables.

`@schemavaults/theme/tokens` (safe to import from browser bundles and client components — it has no Node.js dependencies, unlike the config factory at the package root) ships the manifest and the helpers:

```typescript
import {
  THEME_TOKENS,                    // every token: id, css variable, format, group, label, description, light/dark defaults
  createThemeOverrideStyle,        // ThemeOverrides -> { "--sv-theme-light-background": "210 40% 98%", ... }
  renderThemeOverrideCss,          // ThemeOverrides -> ":root{--sv-theme-light-background:210 40% 98%;}"
  resolveThemeTokens,              // every token with default + override + effective value, for a settings page
  themeOverridesFromEnvironment,   // reads THEME_LIGHT_BACKGROUND, THEME_DARK_BACKGROUND, THEME_RADIUS, ...
} from "@schemavaults/theme/tokens";

// e.g. in a Next.js root layout
const { overrides, problems } = themeOverridesFromEnvironment(process.env, { prefix: "THEME" });
// problems: variables set to a value the token cannot take; they keep the default
const style = createThemeOverrideStyle(overrides);
// <html style={style}> ... </html>
```

Values are validated and normalised before they are emitted. Tokens whose format is `hsl-channels` (the shadcn/ui component colours the Tailwind theme wraps in `hsl()`) accept bare channels (`222.2 84% 4.9%`), a hex colour, or an opaque `rgb()`/`hsl()`, and are stored as channels; `css-color` tokens (the brand colours, `warning` and the sidebar) take any CSS colour; `radius` takes a CSS length. A value that could break the stylesheet or escape an attribute is refused with a reason you can show an administrator.

Environment variable names follow the token id: `<PREFIX>_LIGHT_<TOKEN>`, `<PREFIX>_DARK_<TOKEN>` and `<PREFIX>_<TOKEN>` for shared tokens, upper-cased with hyphens as underscores (`sidebar-primary-foreground` → `THEME_DARK_SIDEBAR_PRIMARY_FOREGROUND`); `themeTokenEnvironmentVariable()` returns the name for a token and scope.

The generated Tailwind config safelists the `dark` class so the `.dark` token block survives Tailwind's purge in applications that only add the class at runtime.

### Chart colours

`globals.css` defines a categorical palette for charts: `--chart-1` … `--chart-8` for series, in slot order, and `--chart-other` for the de-emphasis grey (a folded "Other" tail, an overflow bucket, a series past the palette). The Tailwind config exposes them as the `chart-1` … `chart-8` and `chart-other` colours (`fill-chart-2`, `stroke-chart-1`, `bg-chart-other/40`).

| Slot | Hue | Light | Dark |
| --- | --- | --- | --- |
| 1 | Blue | `#2a78d6` | `#3987e5` |
| 2 | Orange | `#eb6834` | `#d95926` |
| 3 | Aqua | `#1baf7a` | `#199e70` |
| 4 | Yellow | `#eda100` | `#c98500` |
| 5 | Magenta | `#e87ba4` | `#d55181` |
| 6 | Green | `#008300` | `#008300` |
| 7 | Violet | `#4a3aa7` | `#9085e9` |
| 8 | Red | `#e34948` | `#e66767` |
| Other | Grey | `#898781` | `#898781` |

The slots come from the data-viz reference palette and are validated in this order against the card surfaces (`#ffffff` light, `#020817` dark) with the data-viz `validate_palette.js`:

- Light: every slot inside the lightness band and above the chroma floor; worst neighbouring pair ΔE 9.1 under colour-blindness simulation (target ≥ 8) and ΔE 19.6 for normal vision (floor 15). Aqua (2.82:1), yellow (2.17:1) and magenta (2.69:1) fall under 3:1 contrast on white, so a chart that uses them needs a legend or direct labels plus a table view.
- Dark: worst neighbouring pair ΔE 8.4 (simulated) and ΔE 19.3 (normal vision); every slot clears 3:1.

Rules for using them:

- Assign slots in order and never cycle them. A ninth series folds into `chart-other` (or the chart becomes small multiples).
- The **order is the colour-blindness safety**: the checks above hold for neighbouring slots. Charts where every pair can sit side by side (scatter plots, maps) are validated only for the first three slots (worst pair ΔE 9.2 light / 9.4 dark); no ordering of four or more passes, so colour at most three series there.
- Colour follows the entity, not its position: filtering a series out must not repaint the others.
- A single-series chart uses slot 1 for every mark.
- These are identity colours. Status colours (`destructive`, `warning`, success) stay reserved for series that mean good or bad, and the brand blue is an explicit choice rather than slot 1 (at `#60a5fa` it is 2.54:1 on white and too light for dark mode).

Like every other token, the chart colours can be re-themed per deployment (`--sv-theme-light-chart-1`, `THEME_DARK_CHART_OTHER`, …); re-run the validator on any replacement palette.

### CommonJS

Note that currently CommonJS is not supported. I believe that I was struggling to get `tailwindcss-animate` working from CJS, then decided not to support it. Change your `tailwind.config.cjs` files to `tailwind.config.ts` or `tailwind.config.mjs` to use TypeScript or ES modules instead.
