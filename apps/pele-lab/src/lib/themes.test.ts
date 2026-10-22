import { expect, test } from "bun:test";
import { THEME_VARS, themeById, themeStylesheet, themes } from "./themes.ts";

test("theme registry has day, ink, and ember", () => {
  expect(themes.map((theme) => theme.id)).toEqual(["day", "ink", "ember"]);
  expect(themes.map((theme) => theme.label)).toEqual(["Day", "Ink", "Ember"]);
});

test("each theme sets the Pele color variables", () => {
  for (const theme of themes) {
    for (const key of THEME_VARS) {
      expect(theme.vars[key].length).toBeGreaterThan(0);
    }
  }
  expect(themeById("day").vars["--pele-bg"]).not.toBe(
    themeById("ink").vars["--pele-bg"],
  );
  expect(themeById("ink").vars["--pele-bg"]).not.toBe(
    themeById("ember").vars["--pele-bg"],
  );
});

test("theme stylesheet only declares CSS variables", () => {
  const css = themeStylesheet();
  expect(css).toContain('.pele[data-theme="day"]');
  expect(css).toContain('.pele[data-theme="ink"]');
  expect(css).toContain('.pele[data-theme="ember"]');
  for (const key of THEME_VARS) {
    expect(css).toContain(key);
  }
  expect(css).not.toContain("render(");
  expect(css).not.toContain("mount(");
});
