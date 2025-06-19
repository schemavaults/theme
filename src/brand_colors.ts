const SCHEMAVAULTS_COLOR_KEYS = [
  "schemavaults-brand-blue",
  "schemavaults-brand-red",
] as const satisfies readonly string[];

export type SchemaVaultsBrandColor = (typeof SCHEMAVAULTS_COLOR_KEYS)[number];

export const brandColors: Record<SchemaVaultsBrandColor, string> = {
  "schemavaults-brand-blue": "var(--schemavaults-brand-blue)",
  "schemavaults-brand-red": "var(--schemavaults-brand-red)",
};

export function getSchemaVaultsBrandColor(
  colorName: SchemaVaultsBrandColor,
): string {
  return brandColors[colorName];
}
