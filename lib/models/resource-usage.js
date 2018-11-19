'use strict';

module.exports = Resourceusage;

function Resourceusage(Resourceusage) {

    Resourceusage.getResourceUsage = async function (pod_name, resource_name, start_time, end_time) {
        var Nfvinspectormoninfluxdbplugin = require('./nfv-inspector-mon-influxdb-plugin')
        var result = Nfvinspectormoninfluxdbplugin.executeInfluxDBQuery(Resourceusage, "show measurements;");

        return result;
    };

    Resourceusage.remoteMethod('getResourceUsage', {
        accepts: [{arg: 'pod_name', type: 'string'},
                  {arg: 'resource_name', type: 'string'},
                  {arg: 'start_time', type: 'DateString', required: false},
                  {arg: 'end_time', type: 'DateString', required: false}],
        returns: {arg: 'result', type: 'json'},
        http: {path: '/getResourceUsage', verb: 'get'}
    });


    Resourceusage.observe('access', function (ctx, next) {
        console.log(ctx.args);
        console.log("Resource usage has been called!\n");
        next();
    });

    return Resourceusage;
}