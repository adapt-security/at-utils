/**
 * Populates a defaults object from a JSON schema's properties.
 * Required properties are set to null, optional properties use their default value.
 * @param {Object} schema - JSON schema with a `properties` object and optional `required` array
 * @param {Object} [defaults={}] - Existing defaults to populate
 * @param {Object} [options={}]
 * @param {Boolean} [options.replace=false] - Whether to overwrite existing values
 * @param {Boolean} [options.useDefaults=false] - Whether to include default values
 * @returns {Object} The populated defaults object
 */
export default function storeDefaults (schema, defaults = {}, { replace = false, useDefaults = false } = {}) {
  return Object.entries(schema.properties).reduce((memo, [attr, config]) => {
    if (config.type === 'object' && config.properties) {
      return { ...memo, [attr]: storeDefaults(config, memo, { replace, useDefaults }) }
    }
    const isRequired = schema?.required?.includes(attr) ?? false
    const shouldUpdate = replace || !Object.hasOwn(memo, attr)
    const hasDefault = useDefaults && Object.hasOwn(config, 'default')
    if (shouldUpdate && (hasDefault || isRequired)) {
      memo[attr] = isRequired ? null : config.default
    }
    return memo
  }, defaults)
}
