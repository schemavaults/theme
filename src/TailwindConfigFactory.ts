import type { Config as TailwindConfig } from "tailwindcss";
import * as tailwindAnimatePlugin from "tailwindcss-animate";
import { componentColors } from "./component_colors";
import { brandColors } from "./brand_colors";
import DefaultOrgScope from "./DefaultOrgScope"; // @schemavaults organization is default
import {
  getScreenBreakpoint,
  listScreenBreakpoints,
  ScreenBreakpointID,
} from "./ScreenBreakpoints";
import type { TailwindTheme } from "./TailwindTheme";
type OsJoinFn = (
  path_segment: string,
  ...remaining_path_segments: string[]
) => string;

export interface ISchemaVaultsTailwindConfigFactoryInitOptions {
  debug?: boolean;
  join: OsJoinFn;
  // Path (or fn that resolves to a path) to node_modules for application
  node_modules: string | (() => string);
  // Checks whether a path is a directory (e.g. lstatSync(file).isDirectory())
  isdir: (path: string) => boolean;
  scope?: string;
}

export interface ISchemaVaultsTailwindConfigCreationOptions {
  // Define paths/blobs to search for Tailwind classnames in your code
  content: readonly string[];
}

export interface ISchemaVaultsTailwindConfigFactory {
  createConfig: (
    opts: ISchemaVaultsTailwindConfigCreationOptions,
  ) => TailwindConfig;
}

type TailwindConfigTheme = TailwindTheme;

type ThemeExtension = NonNullable<TailwindConfigTheme["extend"]>;
type ThemeValue = ThemeExtension[string];

export class SchemaVaultsTailwindConfigFactory
  implements ISchemaVaultsTailwindConfigFactory
{
  private debug: boolean;

  private join: OsJoinFn;

  private node_modules_path: string | undefined;

  private isdir: (path: string) => boolean;

  private scope: string;

  public constructor(opts: ISchemaVaultsTailwindConfigFactoryInitOptions) {
    this.debug = opts?.debug ?? false;
    if (this.debug) {
      console.log("[SchemaVaultsTailwindConfigFactory] constructor()");
    }
    this.join = opts.join;
    this.node_modules_path =
      typeof opts.node_modules === "string"
        ? opts.node_modules
        : opts.node_modules();
    this.isdir = opts.isdir;
    this.scope = opts.scope ?? DefaultOrgScope;
    if (this.scope.startsWith("@")) {
      throw new Error(
        "Don't pass the @ in the scope, we'll handle adding passing that!",
      );
    }

    if (this.debug) {
      console.log(
        `[SchemaVaultsTailwindConfigFactory] Initialized '@${this.scope}' config factory`,
      );
    }
  }

  protected get plugins(): TailwindConfig["plugins"] {
    return [tailwindAnimatePlugin];
  }

  protected get shadcnColors(): ThemeValue {
    return componentColors;
  }

  protected get brandColors(): ThemeValue {
    return brandColors;
  }

  protected get screenSizes(): Record<ScreenBreakpointID, `${number}px`> {
    const breakpointIds: readonly ScreenBreakpointID[] =
      listScreenBreakpoints();
    const screenSizes: Map<ScreenBreakpointID, `${number}px`> = new Map();
    for (const breakpoint of breakpointIds) {
      const screenSize: number = getScreenBreakpoint(breakpoint);
      screenSizes.set(breakpoint, `${screenSize}px`);
    }
    const output: { [k: string]: `${number}px` } = Object.fromEntries(
      screenSizes.entries(),
    );

    return output as Record<ScreenBreakpointID, `${number}px`>;
  }

  protected get themeExtension(): ThemeExtension {
    const screens: Record<ScreenBreakpointID, `${number}px`> = this.screenSizes;
    const extend: ThemeExtension = {
      colors: {
        ...this.shadcnColors,
        ...this.brandColors,
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      screens,
    };
    return extend;
  }

  protected resolveNodeModulesDirectoryPath(): string {
    if (typeof this.node_modules_path === "string") {
      return this.node_modules_path;
    }
    throw new Error("Failed to resolve path to node_modules/ directory!");
  }

  // Get the path to the node_modules/ directory
  public get node_modules(): string {
    const path = this.resolveNodeModulesDirectoryPath();
    if (!this.isdir(path)) {
      throw new Error(
        "Expected result of node_modules getter to be the path to a directory!",
      );
    }
    return path;
  }

  protected resolveSchemaVaultsPackagePath(pkg_blob_string: string): string {
    const scope: string = this.scope;
    if (!pkg_blob_string.startsWith(`@${scope}/`)) {
      throw new Error(
        `This method should only be called if content path starts with @${scope}/...`,
      );
    }

    const pkg_blob_parts = pkg_blob_string.split("/");

    const package_name: string = pkg_blob_parts[1];

    const join: OsJoinFn = this.join;
    const node_modules_dir: string = this.resolveNodeModulesDirectoryPath();
    const packagePath = join(node_modules_dir, "@schemavaults", package_name);
    if (!this.isdir(packagePath)) {
      throw new Error(
        `Failed to resolve path to package: '@schemavaults/${package_name}'!`,
      );
    }
    return packagePath;
  }

  private static possibleBuildDirectories: readonly string[] = [
    "dist",
    "src",
    "build",
    "out",
    "export",
  ] as const;

  public createConfig(
    opts?: ISchemaVaultsTailwindConfigCreationOptions,
  ): TailwindConfig {
    if (this.debug) {
      console.log("[SchemaVaultsTailwindConfigFactory] createConfig()");
    }

    const scope: string = this.scope;

    const content_input: readonly string[] = Array.isArray(opts?.content)
      ? opts.content
      : (["./src/**/*.ts|tsx|js|jsx"] as const satisfies readonly string[]);

    if (content_input.length < 1) {
      throw new Error(
        "Expected at least one content path to resolve TailwindCSS classnames at!",
      );
    }

    const content: string[] = [];
    content_input.forEach((content_path_input: string): void => {
      const content_length_at_start: number = content.length;

      if (content_path_input.startsWith(`@${scope}/`)) {
        const package_path: string =
          this.resolveSchemaVaultsPackagePath(content_path_input);

        SchemaVaultsTailwindConfigFactory.possibleBuildDirectories.forEach(
          (possible_build_dir) => {
            const buildSubdirPath: string = this.join(
              package_path,
              possible_build_dir,
            );
            let hasBuildSubdirectory: boolean;
            try {
              hasBuildSubdirectory = this.isdir(buildSubdirPath);
            } catch (e: unknown) {
              throw new Error(
                "There was an thrown by the isdir() function that you supplied the tailwind configuration factory!",
              );
            }

            if (hasBuildSubdirectory) {
              content.push(
                `${package_path}/${possible_build_dir}/**/*.js|ts|tsx|jsx`,
              );
            }
          },
        );
      } else {
        // does not start with @${scope}/* (probably @schemavaults/*, if opts.scope was not passed to config factory constructor)
        content.push(content_path_input);
      }

      const content_length_at_end: number = content.length;
      const content_added_this_iteration: number =
        content_length_at_end - content_length_at_start;

      if (
        content_added_this_iteration < 1 &&
        content_path_input.startsWith(`@${scope}/`)
      ) {
        console.warn(
          `Did not find any known build directories (${SchemaVaultsTailwindConfigFactory.possibleBuildDirectories
            .map((d) => `"${d}"`)
            .join(", ")})!`,
        );
      }
    });

    if (content.length === 0) {
      throw new Error(
        "Did not receive any search blobs for files to initialize Tailwind classes from!",
      );
    }

    const plugins = this.plugins;
    const extend: ThemeExtension = this.themeExtension;

    const config = {
      content: [...content],
      theme: { extend } satisfies TailwindConfigTheme,
      plugins,
      darkMode: "class",
    } as const satisfies TailwindConfig;

    console.assert(
      config.content.length >= 1,
      "Failed to load any 'content' search blobs to generate TailwindCSS classes for!",
    );

    console.assert(
      config.content.every((blob) => typeof blob === "string"),
      "Received a non-string search blob for the 'content' field of the Tailwind configuration!",
    );

    if (this.debug) {
      console.log(
        "[SchemaVaultsTailwindConfigFactory] Generated TailwindCSS config:\n",
        config,
      );
    }

    return config;
  }
}

export default SchemaVaultsTailwindConfigFactory;
