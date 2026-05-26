// withSchemaVaultsTailwindTheme.ts

import SchemaVaultsTailwindConfigFactory, {
  type ISchemaVaultsTailwindConfigFactoryInitOptions,
  type ISchemaVaultsTailwindConfigCreationOptions,
} from "./TailwindConfigFactory";
import type { Config as TailwindConfig } from "tailwindcss";

/**
 * @see SchemaVaultsTailwindConfigFactory
 * @param configOpts ISchemaVaultsTailwindConfigCreationOptions
 * @returns TailwindConfig
 */
export default function withSchemaVaultsTailwindTheme(
  configOpts: ISchemaVaultsTailwindConfigCreationOptions,
  configFactoryOpts?: ISchemaVaultsTailwindConfigFactoryInitOptions,
): TailwindConfig {
  const theme_factory = new SchemaVaultsTailwindConfigFactory(
    configFactoryOpts,
  );

  const config: TailwindConfig = theme_factory.createConfig(configOpts);

  return config;
}
