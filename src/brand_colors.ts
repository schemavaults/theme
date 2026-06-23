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
  const brandColorCssValue: string = brandColors[colorName];
  if (typeof brandColorCssValue !== "string") {
    throw new Error(
      `Failed to find CSS value for brand color! Are you using a valid key (${SCHEMAVAULTS_COLOR_KEYS.map((k) => `'${k}'`).join(", ")})?`,
      {
        cause: `Bad color name: '${colorName}'`,
      },
    );
  }
  return brandColorCssValue;
}
