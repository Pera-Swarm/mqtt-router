export const channel = process.env.MQTT_CHANNEL || 'beta';
export const logLevel = process.env.LOG_LEVEL || 'info';

export type mqttConfigOptions = {
    qos?: 0 | 1 | 2;
    retain?: boolean;
};
