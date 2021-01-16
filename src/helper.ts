import { Route } from './router';
import { channel } from './config';
/**
 * function for wrapping a n array of objects
 * this will add a property to the handler function in each route object
 * @param {Route[]} routes
 * @param {any} property
 */
export const wrapper = (routes: Route[], property: any) => {
    let wrappedRoutes: Route[] = [];

    routes.map((item) => {
        wrappedRoutes.push({
            ...item,
            handler: (msg: string) => item.handler(msg, property)
        });
    });

    return wrappedRoutes;
};

/**
 * method for resolving mqtt topic channel
 * @param {string} topic messagae topic
 * @description merge the MQTT_CHANNEL environment variable with the given topic properly and returns it
 */
export const resolveChannelTopic = (topic: string) => {
    const mergedTopic = channel + topic;
    var result: string;
    if (typeof topic !== 'string') {
        console.error('Invalid topic');
        return channel;
    } else {
        const mergedFC = channel + topic[0];
        if (channel.includes('/') && topic[0].includes('/')) {
            result = mergedTopic.replace('//', '/');
        } else if (!mergedFC.includes('/')) {
            result = channel + '/' + topic;
        } else {
            result = channel + topic;
        }
        return result;
    }
};

/**
 * Generates a cron interval called in given seconds
 * @param {number} frequency in seconds
 */
export const secondsInterval = (freq: number) => {
    return '*/' + freq + ' * * * * *';
};

/**
 * Generates a cron interval called in given minutes
 * @param {number} frequency in minutes
 */
export const minutesInterval = (freq: number) => {
    return '*/' + freq + ' * * * *';
};
