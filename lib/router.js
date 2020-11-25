// TODO: Add an option to add new subscription / remove subscriptions to the route list even after init
const { MqttClient } = require('mqtt');

class MQTTRouter {
    /**
     * MQTTRouter constructor
     * @param {MqttClient} mqttConnection mqtt connection
     * @param {object[]} routes routes with mqtt topic, handler and allowRetained properties
     * @param {object} options mqtt message options
     * @param {function} setup setup function that runs on connection success
     * @param {function} onError error handler function
     */
    constructor(mqttConnection, routes, options, setup, onError) {
        this.mqttClient = mqttConnection;
        if (Array.isArray(routes)) {
            this.routes = routes;
        } else {
            this.routes = [
                {
                    topic: 'v1/',
                    allowRetained: true,
                    handler: (topic, msg) => {
                        try {
                            var data = JSON.parse(msg);
                            console.log('Default Subscriber picked up the topic', data);
                        } catch (err) {
                            this.errorHandler(err);
                        }
                    }
                }
            ];
        }

        if (options !== undefined) {
            this.options = options;
        } else {
            this.options = { qos: 2, rap: true, rh: true };
        }
        if (setup !== undefined) {
            this.setup = setup;
        } else {
            this.setup = null;
        }
        if (onError !== undefined) {
            this.errorHandler = onError;
        } else {
            this.errorHandler = (err) => {
                console.error('MQTT_Error: ', err);
            };
        }
    }

    /**
     * method for starting the mqtt handler
     */
    start = () => {
        this.mqttClient.on('connect', () => {
            console.log('MQTT_Connecting...\n');
            this.handleRouteSubscriptions();
            if (this.setup !== null && this.setup !== undefined) {
                this.setup();
            }
        });

        this.mqttClient.on('error', (err) => {
            console.log('MQTT_Error');
            this.errorHandler(err);
        });

        this.mqttClient.on('message', (topic, message, packet) => {
            // Check JSON format

            for (var i = 0; i < this.routes.length; i += 1) {
                if (this.routes[i].topic === topic) {
                    var msg;

                    // TODO: update this if there more better method than following
                    try {
                        msg =
                            this.routes[i].type == 'String'
                                ? message.toString()
                                : JSON.parse(message);

                        if (packet.retain && this.routes[i].allowRetained) {
                            // Older messages
                            // Note: Accept and handle 'retained true logic' only if both the packet is retained and the route allows retained packets
                            this.retainTrueLogic(topic, msg, this.routes[i]);
                        } else if (packet.retain) {
                            // The route does not allow retained packets
                            console.log('MQTT_Retain_Not_Allowed:', this.routes[i].topic);
                        } else {
                            // Fresh messages
                            // Note: Accept and handle 'retained false logic' if both the packet is not retained and the route doesn't allow retained packets
                            this.retainFalseLogic(topic, msg, this.routes[i]);
                        }
                    } catch (err) {
                        this.errorHandler(err);
                    }
                }
            }
        });
    };

    /**
     * method for handling the subscriptions for the topics in the routes list.
     */
    handleRouteSubscriptions = () => {
        for (var i = 0; i < this.routes.length; i++) {
            if (this.routes[i].subscribe != false) {
                // subscribe at the beginning unless it is avoided by setting 'subscribe:false'
                console.log('MQTT_Subscribed: ', this.routes[i].topic);

                this.mqttClient.subscribe(this.routes[i].topic, this.options);
            } else {
                // No subscription required for this topic
                console.log('MQTT_Not_Subscribed: ', this.routes[i].topic);
            }
        }
        console.log('');
    };

    /**
     * method for filtering retain false handling logic
     * @param {string} topic mqtt topic
     * @param {object} message mqtt message object
     * @param {object} process entry in the route definition
     */
    retainFalseLogic = (topic, message, task) => {
        //console.log('MQTT_Msg_Fresh: ', topic, '>', message);
        task.handler(message);
    };

    /**
     * method for filtering retain true handling logic
     * @param {string} topic mqtt topic
     * @param {object} message mqtt message object
     * @param {object} process entry in the route definition
     */
    retainTrueLogic = (topic, message, task) => {
        //console.log('MQTT_Msg_Retained: ', topic, '>', message);
        task.handler(message);
    };
}

module.exports = MQTTRouter;
