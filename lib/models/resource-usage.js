'use strict';

module.exports = Resourceusage;

function getInfluxDBConfigs(Resourceusage) {
    var configuration_model = Resourceusage.app.models.configuration;

    var configurations = configuration_model.find({
        where: {
            'or':
                [{
                    'and': [{'key': {like: 'hss_%'}},
                        {'category': {like: 'nfv-inspector-mon-influxdb-plugin'}}]
                },
                    {'key': {like: 'nfv_mon_'}}]
        },
        fields: {"key": true, "value": true}
    });

    var configs = configurations.then(function (nfv_mon_information) {

        var nfv_mon_configs = {};
        nfv_mon_information.forEach(function (configs) {
            nfv_mon_configs[configs.key] = configs.value;
        });

        return nfv_mon_configs;

    });

    return configs;
}

// function executeInfluxDBQuery(Resourceusage, query_string){
//     var configs = getInfluxDBConfigs(Resourceusage);
//
//     var query = configs.then(function (influxdb_configs) {
//         return "influx -host " + influxdb_configs["influxdb_host"] + " -port " + influxdb_configs["influxdb_port"] + " -username '" + influxdb_configs["influxdb_username"] +
//             "' -password '" + (influxdb_configs["influxdb_password"]===""?" ":influxdb_configs["influxdb_password"]) + "' -database " + influxdb_configs['influxdb_database'] +
//             " -execute '" + query_string + "'";
//     });
//
//     var result = query.then(function (sql_query) {
//         var exec = require('child_process').exec;
//
//         console.log(sql_query);
//
//         return new Promise(function (resolve, reject) {
//             exec(sql_query, {maxBuffer: 1024 * 10000}, function (error, stdout, stderr) {
//                 try {
//                     resolve(JSON.parse(stdout));
//                 } catch(e){
//                     resolve(stdout);
//                 }
//             });
//         });
//     });
//
//     return result;
// }


function executeInfluxDBQuery(Resourceusage, query_string){
    var configs = getInfluxDBConfigs(Resourceusage);

    var full_path = configs.then(function (influxdb_configs) {
        return "http://" + influxdb_configs["influxdb_host"] + ":" + influxdb_configs["influxdb_port"] + "/query?pretty=true&u=" + influxdb_configs["influxdb_username"] +
            "&p=" + influxdb_configs["influxdb_password"] + "&db=" + influxdb_configs['influxdb_database'] + "&q=" + query_string;
    });

    var result = full_path.then(function (request_uri) {
        console.log("Sending request to " + request_uri);

        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

        var request_result = new Promise(function (resolve, reject) {
            var options = {
                rejectUnauthorized: false,
                strictSSL: false,
                secureProtocol: 'TLSv1_2_method'
            };

            request.get(request_uri, options, function (error, response) {
                if (!error && response.statusCode == 200) {
                    console.log(response.body);
                    resolve(response.body);
                } else {
                    console.error("Error: " + error);

                    if (error === null) {
                        console.error("Response code: " + response.statusCode);
                        console.error("Body: " + response.body);
                    }

                    var err = new Error("ERROR");
                    err.statusCode = err.status = (error ? 500 : response.statusCode);
                    err.code = 'API_CALL_ERROR';
                    resolve(Promise.reject());
                }
            });
        });

        return request_result;
    });

    return result;
}

function Resourceusage(Resourceusage) {

    Resourceusage.getResourceUsage = async function (pod_name, resource_name, start_time, end_time) {
        var result = executeInfluxDBQuery(Resourceusage, "show measurements;");

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