// The mechanical text cleanup of migration m07, as a pure function the ledger and the lint share.
// Until m07 runs it is the identity, so the ledger classifies nothing as cleanup.
export function cleanText(text) {
  return text;
}
