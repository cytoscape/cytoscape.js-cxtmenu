'use strict';

const assign = require('./assign');

// Shallow merge of params over defaults, with a nested merge for
// `submenuDefaults` so partial overrides keep the remaining defaults.
function resolveOptions(defaults, params){
  const options = assign({}, defaults, params);

  options.submenuDefaults = assign(
    {},
    defaults.submenuDefaults,
    (params && params.submenuDefaults) || {}
  );

  return options;
}

module.exports = { resolveOptions };
