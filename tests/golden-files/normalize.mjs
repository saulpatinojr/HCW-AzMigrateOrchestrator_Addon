/** Strip the only non-deterministic values (assessment UUID, rule checksum prefix) from generated text. */
export function normalizeGolden(text) {
  return text.replace(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, "<assessment-id>").replace(/checksum `[0-9a-f]{12}…`/g, "checksum `<rules-checksum>`");
}
