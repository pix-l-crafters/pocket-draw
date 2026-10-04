# Issue tracker: GitHub

Issues and specs for this repository live as GitHub Issues in `pix-l-crafters/pocket-draw`. Use the `gh` CLI; it infers the repository from the Git remote.

## Conventions

- Create: `gh issue create --title "..." --body "..."`.
- Read: `gh issue view <number> --comments`.
- List: `gh issue list --state open --limit 100` with structured output when useful.
- Comment: `gh issue comment <number> --body "..."`.
- Apply/remove labels: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`.
- Close: `gh issue close <number> --comment "..."`.

Pull requests are not a triage/request surface.