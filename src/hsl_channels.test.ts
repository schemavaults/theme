import { describe, expect, test } from "bun:test";
import { toHslChannels } from "./hsl_channels";

describe("toHslChannels", () => {
  test.each([
    ["#ffffff", "0 0% 100%"],
    ["#fff", "0 0% 100%"],
    ["#000000", "0 0% 0%"],
    ["#ff0000", "0 100% 50%"],
    ["#00ff00", "120 100% 50%"],
    ["#0000ff", "240 100% 50%"],
    ["#60a5fa", "213.1 93.9% 67.8%"],
    ["#dc2626", "0 72.2% 50.6%"],
    ["#0F172AFF", "222.2 47.4% 11.2%"],
    ["rgb(15, 23, 42)", "222.2 47.4% 11.2%"],
    ["rgb(15 23 42)", "222.2 47.4% 11.2%"],
    ["rgb(100%, 0%, 0%)", "0 100% 50%"],
    ["rgba(15, 23, 42, 1)", "222.2 47.4% 11.2%"],
    ["hsl(222.2, 84%, 4.9%)", "222.2 84% 4.9%"],
    ["hsl(222.2deg 84% 4.9%)", "222.2 84% 4.9%"],
    ["hsl(210 40% 98% / 100%)", "210 40% 98%"],
    ["  222.2 84% 4.9%  ", "222.2 84% 4.9%"],
    ["210 40% 98%", "210 40% 98%"],
    ["0 0% 100%", "0 0% 100%"],
    ["-30 50% 50%", "330 50% 50%"],
  ])("%s -> %s", (input, expected) => {
    expect(toHslChannels(input)).toBe(expected);
  });

  test.each([
    "",
    "white",
    "oklch(0.985 0 0)",
    "#60a5fa80",
    "#12345",
    "rgba(15, 23, 42, 0.5)",
    "hsl(210 40% 98% / 50%)",
    "hsl(210, 40, 98)",
    "210 40 98",
    "var(--x)",
  ])("rejects %s", (input) => {
    expect(toHslChannels(input)).toBeNull();
  });

  test("is idempotent on its own output", () => {
    const channels = toHslChannels("#60a5fa") as string;
    expect(toHslChannels(channels)).toBe(channels);
  });
});
