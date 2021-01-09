import { Route } from './router';
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
