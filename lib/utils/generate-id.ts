/**
 * Generates a random alphanumeric ID
 * @returns {string} A random string of 9 characters
 */
export const generateId = (): string => Math.random().toString(36).substr(2, 9);

export default generateId;
