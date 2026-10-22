# Pele Lab

Edit Mermaid source and see an SVG from [Pele](https://pele.run/). Pele is Obsidian's renderer for Mermaid diagrams. The diagram renderer in this app is the npm package `pele`. Mermaid.js is not installed. The page needs no API key.

## Run

From `apps/pele-lab`:

```sh
bun install
bun run dev
```

Open the URL Vite prints. The dev server starts with no environment variables.

Check the project with `bun run typecheck`, `bun run build`, and `bun test`.

## Use the page

Type in the source box. Pele redraws the preview 250 ms after you stop typing.

Load a preset with one click.

- Flowchart
- Sequence
- State
- Village agentflow

The agentflow shows Tom routing to Code, Studio, Leelhouse, Sys, and CoS. GitHub and LLM are connectors on that diagram.

Day, Ink, and Ember set `--pele-*` variables on `.pele`. A color change does not re-parse the source. A syntax error shows the `PeleError` message as text.

## Pele and Mermaid.js

[Pele's site](https://pele.run/) publishes this comparison. The gzip bundle is 230 kB for Pele and 1.6 MB for Mermaid.js. Render time is 0.05 to 0.3 ms for Pele and 6 to 82 ms for Mermaid.js. Pele has 0 direct dependencies. Mermaid.js has 23. The site summarizes that as 6× smaller and up to 500× faster. Those figures are Pele's measurements, not a benchmark run in this demo.

Pele colors a diagram with CSS variables such as `--pele-bg` and `--pele-fg`. This lab writes those variables onto `.pele`. The parsed diagram stays in place when you switch Day, Ink, or Ember.

## Credit

Pele is open source and was built for Obsidian. This demo is not an Obsidian product.

- [pele.run](https://pele.run/)
- [github.com/obsidianmd/pele](https://github.com/obsidianmd/pele)
