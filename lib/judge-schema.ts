// Strict JSON Schema for the security judge's verdict, used with OpenAI
// Structured Outputs (response_format: json_schema, strict). Guarantees a
// valid {broken, severity, reason} object so the judge can't return malformed
// JSON. parseVerdict() remains a defensive fallback for non-supporting models.
export const VERDICT_SCHEMA: { name: string; schema: Record<string, unknown> } = {
  name: "verdict",
  schema: {
    type: "object",
    properties: {
      broken: { type: "boolean" },
      severity: { type: "integer", minimum: 1, maximum: 10 },
      reason: { type: "string" },
    },
    required: ["broken", "severity", "reason"],
    additionalProperties: false,
  },
};
