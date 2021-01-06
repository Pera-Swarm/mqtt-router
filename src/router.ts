import { IClientSubscribeOptions, IPacket, IPublishPacket, MqttClient } from 'mqtt';
import { channel, logLevel } from './config';
import { Queue } from './queue';


/**
 * constraints:
 * all fresh messages will be picked up by handler
 * retained messages that also allows route specific retain property, will be picked up by handler
 * retained messages that not allowed route specific retain property, will be picked up by fallbackRetainHandler if specified, otherswise discarded
 */

export type Route = {
    /**
     *route topic
     */
    topic: string;
    /*
     * payload type (default:String)
     * 'String' | 'JSON'
     * type?: string;
     */
    type: 'String' | 'JSON';
    // retain allowance
    allowRetained: boolean;
    /**
     * subscribe flag
     */
    subscribe: boolean;
    /**
     * publish flag
     */
    publish: boolean;
    /**
     * the default subscribe handler function, called when subscribe:true, packet.retain:true|false and allowRetained:true
     * retained messages and new messages will be handled by default
     */
    handler: Function;
    /**
     * only for retained messages, but for route specific custom logic
     * subscribe handler function, called when subscribe:true, packet.retain:true and allowRetained:false
     * is specified fallbackRetainHandler function will be called
     * if not specified, retained messages will be discarded
     */
    fallbackRetainHandler?: Function;
};

const defaultOptions: IClientSubscribeOptions = { qos: 2, rap: true, nl: true };

const defaultSetup = function () {};

/**
 * error handler method
 * @param {any} error error object
 */
const defaultOnError = function (error: any) {
    throw new Error(`MQTT_Router Error: ${error}`);
};

export class MQTTRouter {
    protected _mqttClient: MqttClient;
    protected _routes: Route[];
    protected _publishQueue: Queue;
    private _options: IClientSubscribeOptions;
    private setup: Function;
    private errorHandler: Function;

    /**
     * MQTTRouter constructor
     * @param {MqttClient} mqttConnection mqtt connection
     * @param {Route[]} routes routes with mqtt topic, handler and allowRetained properties
     * @param {IClientSubscribeOptions} options mqtt message options
     * @param {Function} setup setup function that runs on connection success
     * @param {Function} onError error handler function
     */
    constructor(
        mqttConnection: MqttClient,
        routes: Route[],
        options: IClientSubscribeOptions = defaultOptions,
        setup: Function = defaultSetup,
        onError: Function = defaultOnError
    ) {
        this._mqttClient = mqttConnection;
        if (Array.isArray(routes)) {
            this._routes = routes;
        } else {
            this._routes = [
                {
                    topic: channel,
                    allowRetained: true,
                    subscribe: true,
                    publish: false,
                    type: 'String',
                    handler: (msg: string) => {
                        try {
                            var data = JSON.parse(msg);
                            console.log(
                                `Default Subscriber(${channel}) picked up the message`,
                                data
                            );
                        } catch (err) {
                            this.errorHandler(err);
                        }
                    }
                }
            ];
        }
        this._publishQueue = new Queue(mqttConnection, options);
        this._options = options;
        this.setup = setup;
        this.errorHandler = onError;
    }

    /**
     * method for starting the mqtt handler
     */
    start = () => {
        this._mqttClient.on('connect', () => {
            console.log('MQTT_Connecting...\n');
            this.handleRouteSubscriptions();
            this.setup();
        });

        this._mqttClient.on('error', (err) => {
            console.log('MQTT_Error');
            this.errorHandler(err);
        });

        this._mqttClient.on('message', (topic, message, packet: IPublishPacket) => {
            // Check JSON format
            for (var i = 0; i < this._routes.length; i += 1) {
                if (channel + this._routes[i].topic === topic) {
                    var msg;
                    try {
                        msg =
                            this._routes[i].type == 'String'
                                ? message.toString()
                                : message.toJSON().data;

                        if (!packet.retain) {
                            // Fresh messages
                            this.callHandler(topic, msg, this._routes[i]);
                        } else if (packet.retain && this._routes[i].allowRetained) {
                            // Older/Retained messages
                            // Note: Accept and handle 'retained true logic' only if both the packet is retained and the route allows retained packets
                            this.callHandler(topic, msg, this._routes[i]);
                        } else if (
                            packet.retain &&
                            !this._routes[i].allowRetained &&
                            this._routes[i].fallbackRetainHandler !== undefined
                        ) {
                            // Older/Retained messages
                            // Note: Accept and handle 'retained false logic' if both the packet is retained and the route doesn't allow retained packets
                            this.callFallback(topic, msg, this._routes[i]);
                        } else if (
                            packet.retain &&
                            !this._routes[i].allowRetained &&
                            this._routes[i].fallbackRetainHandler === undefined
                        ) {
                            // Discard Older/Retained messages
                            this.callFallback(topic, msg, this._routes[i]);
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
        for (var i = 0; i < this._routes.length; i++) {
            if (this._routes[i].subscribe != false) {
                // subscribe at the beginning unless it is avoided by setting 'subscribe:false'
                if (logLevel === 'debug') {
                    console.log('MQTT_Subscribed: ', channel + this._routes[i].topic);
                }
                this._mqttClient.subscribe(
                    channel + this._routes[i].topic,
                    this._options
                );
            } else {
                // No subscription required for this topic
                if (logLevel === 'debug') {
                    console.log('MQTT_Not_Subscribed: ', channel + this._routes[i].topic);
                }
            }
        }
        console.log('');
    };

    /**
     * method for filtering retain true handling logic
     * @param {string} topic mqtt topic
     * @param {string|number[]} message mqtt message object
     * @param {Route} route entry in the route definition
     */
    callHandler = (topic: string, message: string | number[], route: Route) => {
        route.handler(message);
        if (logLevel === 'debug') {
            console.log('MQTT_Msg_Handled: ', topic, '>', message);
        }
    };

    /**
     * method for filtering retain false handling logic
     * @param {string} topic mqtt topic
     * @param {string|number[]} message mqtt message object
     * @param {Route} route entry in the route definition
     */
    callFallback = (topic: string, message: string | number[], route: Route) => {
        if (route.fallbackRetainHandler !== undefined) {
            route.fallbackRetainHandler(message);
            if (logLevel === 'debug') {
                console.log('MQTT_Msg_Fall backed: ', topic, '>', message);
            }
        }
    };

    /**
     * discard message
     * @param {string} topic mqtt topic
     * @param {string|number[]} message mqtt message object
     */
    discard = (topic: string, message: string | number[]) => {
        if (
            logLevel === 'debug' ||
            logLevel === 'info' ||
            logLevel === 'warn' ||
            logLevel === 'error'
        ) {
            console.log('MQTT_Msg_Discarded: ', topic, '>', message);
        }
    };

    /**
     * method for adding the message to the publish queue
     * @param {string} topic message topic
     * @param {string|Buffer} data message data
     */
    pushToPublishQueue = (topic: string, data: string | Buffer) => {
        this._publishQueue.add(topic, data);
    };
}
