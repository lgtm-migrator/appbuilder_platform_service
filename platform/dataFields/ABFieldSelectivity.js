const ABField = require("./ABField");

module.exports = class ABFieldSelectivity extends ABField {
   static defaults() {
      // We need a defaults fn for core, see https://github.com/digi-serve/appbuilder_class_core/pull/83
      return {};
   }
};
