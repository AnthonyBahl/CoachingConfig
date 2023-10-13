/**
 * An array to hold function calls and their parameters.
 * @type {Array<Object>}
 */
let functionQueue = [];

/**
 * A flag to indicate if the queue is currently being processed.
 * @type {boolean}
 */
let isProcessing = false;

/**
 * Enqueues a function call for later execution.
 *
 * @async
 * @param {string} functionName - The name of the function to call.
 * @param {...*} params - The parameters to pass to the function.
 */
async function enqueue(functionName, ...params) {
  logActivity('Function sent to Queue (' + functionName + ')');
  functionQueue.push({ functionName, params });

  if (!isProcessing) {
    isProcessing = true;
    await processQueue();
    isProcessing = false;
  }
}

/**
 * Processes the function queue, executing functions one by one.
 *
 * @async
 */
async function processQueue() {
  while (functionQueue.length > 0) {
    const { functionName, params } = functionQueue.shift();

    if (typeof this[functionName] === 'function') {
      try {
        await this[functionName](...params);
      } catch (error) {
        Logger.log(`Error while executing ${functionName}: ${error}`);
        throw error;
      }
    } else {
      Logger.log(`Function ${functionName} does not exist.`);
      throw new Error(`Function ${functionName} does not exist.`);
    }
  }
}
