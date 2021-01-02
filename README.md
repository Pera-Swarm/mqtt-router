# mqtt-router [![npm (scoped)](https://img.shields.io/npm/v/@pera-swarm/mqtt-router.svg)](https://github.com/Pera-Swarm/mqtt-router/) [![GitHub Workflow Status](https://img.shields.io/github/workflow/status/Pera-Swarm/mqtt-router/%F0%9F%9A%80%20Release)](https://github.com/Pera-Swarm/mqtt-router/releases) [![GitHub issues](https://img.shields.io/github/issues/Pera-Swarm/mqtt-router)](https://github.com/Pera-Swarm/mqtt-router/issues)
An easy-to-use and flexible routing library for MQTT.

## Overview
@pera-swarm/mqtt-router is a library for handling MQTT publish/subscribe capabilities with a straight forward routing architecture. This is a [Node.js](https://nodejs.org/en/) library available on both npm registry and GitHub package registry.

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

`router.start()` will listen to the subscribed routes that are specified as `subscribed: true` in the route specification and then if the subscriber picked up a message for the associated topic, the MQTTRouter will call the relevant `handler` funtion.

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

> Note: You can also configure a topic prefix by configuring an environment variable *`MQTT_CHANNEL`*. (example: `MQTT_CHANNEL=beta` in a .env file locally)


### Contribute

#### 1. Install dependencies

Install project dependencies.
```
$ npm install
```

#### 2. Testing

> Note: Before running the test cases, you should configure environment variables `MQTT_HOST`,`MQTT_USER`, `MQTT_PASS`, and `MQTT_CLIENT`.
Manually run the test cases.
```
$ node test/index.js
```

### To-Do
- [ ] Separate allowedRetained functions for both allowed and not allowed use cases.
- [ ] Add flexible subscribers and publishers (Should be able to unsubscribe from routes later on).

### Licence
This project is licensed under [LGPL-2.1 Licence](https://github.com/Pera-Swarm/mqtt-router/blob/main/LICENSE).
