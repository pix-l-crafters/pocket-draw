# Domain Docs

Read domain documentation before exploring or changing domain concepts:

- `CONTEXT.md` at the repository root, or `CONTEXT-MAP.md` if it exists. The map points to each relevant context glossary.
- Relevant decisions in `docs/adr/`; for multi-context repositories, also check context-scoped ADRs under `src/<context>/docs/adr/`.

If these files do not exist, proceed without flagging their absence. Create them only when domain terms or hard-to-reverse decisions are resolved.

This repository uses the single-context layout: root `CONTEXT.md` and `docs/adr/`.

Use glossary terms consistently. Surface contradictions with existing ADRs rather than silently overriding them.
