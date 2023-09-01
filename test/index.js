const { MQTTRouter } = require('../index');
const mqttClient = require('mqtt');
const mqttConfig = require('./mqtt.config');

const mqttHost = mqttConfig.HOST?.startsWith('mqtt://')
    ? mqttConfig.HOST
    : `mqtt://${mqttConfig.HOST}`;

const mqtt = mqttClient.connect(mqttHost, mqttConfig.mqttOptions);
var router;

// Sample dynamic route list with handler functions
const SAMPLE_ROUTES = [
    {
        topic: 'sample',
        allowRetained: true,
        subscribe: true,
        publish: false,
        type: 'JSON',
        handler: (msg) => {
            try {
                var data = JSON.parse(msg);
                console.log(
                    `Default Subscriber(${SAMPLE_ROUTES[0].topic}) picked up the message`,
                    data
                );
            } catch (err) {
                console.log('Handler error:', err);
            }
        },
        fallbackRetainHandler: () => {
            console.log('Fallback method');
        }
    },
    {
        topic: 'sample-2',
        allowRetained: true,
        subscribe: true,
        publish: false,
        type: 'String',
        handler: (msg) => {
            try {
                console.log(`Sample subscriber handler picked up the message`, msg);
            } catch (err) {
                console.log('Handler error:', err);
            }
        },
        fallbackRetainHandler: () => {
            console.log('Fallback method');
        }
    },
    {
        topic: 'quite',
        allowRetained: true,
        subscribe: true,
        publish: false,
        type: 'String',
        handler: (msg) => {
            try {
                process.exit(0);
            } catch (err) {
                console.log('Handler error:', err);
            }
        },
        fallbackRetainHandler: () => {
            console.log('Fallback method');
        }
    }
];

// Sample MQTT Options
const SAMPLE_OPTIONS = { qos: 2, rap: false, rh: true };

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
    SAMPLE_ROUTES,
    SAMPLE_OPTIONS,
    SAMPLE_SETUP_FN,
    SAMPLE_ON_ERROR_FN
);

const samplePublishMessages = [
    {
        topic: 'sample-2',
        data: 'Sample Data 1'
    },
    {
        topic: 'sample-2',
        data: 'Sample Data 2'
    },
    {
        topic: 'sample-2',
        data: 'Sample Data 3'
    },
    {
        topic: 'sample-2',
        data: 'Sample Data 4'
    },
    {
        topic: 'sample-2',
        data: 'Sample Data 5'
    },
    {
        topic: 'sample-2',
        data: 'Sample Data 6'
    },
    {
        topic: 'quite',
        data: 'End the test'
    }
];

router.start((response) => {
    console.log(response);
    samplePublishMessages.forEach((element) => {
        console.log('Publishing', element.topic);
        console.log(element.data);
        router.pushToPublishQueue(element.topic, element.data);
    });
});
