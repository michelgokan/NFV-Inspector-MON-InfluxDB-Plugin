'use strict';

module.exports = Resourceusage;
var moment = require("moment");
var request = require('needle');

function getQueryResult(query) {
    var executeQueryURI = "http://127.0.0.1:3002/api/nfv-inspector-mon-influxdb-plugin/executeQuery?query=" + query;

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
}

//TODO: Toooooo ugly!!!!
function generateQueryWhereClause(pod_name, start_time, end_time, customClause = "") {
    var whereClause = " WHERE pod_name = '\"" + pod_name + "\"'" + customClause;

    var orderByClause = " ORDER BY time desc";
    var limitClause = "";

    if (!start_time && !end_time) {
        limitClause = " LIMIT 1000"
    } else {

        if (start_time) {
            var start_moment = moment(start_time, "M/D/YYYY h:m:s A").valueOf() * 1000000;
            whereClause = whereClause + " AND time >= " + start_moment;
        }

        if (end_time) {
            var end_moment = moment(end_time, "M/D/YYYY h:m:s A").valueOf() * 1000000;
            whereClause = whereClause + " AND time <= " + end_moment;
        }
    }

    return whereClause + orderByClause + limitClause;
}

//TODO: Refactor: we already have the same function in nfv-inspector-mon-influxdb-plugin.js
function getNFVVMSConfig(Resourceusage) {
    var configuration_model = Resourceusage.app.models.configuration;

    var configurations = configuration_model.find({
        where: {
            'or':
                [{
                    'and': [{'key': {like: 'influxdb_%'}},
                        {'category': {like: 'nfv-inspector-mon-influxdb-plugin'}}]
                },
                    {'key': {like: 'nfv_vms_'}}]
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

function Resourceusage(Resourceusage) {

    Resourceusage.getCPUUsages = async function (pod_name, start_time, end_time) {
    };

    Resourceusage.getMemoryUsages = async function (pod_name, start_time, end_time) {

    };

    Resourceusage.getDiskUsages = async function (pod_name, start_time, end_time) {

    };

    Resourceusage.getNetworkUsages = async function (pod_name, start_time, end_time) {

    };

    Resourceusage.getAllResourceUsages = async function (pod_name, show_live, start_time, end_time) {
        if (show_live) {
            start_time = "11/11/1990 11:00 AM";
            end_time = "11/11/2050 11:00 AM";
        } else {
            if (start_time == undefined) {
                start_time = "11/11/1990 11:00 AM";
            }

            if( end_time == undefined){
                end_time = "11/11/2050 11:00 AM";
            }
        }

        var whereClause = generateQueryWhereClause(pod_name, start_time, end_time, " AND container_name='\"\"'");
        var whereClauseWithoutAnyContainerName = generateQueryWhereClause(pod_name, start_time, end_time);
        //var whereClauseForDisk = generateQueryWhereClause(pod_name, start_time, end_time, false, true);

        var cpuQuota = getQueryResult("SELECT value FROM container_spec_cpu_quota " + whereClause);
        var cpuPeriod = getQueryResult("SELECT value FROM container_spec_cpu_period" + whereClause);
        var cpuUsagesSecondsTotal = getQueryResult("SELECT difference(value)*-1 FROM container_cpu_usage_seconds_total" + whereClause);

        var memoryLimit = getQueryResult("SELECT value FROM container_spec_memory_limit_bytes" + whereClause);
        var memoryUsageBytes = getQueryResult("SELECT value FROM container_memory_usage_bytes" + whereClause);

        var networkRecievedBytes = getQueryResult("SELECT difference(value)*-1 FROM container_network_receive_bytes_total" + whereClauseWithoutAnyContainerName);
        var networkRecievedErrors = getQueryResult("SELECT difference(value)*-1 FROM container_network_receive_errors_total" + whereClauseWithoutAnyContainerName);
        var networkRecievedPacketDrops = getQueryResult("SELECT difference(value)*-1 FROM container_network_receive_packets_dropped_total" + whereClauseWithoutAnyContainerName);
        var networkRecievedPackets = getQueryResult("SELECT difference(value)*-1 FROM container_network_receive_packets_total" + whereClauseWithoutAnyContainerName);

        var networkTransmittedBytes = getQueryResult("SELECT difference(value)*-1 FROM container_network_transmit_bytes_total" + whereClauseWithoutAnyContainerName);
        var networkTransmittedErrors = getQueryResult("SELECT difference(value)*-1 FROM container_network_transmit_errors_total" + whereClauseWithoutAnyContainerName);
        var networkTransmittedPacketDrops = getQueryResult("SELECT difference(value)*-1 FROM container_network_transmit_packets_dropped_total" + whereClauseWithoutAnyContainerName);
        var networkTransmittedPackets = getQueryResult("SELECT difference(value)*-1 FROM container_network_transmit_packets_total" + whereClauseWithoutAnyContainerName);

        // var fileSystemReadBytes = getQueryResult("SELECT difference(value)*-1 FROM container_fs_reads_bytes_total" + whereClauseWithoutEmptyContainerName);
        // var fileSystemRead = getQueryResult("SELECT difference(value)*-1 FROM container_fs_reads_total" + whereClauseWithoutEmptyContainerName);
        // var fileSystemWriteBytes = getQueryResult("SELECT difference(value)*-1 FROM container_fs_writes_bytes_total" + whereClauseWithoutEmptyContainerName);
        // var fileSystemWrite = getQueryResult("SELECT difference(value)*-1 FROM container_fs_writes_total" + whereClauseWithoutEmptyContainerName);

        //TODO: We don't need hostname here!!!!
        var hostName = getQueryResult("SELECT node_name FROM container_spec_memory_limit_bytes" + whereClause);

        var hostAllocatableCPU = getQueryResult("SELECT value FROM node_allocatable_cpu" + whereClause);
        var hostAllocatableMemory = getQueryResult("SELECT value*1024 FROM node_allocatable_memory" + whereClause);
        var hostAllocatableDisk = getQueryResult("SELECT value FROM node_allocatable_disk" + whereClause);


        var resourceUsages = {};

        var
            result = new Promise(function (resolve, reject) {
                Promise.all([hostName,
                    hostAllocatableCPU, hostAllocatableMemory, hostAllocatableDisk,
                    cpuQuota, cpuPeriod, cpuUsagesSecondsTotal,
                    memoryLimit, memoryUsageBytes,
                    networkRecievedBytes, networkRecievedErrors, networkRecievedPacketDrops, networkRecievedPackets,
                    networkTransmittedBytes, networkTransmittedErrors, networkTransmittedPacketDrops, networkTransmittedPackets
                    /*fileSystemReadBytes, fileSystemRead, fileSystemWriteBytes, fileSystemWrite*/]).then(function (promiseValues) {

                    var _hostName = promiseValues[0],
                        _hostAllocatableCPU = promiseValues[1],
                        _hostAllocatableMemory = promiseValues[2],
                        _hostAllocatableDisk = promiseValues[3],
                        _cpuQuota = promiseValues[4],
                        _cpuPeriod = promiseValues[5],
                        _cpuUsagesSecondsTotal = promiseValues[6],
                        _memoryLimit = promiseValues[7],
                        _memoryUsageBytes = promiseValues[8],
                        _networkRecievedBytes = promiseValues[9],
                        _networkRecievedErrors = promiseValues[10],
                        _networkRecievedPacketDrops = promiseValues[11],
                        _networkRecievedPackets = promiseValues[12],
                        _networkTransmittedBytes = promiseValues[13],
                        _networkTransmittedErrors = promiseValues[14],
                        _networkTransmittedPacketDrops = promiseValues[15],
                        _networkTransmittedPackets = promiseValues[16];
                    // _fileSystemReadBytes = promiseValues[17],
                    // _fileSystemRead = promiseValues[18],
                    // _fileSystemWriteBytes = promiseValues[19],
                    // _fileSystemWrite = promiseValues[20];

                    try {

                        var cpuQuota = 0;
                        var memoryQuota = 0;

                        if (_cpuUsagesSecondsTotal.result.results[0].series == undefined) {
                            resolve({});
                        } else {
                            var dataPointsCount = _cpuUsagesSecondsTotal.result.results[0].series[0].values.length;

                            for (var index = 0; index < dataPointsCount; index++) {
                                /*
                              When you run a query in InfluxDB, if it returns an empty set then "series" element is not present.
                              In here, it means pod has no specified quota (no limit). So we should check its host allocatable CPU.
                               */
                                if (_cpuQuota.result.results[0].series == undefined ||
                                    _cpuQuota.result.results[0].series[0].values[index] == undefined) {
                                    cpuQuota = _hostAllocatableCPU.result.results[0].series[0].values[index][1];
                                } else {
                                    cpuQuota = _cpuQuota.result.results[0].series[0].values[index][1] / _cpuPeriod.result.results[0].series[0].values[index][1];
                                }

                                (resourceUsages["cpu"] = resourceUsages["cpu"] || []).push([
                                    _cpuUsagesSecondsTotal.result.results[0].series[0].values[index][0],
                                    _cpuUsagesSecondsTotal.result.results[0].series[0].values[index][1] / cpuQuota * 100
                                ]);

                                if (_memoryLimit.result.results[0].series == undefined ||
                                    _memoryLimit.result.results[0].series[0].values[index] == undefined ||
                                    _memoryLimit.result.results[0].series[0].values[index][1] == 0) {
                                    memoryQuota = _hostAllocatableMemory.result.results[0].series[0].values[index][1];
                                } else {
                                    memoryQuota = _memoryLimit.result.results[0].series[0].values[index][1];
                                }

                                (resourceUsages["memory"] = resourceUsages["memory"] || []).push([
                                    _memoryUsageBytes.result.results[0].series[0].values[index][0],
                                    _memoryUsageBytes.result.results[0].series[0].values[index][1] / memoryQuota
                                ]);

                                (resourceUsages["networkRecievedBytes"] = resourceUsages["networkRecievedBytes"] || []).push([
                                    _networkRecievedBytes.result.results[0].series[0].values[index][0],
                                    _networkRecievedBytes.result.results[0].series[0].values[index][1]
                                ]);

                                (resourceUsages["networkRecievedErrors"] = resourceUsages["networkRecievedErrors"] || []).push([
                                    _networkRecievedErrors.result.results[0].series[0].values[index][0],
                                    _networkRecievedErrors.result.results[0].series[0].values[index][1]
                                ]);

                                (resourceUsages["networkRecievedPacketDrops"] = resourceUsages["networkRecievedPacketDrops"] || []).push([
                                    _networkRecievedPacketDrops.result.results[0].series[0].values[index][0],
                                    _networkRecievedPacketDrops.result.results[0].series[0].values[index][1]
                                ]);

                                (resourceUsages["networkRecievedPackets"] = resourceUsages["networkRecievedPackets"] || []).push([
                                    _networkRecievedPackets.result.results[0].series[0].values[index][0],
                                    _networkRecievedPackets.result.results[0].series[0].values[index][1]
                                ]);

                                (resourceUsages["networkTransmittedBytes"] = resourceUsages["networkTransmittedBytes"] || []).push([
                                    _networkTransmittedBytes.result.results[0].series[0].values[index][0],
                                    _networkTransmittedBytes.result.results[0].series[0].values[index][1]
                                ]);

                                (resourceUsages["networkTransmittedErrors"] = resourceUsages["networkTransmittedErrors"] || []).push([
                                    _networkTransmittedErrors.result.results[0].series[0].values[index][0],
                                    _networkTransmittedErrors.result.results[0].series[0].values[index][1]
                                ]);

                                (resourceUsages["networkTransmittedPacketDrops"] = resourceUsages["networkTransmittedPacketDrops"] || []).push([
                                    _networkTransmittedPacketDrops.result.results[0].series[0].values[index][0],
                                    _networkTransmittedPacketDrops.result.results[0].series[0].values[index][1]
                                ]);

                                (resourceUsages["networkTransmittedPackets"] = resourceUsages["networkTransmittedPackets"] || []).push([
                                    _networkTransmittedPackets.result.results[0].series[0].values[index][0],
                                    _networkTransmittedPackets.result.results[0].series[0].values[index][1]
                                ]);

                                // (resourceUsages["fileSystemReadBytes"] = resourceUsages["fileSystemReadBytes"] || []).push([
                                //   _fileSystemReadBytes.result.results[0].series[0].values[index][0],
                                //   _fileSystemReadBytes.result.results[0].series[0].values[index][1]
                                // ]);
                                // (resourceUsages["fileSystemRead"] = resourceUsages["fileSystemRead"] || []).push([
                                //   _fileSystemRead.result.results[0].series[0].values[index][0],
                                //   _fileSystemRead.result.results[0].series[0].values[index][1]
                                // ]);
                                // (resourceUsages["fileSystemWriteBytes"] = resourceUsages["fileSystemWriteBytes"] || []).push([
                                //   _fileSystemWriteBytes.result.results[0].series[0].values[index][0],
                                //   _fileSystemWriteBytes.result.results[0].series[0].values[index][1]
                                // ]);
                                // (resourceUsages["fileSystemWrite"] = resourceUsages["fileSystemWrite"] || []).push([
                                //   _fileSystemWrite.result.results[0].series[0].values[index][0],
                                //   _fileSystemWrite.result.results[0].series[0].values[index][1]
                                // ]);


                            }

                            resolve(resourceUsages);
                        }
                    } catch (e) {
                        console.error(e);
                        resolve(Promise.reject(e));
                    }
                });
            });

        return result;
    };

    Resourceusage.remoteMethod('getCPUUsages', {
        accepts: [{arg: 'pod_name', type: 'string'},
            {arg: 'start_time', type: 'DateString', required: false},
            {arg: 'end_time', type: 'DateString', required: false}],
        returns: {arg: 'result', type: 'json'},
        http: {path: '/getCPUUsages', verb: 'get'}
    });

    Resourceusage.remoteMethod('getMemoryUsages', {
        accepts: [{arg: 'pod_name', type: 'string'},
            {arg: 'start_time', type: 'DateString', required: false},
            {arg: 'end_time', type: 'DateString', required: false}],
        returns: {arg: 'result', type: 'json'},
        http: {path: '/getMemoryUsages', verb: 'get'}
    });

    Resourceusage.remoteMethod('getDiskUsages', {
        accepts: [{arg: 'pod_name', type: 'string'},
            {arg: 'start_time', type: 'DateString', required: false},
            {arg: 'end_time', type: 'DateString', required: false}],
        returns: {arg: 'result', type: 'json'},
        http: {path: '/getDiskUsages', verb: 'get'}
    });

    Resourceusage.remoteMethod('getNetworkUsages', {
        accepts: [{arg: 'pod_name', type: 'string'},
            {arg: 'start_time', type: 'DateString', required: false},
            {arg: 'end_time', type: 'DateString', required: false}],
        returns: {arg: 'result', type: 'json'},
        http: {path: '/getNetworkUsages', verb: 'get'}
    });

    Resourceusage.remoteMethod('getAllResourceUsages', {
        accepts: [{arg: 'pod_name', type: 'string'},
            {arg: 'get_live', type: 'boolean'},
            {arg: 'start_time', type: 'DateString', required: false},
            {arg: 'end_time', type: 'DateString', required: false}],
        returns: {arg: 'result', type: 'json'},
        http: {path: '/getAllResourceUsages', verb: 'get'}
    });


    Resourceusage.observe('access', function (ctx, next) {
        console.log(ctx.args);
        console.log("Resource usage has been called!\n");
        next();
    });

    return Resourceusage;
}
