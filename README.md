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

#### Simple Example
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

#### More complex example
```typescript
// tailwind.config.ts

// Import the config factory
import { SchemaVaultsTailwindConfigFactory } from "@schemavaults/theme";
import { join } from "path";
import { lstatSync, exists, type Stats } from "fs";

function node_modules(): string {
  const currentDirectory: string = import.meta.dirname;

  let node_modules_path: string;
  if (currentDirectory.endsWith("/src") || currentDirectory.endsWith("/dist")) {
    node_modules_path = join(currentDirectory, "..", "node_modules");
  } else {
    node_modules_path = join(currentDirectory, "node_modules");
  }

  return node_modules_path;
}

function isdir(path: string): boolean {
  if (!existsSync(path)) return false;

  let lstatResult: Stats;
  try {
    lstatResult = lstatSync(path);
  } catch (e: unknown) {
    throw new Error(
      "Error running lstatSync for tailwind.config.ts isdir() function!",
    );
  }
  return lstatResult.isDirectory();
}

if (!isdir(node_modules())) {
  throw new Error("Failed to resolve node_modules/ directory for test!");
}

// Initialize the config factory
const configFactory = new SchemaVaultsTailwindConfigFactory({
  node_modules,
  isdir,
  join,
  scope: 'schemavaults'
});

// Generate and export the config
const config = configFactory.createConfig({
  content: [
    "./src/**/*.tsx|jsx|js|ts",
    "./app/**/*.tsx|jsx|js|ts",
    "@schemavaults/ui", // resolved and converted to an absolute path to the schemavaults package in the node_modules folder
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


### CommonJS

Note that currently CommonJS is not supported. I believe that I was struggling to get `tailwindcss-animate` working from CJS, then decided not to support it. Change your `tailwind.config.cjs` files to `tailwind.config.ts` or `tailwind.config.mjs` to use TypeScript or ES modules instead.
