

/**
 * Returns a JSON string of all valid question categories from the 'Valid Question Categories' sheet.
 * @returns {string} A JSON string of all valid question categories.
 */
function getAllQuestionCategories() {
    const sheet = _getSheet('Valid Question Categories');
    const data = _getSheetData(sheet);
    const categories = data.slice(1).map(row => row[0]);
    return categories;
}

/**
 * Updates a question in the database.
 * @param {string} id - The ID of the question to update.
 * @param {string} text - The updated text of the question.
 * @param {string} category - The updated category of the question.
 * @param {boolean} hidden - The updated value of the hidden checkbox.
 * @throws {Error} Missing Question ID, Missing Question Text, Missing Question Category, Missing Hidden Checkbox Value, Invalid Question ID, Invalid Question Text, Invalid Question Category, Invalid Hidden Checkbox Value.
 */
async function updateQuestion(id, text, category, hidden) {
    if(!id) throw new Error('Missing Question ID');
    if(text === undefined) throw new Error('Missing Question Text');
    if(category === undefined) throw new Error('Missing Question Category');
    if(hidden === undefined) throw new Error('Missing Hidden Checkbox Value');
    id = parseInt(id);
    const existingQuestion = await validateValue('Question ID', id);
    return existingQuestion ? await _updateQuestion(id, text, category, hidden) : await _addQuestion(id, text, category, hidden);
}

/**
 * Updates the form with the given ID using the provided performance, one-to-one, and side-by-side values.
 * @param {string} id - The ID of the form to update.
 * @param {boolean} performance - The value of the performance checkbox.
 * @param {boolean} oneToOne - The value of the one-to-one checkbox.
 * @param {boolean} SideBySide - The value of the side-by-side checkbox.
 * @throws {Error} If any of the required parameters are missing.
 */
async function updateForm(id, performance, oneToOne, sideBySide) {
    if(!id) throw new Error('Missing Form ID');
    if(performance === undefined) throw new Error('Missing Performance Checkbox Value');
    if(oneToOne === undefined) throw new Error('Missing One-to-One Checkbox Value');
    if(sideBySide === undefined) throw new Error('Missing Side-by-Side Checkbox Value');
    return await _updateForm(id, performance, oneToOne, sideBySide);
}

/**
 * Returns an array of unused form objects.
 * @returns {Promise<Array<{id: number, name: string}>>} An array of unused form objects with id and name properties.
 */
async function getUnusedForms() {
    return await _getUnusedForms();
}

/**
 * Adds a form with the given ID.
 * @param {string} formId - The ID of the form to add.
 * @returns {Promise} A Promise that resolves when the form is added.
 * @throws {Error} If formId is missing.
 */
async function addForm(formId) {
    if(!formId) throw new Error('Missing Form ID');
    return await _addForm(formId);
}

/**
 * Removes a form with the given ID.
 * @param {string} formId - The ID of the form to remove.
 * @returns {Promise} A Promise that resolves when the form is successfully removed.
 * @throws {Error} If formId is missing.
 */
async function removeForm(formId) {
    if(!formId) throw new Error('Missing Form ID');
    return await _removeForm(formId);
}