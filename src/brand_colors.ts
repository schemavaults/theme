const SCHEMAVAULTS_COLOR_KEYS = [
  "schemavaults-brand-blue",
  "schemavaults-brand-red",
] as const satisfies readonly string[];

export type SchemaVaultsBrandColor = (typeof SCHEMAVAULTS_COLOR_KEYS)[number];

export const brandColors: Record<SchemaVaultsBrandColor, string> = {
  "schemavaults-brand-blue": "#60A5FA",
  "schemavaults-brand-red": "#DC2626",
};

export function getSchemaVaultsBrandColor(
  colorName: SchemaVaultsBrandColor,
): string {
  return brandColors[colorName];
}
