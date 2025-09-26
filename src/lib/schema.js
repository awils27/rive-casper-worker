// src/lib/schema.js
/**
 * @typedef {"boolean"|"number"|"trigger"} SMInputType
 * @typedef {"string"|"number"|"boolean"|"color"} VMPropType
 *
 * @typedef {{ name: string, type: SMInputType }} SMInput
 * @typedef {{ name: string, type: VMPropType }} VMProp
 *
 * @typedef {{
 *   artboard?: string,
 *   stateMachine?: string,
 *   inputs: SMInput[],
 *   viewModelProps: VMProp[],
 *   meta?: Record<string, unknown>
 * }} RiveSchema
 *
 * @typedef {{
 *   template: string,                 // plugin key, e.g., "caspar-basic"
 *   filename?: string,                // suggested output filename
 *   aliasMap?: Record<string,string>, // optional: JSON-key aliases -> Rive names
 *   options?: Record<string, unknown> // template-specific options
 * }} GenerateRequest
 */
export const validate = (schema) => {
  if (!schema || !Array.isArray(schema.inputs) || !Array.isArray(schema.viewModelProps)) {
    throw new Error("Invalid schema");
  }
  return schema;
};
