const screenBreakpointIds = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
] as const satisfies readonly string[];

export type ScreenBreakpointID = (typeof screenBreakpointIds)[number];

const validScreenBreakpointIds: Set<ScreenBreakpointID> = new Set(
  screenBreakpointIds,
);

const screenBreakpointPixelWidths: Record<ScreenBreakpointID, number> = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

export function isValidScreenBreakpoint(
  maybeBreakpoint: string,
): maybeBreakpoint is ScreenBreakpointID {
  if (typeof maybeBreakpoint === "string") {
    const validBreakpoints: Set<string> = validScreenBreakpointIds;
    if (validBreakpoints.has(maybeBreakpoint satisfies string)) {
      return true;
    }
  }

  return false;
}

export function getScreenBreakpoint(breakpoint: ScreenBreakpointID): number {
  if (!isValidScreenBreakpoint(breakpoint)) {
    throw new Error(
      `Invalid screen breakpoint to return minimum width for! Valid screen breakpoints: ${screenBreakpointIds.map((id) => `'${id}'`).join(", ")}`,
    );
  }
  const screenWidth: number = screenBreakpointPixelWidths[breakpoint];
  return screenWidth;
}

export function listScreenBreakpoints(): readonly ScreenBreakpointID[] {
  return screenBreakpointIds;
}
