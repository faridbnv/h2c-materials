// The mark a generated document opens with, under its title (scripts/docs-history.mjs, MARK). A document a command
// writes into docs/audits is regenerated, never edited: the mark says which command wrote it and on what day, so a run
// keeps the mark docs-history asks for, and a reader knows to run the command again for the current state rather than
// trust the day's numbers (completeness round, 2026-10-07).
export const generatedMark = (command, date = new Date().toISOString().slice(0, 10)) =>
  `> **Generated** (${date}) by \`${command}\`: it describes the data as it was that day; run it again for the current state.`;
