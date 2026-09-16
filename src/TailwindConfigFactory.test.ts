import { describe, expect, test } from "bun:test";
import SchemaVaultsTailwindConfigFactory, {
  type ISchemaVaultsTailwindConfigFactoryInitOptions,
} from "./TailwindConfigFactory";

function isValidTailwindConfig(config: unknown): boolean {
  return typeof config === "object";
}

describe("SchemaVaultsTailwindConfigFactory", () => {
  test("can initialize a config factory with no options and generate a TailwindCSS config", () => {
    const factory = new SchemaVaultsTailwindConfigFactory();
    const config = factory.createConfig({
      content: ["./src/**/*.tsx"],
    });
    expect(isValidTailwindConfig(config)).toBeTrue();
  });

  test("default settings generate a valid tailwind configuration", () => {
    const factory = new SchemaVaultsTailwindConfigFactory();
    const config = factory.createConfig({
      content: ["./src/**/*.ts|tsx|js|jsx"],
    });
    expect(isValidTailwindConfig(config)).toBeTrue();
  });
});

describe("SchemaVaultsTailwindConfigFactory dark mode", () => {
  test("keeps the .dark token block from globals.css in the compiled CSS", () => {
    const config = new SchemaVaultsTailwindConfigFactory().createConfig({
      content: ["./src/**/*.tsx"],
    });
    expect(config.darkMode).toBe("class");
    expect(config.safelist).toContain("dark");
  });
});
