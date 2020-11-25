/**
 * function for wrapping a n array of objects
 * this will add a property to the handler function in each route object
 * @param {object[]} routes
 * @param {object|function} property
 */
const wrapper = (routes, property) => {
    let wrappedRoutes = [];

    routes.map((item) => {
        wrappedRoutes.push({
            ...item,
            handler: (msg) => item.handler(msg, property)
        });
    });

    return wrappedRoutes;
};

module.exports = { wrapper };
