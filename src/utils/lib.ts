const isNull = (x: unknown) => x === null;

const log = (...x: unknown[]) => console.log(...x);
const logDebug = (...x: unknown[]) => console.debug(...x);
const logError = (...x: unknown[]) => console.error(...x);

export { isNull, log, logDebug, logError };
