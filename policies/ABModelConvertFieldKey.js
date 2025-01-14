module.exports = function (req, res, next) {
   var where = req.options._where;

   if (
      where == null ||
      where.rules == null ||
      !where.rules.length ||
      where.rules.filter((r) => AppBuilder.rules.isUuid(r.key)).length < 1
   )
      // no field ids
      return next();

   AppBuilder.routes
      .verifyAndReturnObject(req, res)
      .then(function (object) {
         where.rules
            .filter((r) => AppBuilder.rules.isUuid(r.key))
            .forEach((r) => {
               var field = object.fieldByID(r.key);
               if (field) {
                  // convert field's id to column name
                  r.key = "`{dbName}`.`{tableName}`.`{columnName}`"
                     .replace("{dbName}", field.object.dbSchemaName())
                     .replace("{tableName}", field.object.dbTableName())
                     .replace("{columnName}", field.columnName);

                  // 1:1 - Get rows that no relation with
                  if (r.rule == "have_no_relation") {
                     // var relation_name = AppBuilder.rules.toFieldRelationFormat(field.columnName);

                     var objectLink = field.datasourceLink;
                     if (!objectLink) return;

                     r.key = field.columnName;
                     r.value = objectLink.PK();
                  }

                  // if we are searching a multilingual field it is stored in translations so we need to search JSON
                  else if (field.isMultilingual) {
                     let userData = req.user.data;
                     let tranColName;

                     // Query
                     if (object.viewName)
                        tranColName = "`{tableName}.translations`";
                     // Object
                     else tranColName = "{tableName}.translations";

                     tranColName = tranColName.replace(
                        /{tableName}/g,
                        field.object.dbTableName(true)
                     );

                     r.key = 'JSON_UNQUOTE(JSON_EXTRACT(JSON_EXTRACT({tranColName}, SUBSTRING(JSON_UNQUOTE(JSON_SEARCH({tranColName}, "one", "{languageCode}")), 1, 4)), \'$."{columnName}"\'))'
                        .replace(/{tranColName}/g, tranColName)
                        .replace(/{languageCode}/g, userData.languageCode)
                        .replace(/{columnName}/g, field.columnName);
                  }

                  // if this is from a LIST, then make sure our value is the .ID
                  else if (
                     field.key == "list" &&
                     field.settings &&
                     field.settings.options &&
                     field.settings.options.filter
                  ) {
                     // NOTE: Should get 'id' or 'text' from client ??
                     var inputID = field.settings.options.filter(
                        (option) =>
                           option.id == r.value || option.text == r.value
                     )[0];
                     if (inputID) r.value = inputID.id;
                  }
               }
            });

         next();
      })
      .catch(next);
};
