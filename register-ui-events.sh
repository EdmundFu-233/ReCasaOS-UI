#!/usr/bin/bash


# This script is used to register the UI events for the UI events

# Get the message bus URL
runtime_file="/var/run/casaos/message-bus.url"
ui_message_bus_file="/var/lib/casaos/ui-message-bus.json"
token_file="/var/run/casaos/gateway.token"
if [ -f "$runtime_file" ] && [ -f "$ui_message_bus_file" ]
then
    MESSAGE_BUS_URL=$(cat /var/run/casaos/message-bus.url)
    # gateway service credential (bus: loopback ≠ identity); via fd, never on a command line
    if [ -r "$token_file" ]
    then
        curl -X POST "$MESSAGE_BUS_URL/v2/message_bus/event_type" -H "Content-Type: application/json" \
            -H @<(printf 'Authorization: Bearer %s\n' "$(< "$token_file")") -d @$ui_message_bus_file
    else
        curl -X POST "$MESSAGE_BUS_URL/v2/message_bus/event_type" -H "Content-Type: application/json" -d @$ui_message_bus_file
    fi
    echo "UI events registered"
else
    echo "Message bus URL or message json file not found"
fi