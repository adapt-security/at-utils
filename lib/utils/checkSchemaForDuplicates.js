/**
 * Collects property definitions from a schema into a tracking object,
 * recording which schema ($anchor) defines each property.
 * @param {Object} schema - A JSON schema (may use $patch or $merge format)
 * @param {Object} usedKeys - Map of property name to array of schema $anchors that define it
 */
export default function checkSchemaForDuplicates (schema, usedKeys) {
  const props = schema.properties ?? schema?.$patch?.with?.properties ?? schema?.$merge?.with?.properties
  if (!props) return
  Object.keys(props).forEach(p => {
    if (p === '_globals') return
    if (!usedKeys[p]) usedKeys[p] = []
    usedKeys[p].push(schema.$anchor)
  })
}
