import { IClientSubscribeOptions, IPacket, IPublishPacket, MqttClient } from 'mqtt';
import { channel, logLevel, mqttConfigOptions } from './config';
import { resolveChannelTopic } from './helper';
import { MQTTQueue } from './mqtt_queue';
import { v4 as uuidv4 } from 'uuid';

/**
 * Constraints:
 * All fresh messages will be picked up by handler
 * Retained messages that also allows route specific retain property, will be picked up by handler
 * Retained messages that not allowed route specific retain property, will be picked up by fallbackRetainHandler if specified, otherswise discarded
 */

export type Route = {
    /**
     * route topic
     */
    topic: string;

    /**
     * channel prefix flag
     */
    channelPrefix?: boolean;

    /*
     * Payload type (default:String)
     * 'String' | 'JSON'
     * type?: string;
     */
    type: 'String' | 'JSON';

    // Retain allowance
    allowRetained: boolean;

    /**
     * Subscribe flag
     */
    subscribe: boolean;

    /**
     * Publish flag
     */
    publish: boolean;

    /**
     * The default subscribe handler function, called when subscribe:true, packet.retain:true|false and allowRetained:true
     * retained messages and new messages will be handled by default
     */
    handler: Function;

    /**
     * Only for retained messages, but for route specific custom logic
     * subscribe handler function, called when subscribe:true, packet.retain:true and allowRetained:false
     * if specified fallbackRetainHandler function will be called
     * if not specified, retained messages will be discarded
     */
    fallbackRetainHandler?: Function;
};

const defaultOptions: IClientSubscribeOptions = { qos: 2, rap: true, nl: true };

const defaultSetup = function () {};

/**
 * Error handler method
 * @param {any} error Error object
 */
const defaultOnError = function (error: any) {
    console.error(`MQTT_Router_Error: ${error}`);
};

export class MQTTRouter {
    private _id: string;
    protected _mqttClient: MqttClient;
    protected _routes: Route[];
    protected _publishQueue: MQTTQueue;
    private _options: IClientSubscribeOptions;
    private _unique: boolean;
    private _discoveryTopic: string;
    private _terminateTopic: string;
    private _created: Date;
    private setup: Function;
    private errorHandler: Function;

    /**
     * MQTTRouter constructor
     * @param {MqttClient} mqttConnection MQTT connection
     * @param {Route[]} routes Routes with MQTT topic, handler and allowRetained properties
     * @param {IClientSubscribeOptions} options MQTT message options
     * @param {Function} setup Setup function that runs on connection success
     * @param {Function} onError Error handler function
     * @param {boolean} isUnique Whether to allow multiple instances of MQTT routers on the same MQTT channel
     */
    constructor(
        mqttConnection: MqttClient,
        routes: Route[],
        options: IClientSubscribeOptions = defaultOptions,
        setup: Function = defaultSetup,
        onError: Function = defaultOnError,
        isUnique: boolean = true,
        discoveryTopic: string = '/service/discovery',
        terminateTopic: string = '/service/terminate'
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
                            const data = JSON.parse(msg);
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
        this._publishQueue = new MQTTQueue(mqttConnection, options);
        this._options = options;
        this.setup = setup;
        this.errorHandler = onError;
        this._unique = isUnique;
        this._id = uuidv4();
        this._discoveryTopic = discoveryTopic;
        this._terminateTopic = terminateTopic;
        this._created = new Date();
    }

    /**
     * Method for starting the MQTT handler
     */
    start = (callback: Function) => {
        this._mqttClient.on('connect', () => {
            console.log('MQTT_Connecting...\n');
            this.setup();
            this.handleRouteSubscriptions();
            if (this._unique) {
                this.addRoutes(this.initialServiceSubscriptions());
                setTimeout(() => {
                    this.publishDiscoveryMessage();
                }, 1000);
            }
            this._publishQueue.start();
            console.log(`MQTT_Router: Connected to the channel '${channel}'\n`);

            if (callback) {
                callback(`MQTT_Router: Connected to the channel ${channel}`);
            }
        });

        this._mqttClient.on('error', (err) => {
            console.log('MQTT_Error');
            this.errorHandler(err);
        });

        this._mqttClient.on(
            'message',
            (topic: string, message: Buffer, packet: IPublishPacket) => {
                if (logLevel !== 'info') {
                    console.log('Received::MQTT_Message from topic >', topic);
                }
                if (this._unique && topic === this._discoveryTopic) {
                    // Handle the channel discovery procedure
                    this.handlDiscoverySubscription(topic, message);
                } else if (
                    this._unique &&
                    topic === `${this._terminateTopic}/${this._id}`
                ) {
                    // Not allowing to have 2 MQTT routers on the same channel
                    this.terminate();
                } else {
                    for (let i = 0; i < this._routes.length; i += 1) {
                        if (resolveChannelTopic(this._routes[i].topic) === topic) {
                            // convert message format
                            let msg: string | JSON | undefined;
                            if (logLevel !== 'info') {
                                console.log(
                                    `MQTT_MessageToBeHandled: ${topic} > ${message}`
                                );
                            }
                            try {
                                msg = this.decodeMessage(this._routes[i].type, message);
                                if (msg !== undefined) {
                                    if (!packet.retain) {
                                        // Fresh messages
                                        this.callHandler(topic, msg, this._routes[i]);
                                    } else if (
                                        packet.retain &&
                                        this._routes[i].allowRetained
                                    ) {
                                        // Older/Retained messages
                                        // Note: Accept and handle 'retained true logic' only if both the packet is retained and the route allows retained packets
                                        this.callHandler(topic, msg, this._routes[i]);
                                    } else if (
                                        packet.retain &&
                                        !this._routes[i].allowRetained &&
                                        this._routes[i].fallbackRetainHandler !==
                                            undefined
                                    ) {
                                        // Older/Retained messages
                                        // Note: Accept and handle 'retained false logic' if both the packet is retained and the route doesn't allow retained packets
                                        this.callFallback(topic, msg, this._routes[i]);
                                    } else if (
                                        packet.retain &&
                                        !this._routes[i].allowRetained &&
                                        this._routes[i].fallbackRetainHandler ===
                                            undefined
                                    ) {
                                        // Discard Older/Retained messages
                                        this.discard(topic, msg);
                                    }
                                }
                            } catch (err) {
                                this.errorHandler(err);
                            }
                        }
                    }
                }
            }
        );
    };

    /**
     * Method for handling the subscriptions for the topics in the routes list.
     */
    handleRouteSubscriptions = () => {
        for (let i = 0; i < this._routes.length; i++) {
            if (this._routes[i].subscribe !== false) {
                // Subscribe at the beginning unless it is avoided by setting 'subscribe:false'
                const resolvedTopic =
                    this._routes[i].channelPrefix !== undefined &&
                    this._routes[i].channelPrefix === false
                        ? this._routes[i].topic
                        : resolveChannelTopic(this._routes[i].topic);
                if (logLevel === 'debug') {
                    console.log('MQTT_Subscribed: ', resolvedTopic);
                }
                this._mqttClient.subscribe(resolvedTopic, this._options);
            } else {
                // No subscription required for this topic
                if (logLevel === 'debug') {
                    console.log(
                        'MQTT_Not_Subscribed: ',
                        resolveChannelTopic(this._routes[i].topic)
                    );
                }
            }
        }
        console.log('');
    };

    /**
     * Method for decoding a message to a given type
     * @param {string} type Message decode type
     * @param {Buffer} message MQTT message
     */
    decodeMessage = (type: string, message: Buffer) => {
        let msg: string | JSON | undefined;
        if (type === undefined || message === undefined) {
            console.error('Invalid type or message');
            return undefined;
        }

        try {
            msg = type === 'String' ? message.toString() : JSON.parse(message.toString());
            return msg;
        } catch (error) {
            console.error('Parse Error');
            return;
        }
    };

    /**
     * Method for filtering retain true handling logic
     * @param {string} topic MQTT topic
     * @param {string|JSON} message MQTT message object
     * @param {Route} route Entry in the route definition
     */
    callHandler = (topic: string, message: string | JSON, route: Route) => {
        route.handler(message);
        if (logLevel === 'debug') {
            console.log(`MQTT_Msg:Handled: ${topic} > ${message}`);
        }
    };

    /**
     * Method for filtering retain false handling logic
     * @param {string} topic MQTT topic
     * @param {string|JSON} message MQTT message object
     * @param {Route} route Entry in the route definition
     */
    callFallback = (topic: string, message: string | JSON, route: Route) => {
        if (route.fallbackRetainHandler !== undefined) {
            route.fallbackRetainHandler(message);
            if (logLevel === 'debug') {
                console.log(`MQTT_Msg:Fallback: ${topic} > ${message}`);
            }
        }
    };

    /**
     * Discard message
     * @param {string} topic MQTT topic
     * @param {string|JSON} message MQTT message object
     */
    discard = (topic: string, message: string | JSON) => {
        if (
            logLevel === 'debug' ||
            logLevel === 'info' ||
            logLevel === 'warn' ||
            logLevel === 'error'
        ) {
            console.log(`MQTT_Msg:Discarded: ${topic} > ${message}`);
        }
    };

    /**
     * Method for adding the message to the publish queue
     * @param {string} topic message topic
     * @param {string|Buffer} data message data
     */
    pushToPublishQueue = (
        topic: string,
        data: string | Buffer,
        options?: mqttConfigOptions
    ) => {
        this._publishQueue.add(topic, String(data), options);
    };

    /**
     * Method for adding a route to the list
     * @param {Route} route route object to be added to the subscriber list
     */
    addRoute = (route: Route) => {
        if (route === undefined) {
            console.error('Invalid route');
        } else {
            this._routes.push(route);
            if (route.subscribe !== false) {
                const resolvedTopic =
                    route.channelPrefix !== undefined && route.channelPrefix === false
                        ? route.topic
                        : resolveChannelTopic(route.topic);
                console.log(`MQTT_Subscribed: ${resolvedTopic}`);
                // Subscribe at the beginning unless it is avoided by setting 'subscribe:false'
                this._mqttClient.subscribe(resolvedTopic, this._options);
            } else {
                // No subscription required for this topic
                if (logLevel === 'debug') {
                    console.log(`MQTT_Not_Subscribed: ${route.topic}`);
                }
            }
        }
    };

    /**
     * Method for adding multiple routes to the list
     * @param {Route[]} route[] List of route objects to be added to the subscriber list
     */
    addRoutes = (routes: Route[]) => {
        for (let i = 0; i < routes.length; i++) {
            this.addRoute(routes[i]);
        }
    };

    /**
     * Method for removing a route in the list by a given topic
     * @param {string} topic route topic
     */
    removeRoute = (topic: string) => {
        if (topic === undefined) {
            console.error('Invalid topic');
        } else {
            const prevList = this._routes;
            prevList.forEach((item, index) => {
                if (item.topic === topic) {
                    this._routes.splice(index, 1);
                    if (logLevel !== 'info') {
                        console.log(`Removed_Route_With_Topic > ${topic}`);
                    }
                    this._mqttClient.unsubscribe(
                        resolveChannelTopic(topic),
                        this._options,
                        () => {
                            if (logLevel !== 'info') {
                                console.log(`Unsubscribed_Route_With_Topic > ${topic}`);
                            }
                        }
                    );
                }
            });
        }
    };

    /**
     * Method for setting discoveryTopic and terminateTopic
     * @param {string} discoveryTopic the discovery topic
     * @param {string} terminateTopic the terminate topic
     */
    setServiceTopics = (discoveryTopic: string, terminateTopic: string) => {
        this._discoveryTopic = discoveryTopic;
        this._terminateTopic = terminateTopic;
    };

    /**
     * Method for handling service discovery subscription
     * @param {string} topic the discovery topic
     * @param {string} message mqtt message
     */
    handlDiscoverySubscription = (topic: string, message: Buffer) => {
        if (topic === this._discoveryTopic) {
            try {
                const data: { uuid: string; timestamp: string } = JSON.parse(
                    message.toString()
                );
                if (logLevel !== 'info') {
                    console.log('Service::Discovery::This_Data >', {
                        id: this._id,
                        created: this._created
                    });
                    console.log('Service::Discovery::Parsed_Data >', data);
                }
                if (
                    data !== undefined &&
                    this._id !== String(data.uuid) &&
                    Number(this._created) < Number(new Date(data.timestamp))
                ) {
                    setTimeout(() => {
                        // Adding a timeout to make sure the the 'sender' is ready to receive messages
                        this.publishTerminationMessage(data.uuid);
                    }, 2500);
                }
            } catch (error) {
                console.error('Parse Error');
                return;
            }
        }
    };

    /**
     * Method for publishing service discovery message
     */
    publishDiscoveryMessage = () => {
        this.pushToPublishQueue(
            this._discoveryTopic,
            JSON.stringify({ uuid: this._id, timestamp: this._created })
        );
    };

    /**
     * Method for publishing service termination message
     */
    publishTerminationMessage = (id: string) => {
        this.pushToPublishQueue(`${this._terminateTopic}/${id}`, JSON.stringify({ id }));
    };

    /**
     * Initial subscriptions
     * @description Service Discovery and Service Termination routes
     */
    initialServiceSubscriptions = (): Route[] => {
        return [
            {
                topic: this._discoveryTopic,
                allowRetained: false,
                subscribe: true,
                publish: false,
                channelPrefix: true,
                type: 'JSON',
                handler: () => {}
            },
            {
                topic: `${this._terminateTopic}/${this._id}`,
                allowRetained: false,
                subscribe: true,
                publish: false,
                channelPrefix: true,
                type: 'JSON',
                handler: () => {}
            }
        ];
    };

    /**
     * Method for terminating the MQTT router
     */
    terminate = () => {
        if (logLevel !== 'info') {
            console.log('Service::Termination');
        }
        throw new Error('MQTT_Channel_Occupied: Please change the MQTT channel!');
    };
}
