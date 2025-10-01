import { describe, expect, test } from "bun:test";
import {
  type ISchemaVaultsTailwindConfigFactoryInitOptions,
  SchemaVaultsTailwindConfigFactory,
} from "./TailwindConfigFactory";
import { join } from "path";
import { lstatSync } from "fs";

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
  return lstatSync(path).isDirectory();
}

if (!isdir(node_modules())) {
  throw new Error("Failed to resolve node_modules/ directory for test!");
}

const options: ISchemaVaultsTailwindConfigFactoryInitOptions = {
  join,
  node_modules,
  isdir,
  debug: true,
};

describe("SchemaVaultsTailwindConfigFactory", () => {
  test("can initialize a config factory and generate a TailwindCSS config", () => {
    const factory = new SchemaVaultsTailwindConfigFactory(options);
    const config = factory.createConfig({
      content: ["./src/**/*.tsx"],
    });
    expect(typeof config === "object").toBeTrue();
  });

  test("can resolve the node_modules/ directory correctly", () => {
    const factory = new SchemaVaultsTailwindConfigFactory(options);
    const node_modules_path = factory.node_modules;
    expect(typeof node_modules_path === "string").toBeTrue();
    expect(node_modules_path.includes("theme")).toBeTrue();
    expect(node_modules_path.includes("node_modules")).toBeTrue();
  });

  test("generates a valid tailwind configuration", () => {
    const factory = new SchemaVaultsTailwindConfigFactory(options);
    const config = factory.createConfig({
      content: ["./src/**/*.ts|tsx|js|jsx"],
    });
    expect(typeof config === "object").toBeTrue();
  });

  test("can create a config factory without any options", () => {
    const factory = new SchemaVaultsTailwindConfigFactory();
    const config = factory.createConfig({
      content: ["./src/**/*.ts|tsx|js|jsx"],
    });
    expect(typeof config === "object").toBeTrue();
  });
});
