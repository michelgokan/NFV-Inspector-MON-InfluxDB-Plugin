'use strict';

module.exports = Nfvinspectormoninfluxdbplugin;

function getInfluxDBConfigs(Nfvinspectormoninfluxdbplugin) {
    var configuration_model = Nfvinspectormoninfluxdbplugin.app.models.configuration;

    var configurations = configuration_model.find({
        where: {
            'or':
                [{
                    'and': [{'key': {like: 'influxdb_%'}},
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

function executeInfluxDBQuery(Nfvinspectormoninfluxdbplugin, query_string) {
    var request = require('needle');
    var configs = getInfluxDBConfigs(Nfvinspectormoninfluxdbplugin);

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

function Nfvinspectormoninfluxdbplugin(Nfvinspectormoninfluxdbplugin) {

    Nfvinspectormoninfluxdbplugin.executeQuery = async function (query) {
        var result = executeInfluxDBQuery(Nfvinspectormoninfluxdbplugin, query);

        return result;
    };

    Nfvinspectormoninfluxdbplugin.remoteMethod('executeQuery', {
        accepts: [{arg: 'query', type: 'string'}],
        returns: {arg: 'result', type: 'json'},
        http: {path: '/executeQuery', verb: 'get'}
    });


    Nfvinspectormoninfluxdbplugin.observe('access', function (ctx, next) {
        console.log(ctx.args);
        console.log("nfv-inspector-mon-influxdb-plugin has been called!\n");
        next();
    });

    return Nfvinspectormoninfluxdbplugin;
}