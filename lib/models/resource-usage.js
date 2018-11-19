'use strict';

module.exports = Resourceusage;

function Resourceusage(Resourceusage) {

    Resourceusage.getResourceUsage = async function (pod_name, resource_name, start_time, end_time) {
        var request = require('needle');
        var executeQueryURI="http://127.0.0.1:3002/api/nfv-inspector-mon-influxdb-plugin/executeQuery?query=show measurements";

        var result = new Promise(function (resolve, reject) {
            var options = {
                rejectUnauthorized: false,
                strictSSL: false,
                secureProtocol: 'TLSv1_2_method'
            };

            request.get(executeQueryURI, options, function (error, response) {
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
