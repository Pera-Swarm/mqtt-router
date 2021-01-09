# mqtt-router [![npm (scoped)](https://img.shields.io/npm/v/@pera-swarm/mqtt-router.svg)](https://github.com/Pera-Swarm/mqtt-router/) [![GitHub Workflow Status](https://img.shields.io/github/workflow/status/Pera-Swarm/mqtt-router/%F0%9F%9A%80%20Release)](https://github.com/Pera-Swarm/mqtt-router/releases) [![GitHub issues](https://img.shields.io/github/issues/Pera-Swarm/mqtt-router)](https://github.com/Pera-Swarm/mqtt-router/issues)
An easy-to-use and flexible routing library for MQTT.

## Overview
@pera-swarm/mqtt-router is a library for handling MQTT publish/subscribe capabilities with a straight forward routing architecture. 
This is a [Node.js](https://nodejs.org/en/) library available on both npm registry and GitHub package registry.

### Usage

#### 1. Installation 
Installation done using `npm install` command:
```
$ npm i --save @pera-swarm/mqtt-router
```

Also, you need to install [`mqtt`](https://www.npmjs.com/package/mqtt) library as well.
```
$ npm i --save mqtt
```

#### 2. Set up routes
Create routes for subscribe and publish:

##### routes.js
```
// Sample dynamic route list with handler functions
const SAMPLE_ROUTES = [
    {
        topic: 'v1/sample',
        allowRetained: true,
        subscribe: true,
        publish: false,
        handler: (msg) => {
            const data = JSON.parse(msg);
            console.log('Sample subscription picked up the topic', data);
        }
    }
];

module.exports = SAMPLE_ROUTES;
```

#### 3. Start the router
You should configure your own mqttOptions according to your mqtt broker and application settings.
##### index.js
```
// Configure mqttClient
const mqttClient = require('mqtt');
const mqttOptions = {
    port: 1883,
    clientId: process.env.MQTT_CLIENT,
    username: process.env.MQTT_USER || '',
    password: process.env.MQTT_PASS || ''
};
const mqtt = mqttClient.connect(process.env.MQTT_HOST, mqttOptions);

// Import MQTTRouter from mqtt-router
const { MQTTRouter } = require('@pera-swarm/mqtt-router');
const routes = require('./routes');

var router;

// Sample MQTT Message Options
const SAMPLE_OPTIONS = { qos: 2, rap: true, rh: true };

// Sample setup function that runs on connect
const SAMPLE_SETUP_FN = () => {
    console.log('sample setup fn');
};

// Sample MQTT Error handler function
const SAMPLE_ON_ERROR_FN = (err) => {
    console.log('error: mqtt');
    console.log(err);
};

router = new MQTTRouter(
    mqtt,
    routes,
    SAMPLE_OPTIONS,
    SAMPLE_SETUP_FN,
    SAMPLE_ON_ERROR_FN
);

router.start();
```

`router.start()` will listen to the subscribed routes that are specified as `subscribed: true` in the route 
specification and then if the subscriber picked up a message for the associated topic, the MQTTRouter will call the relevant `handler` funtion.

You can also wrap the routes using `wrapper` function to include additional higher level attribute to the handler function as well.

##### index.js
```

// Import MQTTRouter and wrapper from mqtt-router
const { MQTTRouter, wrapper } = require('@pera-swarm/mqtt-router');
const routes = require('./routes');

var router;

// Sample MQTT Message Options
const SAMPLE_OPTIONS = { qos: 2, rap: true, rh: true };

// Sample setup function that runs on connect
const SAMPLE_SETUP_FN = () => {
    console.log('sample setup fn');
};

// Sample MQTT Error handler function
const SAMPLE_ON_ERROR_FN = (err) => {
    console.log('error: mqtt');
    console.log(err);
};

// Sample higher level attribute for the handler function
const sampleAttrib = {
    time: Date.now()
};

router = new MQTTRouter(
    mqtt,
    wrapper(routes, sampleAttrib),
    SAMPLE_OPTIONS,
    SAMPLE_SETUP_FN,
    SAMPLE_ON_ERROR_FN
);

router.start();
```

##### routes.js
```
// Sample dynamic route list with handler functions.
// sampleAttrib will be added to the handler function as the second parameter.
const SAMPLE_ROUTES = [
    {
        topic: 'v1/sample',
        allowRetained: true,
        subscribe: true,
        publish: false,
        handler: (msg, attrib) => {
            const data = JSON.parse(msg);
            // console.log(attrib);
            console.log('Sample subscription picked up the topic', data);
        }
    }
];

module.exports = SAMPLE_ROUTES;
```

### Useful

> Note: You can also configure a topic prefix by configuring an environment variable *`MQTT_CHANNEL`*. 
(example: `MQTT_CHANNEL=beta` in a .env file locally)


### Contribute

#### 1. Install dependencies

Install project dependencies.
```
$ npm install
```

#### 2. Testing

> Note: Before running the test cases, you should configure environment variables `MQTT_HOST`,`MQTT_USER`, `MQTT_PASS`, 
and `MQTT_CLIENT`. Please refer `sample.nodemon.json` file for nodemon environment variable configuration.

Manually run the test cases.
```
$ node test/index.js
```

or you can use nodemon script once environment variables configured correctly.

```
$ npm run client
```

<hr />

## Documentation
* <a href="#route"><code><b>Route</b></code></a>
* <a href="#mqttrouter"><code><b>MQTTRouter</b></code></a>
  * <a href="#mqttrouter-start"><code>mqttRouter.<b>start()</b></code></a>
  * <a href="#mqttrouter-pushToPublishQueue"><code>mqttRouter.<b>pushToPublishQueue()</b></code></a>
  * <a href="#mqttrouter-addRoute"><code>mqttRouter.<b>addRoute()</b></code></a>
  * <a href="#mqttrouter-removeRoute"><code>mqttRouter.<b>removeRoute()</b></code></a>
* <a href="#wrapper"><code><b>wrapper</b></code></a>
* <a href="#queue"><code><b>Queue</b></code></a>
  * <a href="#queue-begin"><code>queue.<b>begin()</b></code></a>
  * <a href="#queue-add"><code>queue.<b>add()</b></code></a>
  * <a href="#queue-remove"><code>queue.<b>remove()</b></code></a>
  * <a href="#queue-findByTopic"><code>queue.<b>findByTopic()</b></code></a>
* <a href="#subscribeToTopic"><code><b>subscribeToTopic</b></code></a>
* <a href="#publishToTopic"><code><b>publishToTopic</b></code></a>
* <a href="#secondsInterval"><code><b>secondsInterval</b></code></a>
* <a href="#minutesInterval"><code><b>minutesInterval</b></code></a>

<hr />

<a name="route"></a>
### Route

A route definition for handling route subscription logic. Following are the properties supported on the `Route` definition:

- `topic: string`

  The Route topic

- `type: 'String' | 'JSON'`

  Payload type (default:String)
  
- `allowRetained: boolean`

  Retain allowance
  
- `subscribe: boolean`

  Subscribe flag

- `publish: boolean`

  Publish flag

- `handler: Function`

  The default subscribe handler function, called when subscribe:true, packet.retain:true|false and allowRetained:true.
  Retained messages and new messages will be handled by default.

- `fallbackRetainHandler?: Function`

  Subscribe handler function only for retained messages, but for route specific custom logic. called when subscribe:true, 
  packet.retain:true and allowRetained:false.
> Note: If specified, `fallbackRetainHandler` function will be called. If not specified, retained messages will be discarded.

<hr />

<a name="mqttrouter"></a>
### MQTTRouter (mqttConnection, routes, options, setup, onError)

The main entrypoint of [mqtt-router](https://github.com/Pera-Swarm/mqtt-router/) that defines the router logic. 
You have to import the `MQTTRouter` class and instantiate with a mqtt client. 
Parameters supported in the constructor:
  * `mqttConnection {MqttClient}` : mqtt [connection](https://github.com/mqttjs/MQTT.js/blob/master/README.md#client)
  * `routes {Route[]}` : routes with mqtt topic, handler and allowRetained properties
  * `options {IClientSubscribeOptions}` : mqtt message [options](https://github.com/mqttjs/MQTT.js/blob/master/README.md#mqttconnecturl-options)
  * `setup {Function}` : setup function that runs on successful connection
  * `onError {Function}` : error handler function
  
<hr />

<a name="mqttrouter-start"></a>
### mqttRouter.start()

The method for starting the mqtt router. 
> You must call this method once, a MQTTRouter object instantiated.

<hr />

<a name="mqttrouter-pushToPublishQueue"></a>
### mqttRouter.pushToPublishQueue(topic, data)

Add a message to the [publish queue](https://github.com/Pera-Swarm/mqtt-router/blob/master/README.md/#queue) that to be 
scheduled to publish.
Parameters supported:
  * `topic {string}` : message topic
  * `data {string|Buffer}` : message data

<hr />

<a name="mqttrouter-addRoute"></a>
### mqttRouter.addRoute(route)

Add a route to the subscriber routes list.
Parameter supported:
  * `route {Route}` : route object to be added to the subscriber list

<hr />

<a name="mqttrouter-removeRoute"></a>
### mqttRouter.removeRoute(topic)

Remove a route from the subscriber routes list.
Parameter supported:
  * `topic {string}` : route topic

<hr />

<a name="wrapper"></a>
### wrapper(routes, property)

Wrap an array of `Route` objects with a higher order property (ex: property can be`this` from the callee class) or 
a separate attribute to the `handler` function as a second parameter, in each route object.
Parameters supported:
  * `routes {Route[]}` : routes array
  * `property {any}` : property that required to be wrapped with

<hr />

<a name="queue"></a>
### Queue

A Queue implementation for the `mqtt-router` with a scheduler that acts as a "Publish Queue".
Parameters supported in the constructor:
  * `mqttClient {MqttClient}` : mqtt [connection](https://github.com/mqttjs/MQTT.js/blob/master/README.md#client)
  * `options {IClientSubscribeOptions}` : mqtt message [options](https://github.com/mqttjs/MQTT.js/blob/master/README.md#mqttconnecturl-options)
  * `number {number}` : interval

<hr />

<a name="queue-begin"></a>
### queue.begin()

Begin the queue processing (scheduler).
> Note: You must call this method once, a Queue object instantiated.

<hr />

<a name="queue-add"></a>
### queue.add(topic, data)

Add a message to the publish queue. This message will be published by the scheduler.
Parameters supported:
  * `topic {string}` : message topic
  * `data {string|Buffer}` : message data

<hr />

<a name="queue-remove"></a>
### queue.remove(topic)

Remove a message in the queue by a given topic.
Parameter supported:
  * `topic {string}` : message topic

<hr />

<a name="queue-findByTopic"></a>
### queue.findByTopic(topic)

Find a message with the given topic in the queue. Returns `-1` if not found on the queue.
Parameter supported:
  * `topic {string}` : message topic

<hr />

<a name="subscribeToTopic"></a>
### subscribeToTopic(mqtt, topic, options)

Subscribe to a given topic with options.
Parameters supported:
  * `mqtt {MqttClient}` : mqtt [connection](https://github.com/mqttjs/MQTT.js/blob/master/README.md#client)
  * `topic {string}` : message topic
  * `options {IClientSubscribeOptions}` : mqtt message [options](https://github.com/mqttjs/MQTT.js/blob/master/README.md#mqttconnecturl-options)

<hr />

<a name="publishToTopic"></a>
### publishToTopic(mqtt, topic, message, options, callback)

Publish a message to a given message topic with options and a callback function.
Parameters supported:
  * `mqtt {MqttClient}` : mqtt [connection](https://github.com/mqttjs/MQTT.js/blob/master/README.md#client)
  * `topic {string}` : message topic
  * `message {string}` : message data
  * `options {IClientSubscribeOptions}` : mqtt message [options](https://github.com/mqttjs/MQTT.js/blob/master/README.md#mqttconnecturl-options)
  * `callback {Function}` : callback function

<hr />

<a name="secondsInterval"></a>
### secondsInterval(interval)

Generates a cron interval called in given seconds
Parameter supported:
  * `interval {number}` : interval in seconds

<hr />

<a name="minutesInterval"></a>
### minutesInterval(interval)

Generates a cron interval called in given minutes
Parameter supported:
  * `interval {number}` : interval in minutes

<hr />

### To-Do
- [ ] Fix duplicate topic support for routing.

### Licence
This project is licensed under [LGPL-2.1 Licence](https://github.com/Pera-Swarm/mqtt-router/blob/main/LICENSE).
