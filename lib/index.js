'use strict';

var loopback = require('loopback');
var PersistedDataModel = loopback.PersistedModel || loopback.DataModel;
var BaseModel = loopback.Model;

function loadPersistedModel(jsonFile) {
    var modelDefinition = require(jsonFile);
    return PersistedDataModel.extend(modelDefinition.name,
        modelDefinition.properties,
        {
            relations: modelDefinition.relations,
            foreignKeys: modelDefinition.foreignKeys
        });
}

function loadBaseModel(jsonFile) {
    var modelDefinition = require(jsonFile);
    return BaseModel.extend(modelDefinition.name,
        modelDefinition.properties, {
            plural: modelDefinition.plural
        });
}

var Resourceusage = loadBaseModel('./models/resource-usage.json');
var Nfvinspectormoninfluxdbplugin = loadBaseModel('./models/nfv-inspector-mon-influxdb-plugin.json');

exports.Resourceusage = require('./models/resource-usage')(Resourceusage);
exports.Nfvinspectormoninfluxdbplugin = require('./models/nfv-inspector-mon-influxdb-plugin')(Nfvinspectormoninfluxdbplugin);


module.exports = function (nfvinspector, options) {
    nfvinspector.model(exports.Resourceusage);
    nfvinspector.model(exports.Nfvinspectormoninfluxdbplugin);
};