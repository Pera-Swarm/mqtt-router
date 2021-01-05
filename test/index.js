const { MQTTRouter } = require('../index');
const mqttClient = require('mqtt');
const mqttConfig = require('./mqtt.config');
const mqtt = mqttClient.connect(mqttConfig.HOST, mqttConfig.mqttOptions);

var router;

// Sample dynamic route list with handler functions
const SAMPLE_ROUTES = [
    {
        topic: 'sample',
        allowRetained: true,
        subscribe: true,
        publish: false,
        type: 'String',
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

router.start();
