import { IClientSubscribeOptions, MqttClient } from 'mqtt';
import Queue from 'queue';
import { logLevel, mqttConfigOptions } from './config';
import { resolveChannelTopic } from './helper';

class Message {
    topic: string;
    data: string | Buffer;
    options?: mqttConfigOptions;
    constructor(topic: string, data: string | Buffer) {
        this.topic = topic;
        this.data = data;
    }
}

const defaultOptions: IClientSubscribeOptions = { qos: 2, rap: true, nl: true };

interface AbstractQueue {
    _mqttClient: MqttClient;
    _mqttOptions: IClientSubscribeOptions;
    _queue: Queue;
    _schedulerInterval: number;
    add: Function;
    publish: Function;
    start: Function;
    stop: Function;
    end: Function;
}

export class MQTTQueue implements AbstractQueue {
    _mqttClient: MqttClient;
    _mqttOptions: IClientSubscribeOptions;
    _queue: Queue;
    _schedulerInterval: number;

    constructor(
        mqttClient: MqttClient,
        options: IClientSubscribeOptions = defaultOptions,
        interval: number = 1000
    ) {
        this._mqttClient = mqttClient;
        this._mqttOptions = options;
        this._schedulerInterval = interval;
        this._queue = new Queue({ results: [] });
        this._queue.timeout = this._schedulerInterval;
        this._queue.autostart = true;

        this._queue.addEventListener('success', (result: any) => {
            if (logLevel !== 'info') {
                console.log('Queue processed: > ', result);
            }
        });

        this._queue.addEventListener('timeout', (e: any) => {
            if (logLevel !== 'info') {
                console.log(
                    'Queue timed out:',
                    e.detail.job.toString().replace(/\n/g, '')
                );
            }
            e.detail.next();
        });
    }

    /**
     * Method for starting queue processing
     */
    start = () => {
        this._queue.start((error) => {
            // This callback will be called when the queue processing encounters an error or
            // finished processing all the workers in the queue
            if (error !== undefined) {
                console.error(error);
            }
            if (logLevel !== 'info') {
                console.log('Queue finished processing:', this._queue.results);
            }
        });
    };

    /**
     * Method for adding a message to the queue
     * @param {string} topic
     * @param {string|Buffer} data message data
     */
    add = (topic: string, data: string | Buffer, options?: mqttConfigOptions): void => {
        this._queue.push((callback) => {
            this.publish(new Message(topic, data), options);
            if (logLevel !== 'info') {
                console.log('Added_To_Queue', `{topic: '${topic}', data: '${data}}'`);
            }
            if (callback !== undefined) {
                callback(undefined, data);
            }
        });
    };

    /**
     * Method for publishing a message in the queue
     * @param {Message} message message to be published
     */
    publish = (message: Message, options?: mqttConfigOptions) => {
        const topic = resolveChannelTopic(message.topic);
        
        if (logLevel !== 'info') {
            console.log(
                'MQTT_Publish >',
                message,
                'to topic:',
                topic,
                options
            );
        }
        this._mqttClient.publish(
            topic,
            message.data,
            options || {}
        );
    };

    /**
     * Method for stoping queue processing
     */
    stop = () => {
        this._queue.stop();
    };

    /**
     * Method for stoping and emptying the queue immediately
     * @param {any} error error description
     * @param {Function} callback callback function
     */
    end = (error: any, callback: Function) => {
        this._queue.end(error);
        callback();
    };
}
