import type { Config as TailwindConfig } from "tailwindcss";
import { componentColors } from "./component_colors";
import { brandColors } from "./brand_colors";
import DefaultOrgScope from "./DefaultOrgScope"; // @schemavaults organization is default
import {
  getScreenBreakpoint,
  listScreenBreakpoints,
  type ScreenBreakpointID,
} from "./ScreenBreakpoints";
import type { TailwindTheme } from "./TailwindTheme";
import { existsSync, lstatSync } from "fs";
import { normalize, join, dirname } from "path";

// TailwindCSS Plugins:
import tailwindAnimatePlugin from "@/plugins/tailwindcss-animate";
import * as resolve from "resolve";

export interface ISchemaVaultsTailwindConfigFactoryInitOptions {
  debug?: boolean;
  scope?: string;
  // A list of file extensions that should be considered/searched for TailwindCSS className usage. Defaults to ts/tsx/js/jsx
  fileExtensions?: readonly string[];
  // Manually specify the project root directory, defaults to process.cwd()
  project_root?: string;
  // Build subdirectories
  // (e.g. ['dist'] here, in combination with @schemavaults/ui in the 'content' array of createConfig(),
  //  would search node_modules/@schemavaults/ui/dist for classNames)
  buildSubdirectories?: readonly string[];
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
  protected readonly debug: boolean;

  protected readonly isdir: (path: string) => boolean;
  protected readonly isfile: (path: string) => boolean;

  protected readonly scope: string;

  protected readonly project_root: string;

  protected static readonly defaultFileExtensionsToSearch = [
    "js",
    "jsx",
    "ts",
    "tsx",
    "svelte",
  ] as const satisfies readonly string[];

  protected readonly possibleBuildDirectories: readonly string[];

  protected readonly fileExtensionsToIncludeInTailwindClassNamesSearch: readonly string[];

  private static defaultIsDirImplementation(maybeDirPath: string): boolean {
    if (!existsSync(maybeDirPath)) {
      return false;
    }
    return lstatSync(maybeDirPath).isDirectory();
  }

  private static defaultIsFileImplementation(maybeFilePath: string): boolean {
    if (!existsSync(maybeFilePath)) {
      return false;
    }
    return lstatSync(maybeFilePath).isFile();
  }

  private static prettyPrintItemList(items: readonly string[]): string {
    return `${items.map((d) => `"${d}"`).join(", ")}`;
  }

  public constructor(opts?: ISchemaVaultsTailwindConfigFactoryInitOptions) {
    this.debug = opts?.debug ?? false;
    if (this.debug) {
      console.log("[SchemaVaultsTailwindConfigFactory] constructor()");
    }
    this.isdir = SchemaVaultsTailwindConfigFactory.defaultIsDirImplementation;
    this.isfile = SchemaVaultsTailwindConfigFactory.defaultIsFileImplementation;
    this.scope = opts?.scope ?? DefaultOrgScope;
    if (this.scope.startsWith("@")) {
      throw new TypeError(
        "Don't pass the @ in the 'scope', we'll handle adding passing that!",
      );
    }

    this.fileExtensionsToIncludeInTailwindClassNamesSearch = Array.isArray(
      opts?.fileExtensions,
    )
      ? opts.fileExtensions
      : SchemaVaultsTailwindConfigFactory.defaultFileExtensionsToSearch;

    this.project_root = opts?.project_root ?? process.cwd();

    this.possibleBuildDirectories = Array.isArray(opts?.buildSubdirectories)
      ? opts.buildSubdirectories
      : SchemaVaultsTailwindConfigFactory.defaultPossibleBuildDirectories;

    if (this.debug) {
      console.log(
        `[SchemaVaultsTailwindConfigFactory] Initialized '@${this.scope}' config factory`,
      );
    }
  }

  /**
   * @description Load TailwindCSS plugins to use in theme configuration
   * @returns Array of TailwindCSS plugins
   * @see /plugins directory
   */
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

  /**
   *
   * @param org_scoped_package_identifier A string representing an organization-scoped package identifier. For example: @schemavaults/ui
   * @returns The resolved path for the organization-scoped package. I.e. the path that contains the package.json file
   */
  protected resolveOrganizationScopedPackagePath(
    org_scoped_package_identifier: string,
  ): string {
    const scope: string = this.scope;
    if (!org_scoped_package_identifier.startsWith(`@${scope}/`)) {
      throw new Error(
        `This method should only be called if content path starts with @${scope}/...`,
      );
    }

    const pkg_blob_parts = org_scoped_package_identifier.split("/");

    if (
      pkg_blob_parts.length < 2 ||
      !pkg_blob_parts[1] ||
      typeof pkg_blob_parts[1] !== "string"
    ) {
      throw new TypeError(
        "Failed to resolve package name from package blob string",
      );
    }
    const package_name: string = pkg_blob_parts[1];

    const org_package_identifier: string = `@${scope}/${package_name}`;

    let package_path: string;
    try {
      package_path = resolve.sync(org_package_identifier, {
        basedir: this.project_root, // resolve from where tailwind.config.ts is running from
      });
      if (typeof package_path !== "string") {
        throw new TypeError(
          "Failed to resolve package path; result not a string!",
        );
      }

      // Helper function that checks if this is the root directory of a package
      const isAPackageRootDir = (current_path: string): boolean => {
        if (!this.isdir(current_path)) {
          return false;
        } else {
          if (existsSync(join(current_path, "package.json"))) {
            return true;
          } else {
            return false;
          }
        }
      }; // end fn isAPackageRootDir()

      // Package path should have been loaded-- but 'resolve' likely returns path to:
      //  node_modules/@{org}/{pkg}/dist/index.js, not the package root directory
      // We need to traverse upwards until we find the directory containing package.json
      // Or, if we hit node_modules/ and haven't found package.json, throw an error

      let current_path = package_path;
      while (current_path !== "/" && current_path !== "") {
        if (isAPackageRootDir(current_path)) {
          break;
        }

        if (!existsSync(current_path)) {
          throw new Error(
            `Error resolving package root directory for '@${scope}/${package_name}'! Path '${current_path}' does not exist during upwards traversal.`,
          );
        }

        if (this.isdir(current_path)) {
          current_path = normalize(join(current_path, ".."));
          continue;
        } else if (this.isfile(current_path)) {
          current_path = dirname(current_path);
          continue;
        } else {
          throw new Error(
            `Expected current path '${current_path}' to be either a directory or a file!`,
          );
        }
      }
      package_path = current_path;

      if (!existsSync(package_path) || !this.isdir(package_path)) {
        throw new Error(
          `Expected there to be a directory for package '@${scope}/${package_name}' at path '${package_path}'; there's not!`,
        );
      }
    } catch (e: unknown) {
      console.error(
        `Failed to resolve path to package '@${scope}/${package_name}':`,
        e,
      );
      throw new Error(
        `Failed to resolve path to package: '@${scope}/${package_name}'!`,
      );
    }

    if (this.debug) {
      console.log(
        `[SchemaVaultsTailwindConfigFactory] Resolved root directory of package '@${scope}/${package_name}' to directory: `,
        package_path,
      );
    }

    return package_path;
  }

  private static defaultPossibleBuildDirectories: readonly string[] = [
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

    const defaultContentSearchPath = `./src/**/*.{${this.fileExtensionsToIncludeInTailwindClassNamesSearch.join(",")}}`;

    const content_input: readonly string[] = Array.isArray(opts?.content)
      ? opts.content
      : ([defaultContentSearchPath] as const satisfies readonly string[]);

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
          this.resolveOrganizationScopedPackagePath(content_path_input);

        if (package_path.startsWith("@")) {
          throw new TypeError(
            `Failed to resolve org-scoped package identifier into path for: '${content_path_input}'`,
          );
        }

        this.possibleBuildDirectories.forEach(
          (possible_build_dir: string): void => {
            const buildSubdirPath: string = join(
              package_path,
              possible_build_dir,
            );
            let hasBuildSubdirectory: boolean = false;
            try {
              if (this.debug) {
                console.log(
                  `[SchemaVaultsTailwindConfigFactory] Checking if build subdirectory exists at path:`,
                  buildSubdirPath,
                );
              }
              hasBuildSubdirectory = this.isdir(buildSubdirPath);
            } catch (e: unknown) {
              console.error(
                "There was an error thrown by the isdir() function supplied to the SchemaVaultsTailwindConfigFactory instance:",
                e,
              );
              console.error(
                "The error occurred while checking if directory exists at path: ",
                buildSubdirPath,
              );
              throw new Error(
                "Error using isdir() to check if there is a directory at path",
              );
            }

            if (hasBuildSubdirectory) {
              const tailwindContentSearchPath: string = `${buildSubdirPath}/**/*.{${this.fileExtensionsToIncludeInTailwindClassNamesSearch.join(",")}}`;
              content.push(tailwindContentSearchPath);
              if (this.debug) {
                console.log(
                  `[SchemaVaultsTailwindConfigFactory] ` +
                    `Found build subdirectory. Added TailwindCSS search blob:`,
                  tailwindContentSearchPath,
                );
              }
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
          `Did not find any known build subdirectories (searching subdirectories: ${SchemaVaultsTailwindConfigFactory.prettyPrintItemList(this.possibleBuildDirectories)}) within content path input '${content_path_input}'!`,
        );
      }
    });

    if (content.length === 0) {
      throw new Error(
        "Did not receive any search blobs for files to initialize Tailwind classes from!",
      );
    }

    const plugins: TailwindConfig["plugins"] = this.plugins;
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

    if (!config.content.every((blob): boolean => typeof blob === "string")) {
      throw new TypeError(
        "Received a non-string search blob for the 'content' field of the Tailwind configuration!",
      );
    }

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
