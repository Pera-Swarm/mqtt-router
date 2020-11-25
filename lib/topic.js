const { MqttClient } = require('mqtt');

/**
 * method for subscribing to a given topic with options
 * @param {MqttClient} mqtt mqtt connection
 * @param {string} topic mqtt topic
 * @param {object} options mqtt message options
 */
const subscribeToTopic = (mqtt, topic, options) => {
    mqtt.subscribe(topic, options);
};

/**
 * method for publishing a message to a given topic with options and a callback funtion
 * @param {MqttClient} mqtt mqttconnection
 * @param {string} topic mqtt topic
 * @param {object} message mqtt message object
 * @param {options} options mqtt message options
 * @param {function} callback callback function
 */
const publishToTopic = (mqtt, topic, message, options, callback) => {
    mqtt.publish(topic, message, options, () => {
        if (callback !== undefined) {
            callback();
        }
    });
};

module.exports = {
    subscribeToTopic,
    publishToTopic
};
