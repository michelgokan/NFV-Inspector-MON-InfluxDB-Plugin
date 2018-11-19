#!/bin/bash
#TODO: Automatically add this componen in component-config.json
PLUGIN_NAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd | xargs basename | awk '{print tolower($0)}')"

source ../utils/functions.sh

echo "Checking for existing configuration..."
EXISTS=$( curl -X GET --header 'Accept: application/json' "http://127.0.0.1:3002/api/configurations/count?where=%7B%22category%22%3A%22$PLUGIN_NAME%22%7D" | jq ".count" )

#TODO: Nasty installation!

if [ "$EXISTS" -eq "0" ]; then
  echo "No previous configuration exists..."
else
  echo "Configuration already exists..."
  echo "Please try reinstalling NFV-MON!"
  echo "Exiting installation!"
  exit 0
fi

echo "Please enter InfluxDB host (i.e 172.16.16.242): "
read -r influxdb_host

echo "Please enter InfluxDB port (default: 8086): "
read -r influxdb_port

echo "Please enter InfluxDB username (if exists): "
read -r influxdb_username

echo "Please enter InfluxDB password (if exists): "
read -r influxdb_password

echo "Please enter the database name:"
read -r influxdb_database

echo -e "InfluxDB host: $influxdb_host \nInfluxDB port: $influxdb_port \nInfluxDB username: $influxdb_username\nInfluxDB password: $influxdb_password\nInfluxDB database: $influxdb_database"

if ! command_exists influx ; then
    echo 'Error: IndluxDB client is not installed.' >&2

    echo "Attempting to install InfluxDB Client (only works on Ubuntu). May ask for sudo password."
    echo "sudo apt-get install influxdb-client"
    sudo apt-get install influxdb-client
else
    echo "InfluxDB client is installed!"
fi

echo "Attempting to connect to InfluxDB..."
version="$(curl -sl -I http://$influxdb_host:$influxdb_port/ping | awk 'BEGIN{RS="\r\n"} /Influxdb-Version/ {print $2}')"

if [[ $version =~ ^[0-9]+.[0-9]+.[0-9]+.*$ ]];
then
    echo -ne "Successfully connected to InfluxDB (version $version)."
    echo ""
else
    echo "Error connecting to InfluxDB."
    echo $version
    echo "Exiting installation wizard!"
    exit 0
fi

echo "Saving plugin configs..."

curl -X POST --header 'Content-Type: application/json' --header \
 'Accept: application/json' -d \
 "{ \"category\": \"${PLUGIN_NAME}\", \"key\": \"influxdb_host\", \"value\": \"$influxdb_host\" }" \
 'http://127.0.0.1:3002/api/configurations'

 curl -X POST --header 'Content-Type: application/json' --header \
 'Accept: application/json' -d \
 "{ \"category\": \"${PLUGIN_NAME}\", \"key\": \"influxdb_port\", \"value\": \"$influxdb_port\" }" \
 'http://127.0.0.1:3002/api/configurations'

 curl -X POST --header 'Content-Type: application/json' --header \
 'Accept: application/json' -d \
 "{ \"category\": \"${PLUGIN_NAME}\", \"key\": \"influxdb_username\", \"value\": \"$influxdb_username\" }" \
 'http://127.0.0.1:3002/api/configurations'

 curl -X POST --header 'Content-Type: application/json' --header \
 'Accept: application/json' -d \
 "{ \"category\": \"${PLUGIN_NAME}\", \"key\": \"influxdb_password\", \"value\": \"$influxdb_password\" }" \
 'http://127.0.0.1:3002/api/configurations'

 curl -X POST --header 'Content-Type: application/json' --header \
 'Accept: application/json' -d \
 "{ \"category\": \"${PLUGIN_NAME}\", \"key\": \"influxdb_database\", \"value\": \"$influxdb_database\" }" \
 'http://127.0.0.1:3002/api/configurations'

echo "InfluxDB plugin installation finished!"