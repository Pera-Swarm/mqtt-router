import { IClientSubscribeOptions, MqttClient } from 'mqtt';
import { resolveChannelTopic } from './helper';

/**
 * method for subscribing to a given topic with options
 * @param {MqttClient} mqtt mqtt connection
 * @param {string} topic mqtt topic
 * @param {IClientSubscribeOptions} options mqtt message subscription options
 */
export const subscribeToTopic = (
    mqtt: MqttClient,
    topic: string,
    options: IClientSubscribeOptions
) => {
    mqtt.subscribe(resolveChannelTopic(topic), options);
};

/**
 * method for publishing a message to a given topic with options and a callback funtion
 * @param {MqttClient} mqtt mqttconnection
 * @param {string} topic mqtt topic
 * @param {string} message mqtt message object
 * @param {object} options mqtt message options
 * @param {Function} callback callback function
 */
export const publishToTopic = (
    mqtt: MqttClient,
    topic: string,
    message: string,
    options: object,
    callback: Function
) => {
    mqtt.publish(resolveChannelTopic(topic), message, options, () => {
        if (callback !== undefined) {
            callback();
        }
    });
};
