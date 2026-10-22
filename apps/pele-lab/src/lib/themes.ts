export const THEME_VARS = [
  "--pele-bg",
  "--pele-fg",
  "--pele-muted",
  "--pele-line",
  "--pele-surface",
  "--pele-surface-alt",
  "--pele-border",
  "--pele-accent",
  "--pele-radius",
] as const;

export type ThemeVar = (typeof THEME_VARS)[number];

export type ThemeId = "day" | "ink" | "ember";

export type Theme = {
  id: ThemeId;
  label: string;
  vars: Record<ThemeVar, string>;
};

export const themes = [
  {
    id: "day",
    label: "Day",
    vars: {
      "--pele-bg": "#fffcf0",
      "--pele-fg": "#100f0f",
      "--pele-muted": "#6f6e69",
      "--pele-line": "#100f0f",
      "--pele-surface": "#f2f0e5",
      "--pele-surface-alt": "#e6e4d9",
      "--pele-border": "#cecdc3",
      "--pele-accent": "#205ea6",
      "--pele-radius": "4px",
    },
  },
  {
    id: "ink",
    label: "Ink",
    vars: {
      "--pele-bg": "#100f0f",
      "--pele-fg": "#cecdc3",
      "--pele-muted": "#878580",
      "--pele-line": "#cecdc3",
      "--pele-surface": "#1c1b1a",
      "--pele-surface-alt": "#282726",
      "--pele-border": "#403e3c",
      "--pele-accent": "#4385be",
      "--pele-radius": "4px",
    },
  },
  {
    id: "ember",
    label: "Ember",
    vars: {
      "--pele-bg": "#1a120b",
      "--pele-fg": "#f6e7d4",
      "--pele-muted": "#c4a484",
      "--pele-line": "#f0d2b4",
      "--pele-surface": "#2a1c12",
      "--pele-surface-alt": "#3a2618",
      "--pele-border": "#8a5a32",
      "--pele-accent": "#e85d04",
      "--pele-radius": "4px",
    },
  },
] as const satisfies readonly Theme[];

export function themeById(id: ThemeId): Theme {
  const theme = themes.find((item) => item.id === id);
  if (!theme) {
    throw new Error(`Unknown theme ${id}`);
  }
  return theme;
}

export function themeStylesheet(list: readonly Theme[] = themes): string {
  return list
    .map((theme) => {
      const body = THEME_VARS.map((key) => `  ${key}: ${theme.vars[key]};`).join(
        "\n",
      );
      return `.pele[data-theme="${theme.id}"] {\n${body}\n}`;
    })
    .join("\n");
}
