'use strict';

module.exports = Resourceusage;

function Resourceusage(Resourceusage) {

    Resourceusage.getResourceUsage = async function (pod_name, start_time, end_time) {
        return "{}";
    };

    Resourceusage.remoteMethod('getResourceUsage', {
        accepts: [{arg: 'pod_name', type: 'string'},
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