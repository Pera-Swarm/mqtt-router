import cron from 'node-cron';
import { IClientSubscribeOptions, MqttClient } from 'mqtt';
import { logLevel } from './config';
import { resolveChannelTopic, secondsInterval } from './helper';

type MessageType = {
    topic: string;
    data: string | Buffer;
};

class Message {
    topic: string;
    data: string | Buffer;
    constructor(topic: string, data: string | Buffer) {
        this.topic = topic;
        this.data = data;
    }
}

const defaultOptions: IClientSubscribeOptions = { qos: 2, rap: true, nl: true };

interface AbstractQueue {
    _mqttClient: MqttClient;
    _mqttOptions: IClientSubscribeOptions;
    _list: Message[];
    _schedulerInterval: number;
    add: Function;
    remove: Function;
    publish: Function;
}

export class Queue implements AbstractQueue {
    _mqttClient: MqttClient;
    _mqttOptions: IClientSubscribeOptions;
    _list: Message[];
    _schedulerInterval: number;

    constructor(
        mqttClient: MqttClient,
        options: IClientSubscribeOptions = defaultOptions,
        interval: number = 2
    ) {
        this._list = [];
        this._mqttClient = mqttClient;
        this._mqttOptions = options;
        this._schedulerInterval = interval;
    }

    /**
     * method for adding a message to the queue
     * @param {string} topic
     * @param {string|Buffer} data message data
     */
    add = (topic: string, data: string | Buffer): void => {
        this._list.push(new Message(topic, data));
        if (logLevel !== 'info') {
            console.log('Added_To_Queue', this._list);
        }
    };

    /**
     * method for removing a message in the queue by a given topic
     * @param {string} topic  message topic
     */
    remove = (topic: string) => {
        if (typeof topic !== 'string') {
            throw new TypeError('Invalid topic');
        } else {
            const prevList = this._list;
            prevList.forEach((item, index) => {
                if (item.topic === topic) {
                    this._list.splice(index, 1);
                    if (logLevel !== 'info') {
                        console.log('Removed_Message_With_Topic >', topic);
                    }
                }
            });
        }
    };

    /**
     * method for finding a message with a given topic in the queue
     * @param {string} topic topic of the message in the queue
     * @returns {Message|-1} found message or -1
     */
    findByTopic = (topic: string): Message | -1 => {
        const messages = this._list.map((item) => {
            if (item.topic === topic) {
                return item;
            }
        });
        if (logLevel !== 'info') {
            console.log('Found_MQTT_Messages', messages);
        }
        if (messages.length !== 0) {
            const message = messages[0] === undefined ? -1 : messages[0];
            if (logLevel !== 'info') {
                console.log('Return_MQTT_Message >', message);
            }
            return message;
        } else {
            return -1;
        }
    };

    /**
     * method for starting queue processing
     */
    begin = () => {
        cron.schedule(secondsInterval(this._schedulerInterval), this.routineCheck, {
            scheduled: true,
            timezone: 'Asia/Colombo'
        });
    };

    /**
     * method for publishing a message in the queue
     * @param {Message} message message to be published
     */
    publish = (message: Message) => {
        if (logLevel !== 'info') {
            console.log(
                'MQTT_Publish >',
                message,
                'to topic:',
                resolveChannelTopic(message.topic)
            );
        }
        this._mqttClient.publish(
            resolveChannelTopic(message.topic),
            message.data,
            this._mqttOptions
        );
    };

    /**
     * method for periodically checking the message queue to be published
     */
    routineCheck = () => {
        if (logLevel !== 'info') {
            console.log('MQTT_Publish_Queue_Check');
        }
        if (this._list.length !== 0) {
            if (logLevel !== 'info') {
                console.log('MQTT_Publish_Queue_Not_Empty');
            }
            for (let i = 0; i < this._list.length; i++) {
                const message: Message | undefined = this._list.pop();
                if (message !== undefined) {
                    this.publish(message);
                }
            }
        }
    };
}
