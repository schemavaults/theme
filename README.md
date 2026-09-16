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

### CommonJS

Note that currently CommonJS is not supported. I believe that I was struggling to get `tailwindcss-animate` working from CJS, then decided not to support it. Change your `tailwind.config.cjs` files to `tailwind.config.ts` or `tailwind.config.mjs` to use TypeScript or ES modules instead.
