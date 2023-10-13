/**
 * Handles HTTP GET requests to the API.
 * @param {GoogleAppsScript.Events.AppsScriptHttpRequestEvent} e - The HTTP request event object.
 * @returns {GoogleAppsScript.Content.TextOutput} - The response object.
 * @throws {Error} - Throws an error if the API path is invalid.
 */
function doGet(e) {
    try {
        const path = e.parameters.path[0] || "/";
        const paths = path.split("/").filter(Boolean);

        if (paths[0] !== 'api' || paths[1] !== 'v1') {
            throw new Error('Invalid API path');
        }
        Logger.log(`API Call: ${paths}`);
        return apiv1(paths.slice(2), e);
    } catch (error) {
        return formatForOutput({ error: error.message });
    }
}
