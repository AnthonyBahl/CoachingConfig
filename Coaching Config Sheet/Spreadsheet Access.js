const CONFIG_SHEET_ID = '1uvJdzy_VV7c39cxspgQfnRKBPW2k8NaV_HCC-SoVPO8';
const LOCK_WAIT_TIME = 180000; // 3 minutes
const QUESTIONS = {
    SHEET_NAME: 'tbl_coaching_questions',
    HEADER_ROWS: 2,
    ID_COL: 1,
    FORM_ID_COL: 2,
    TEXT_COL: 3,
    CATEGORY_COL: 4,
    HIDDEN_COL: 5,
    UPDATED_BY_COL: 6,
    UPDATED_ON_COL: 7,
    ROW_SPAN: 1,
    COL_SPAN: 7
};
const FORMS = {
    SHEET_NAME: 'tbl_coaching_forms',
    HEADER_ROWS: 2,
    ID_COL: 1,
    NAME_COL: 2,
    PERFORMANCE_COL: 3,
    ONE_TO_ONE_COL: 4,
    SIDE_BY_SIDE_COL: 5,
    UPDATED_BY_COL: 6,
    UPDATED_ON_COL: 7,
    ROW_SPAN: 1,
    COL_SPAN: 7
};
const FORMS_DB = {
    SHEET_NAME: 'forms',
    HEADER_ROWS: 1,
    ID_COL: 1,
    NAME_COL: 2,
    IS_ACTIVE_COL: 3,
    ROW_SPAN: 1,
    COL_SPAN: 3
};
const QUESTIONS_DB = {
    SHEET_NAME: 'questions',
    HEADER_ROWS: 1,
    ID_COL: 3,
    FORM_ID_COL: 1,
    VERSION_COL: 2,
    RANK_COL: 4,
    QUESTION_TYPE_COL: 5,
    ROW_SPAN: 1,
    COL_SPAN: 3
}

/**
 * Returns the ID of the current user based on their email address.
 * @returns {number} The ID of the current user.
 * @throws {Error} If no user ID is found for the current user's email address.
 */
function _getCurrentUserID() {
    const email = Session.getActiveUser().getEmail();
    const sheet = _getSheet('User IDs');
    const data = _getSheetData(sheet);
    // Loop through each row until the email is found in the second column. Return corresponding ID from first column.
    for (let i = 0; i < data.length; i++) {
        if (data[i][1] === email) {
            return parseInt(data[i][0]);
        }
    }
    throw new Error(`No user ID found for email: ${email}`);
}

/**
 * Executes the given callback while managing a script lock.
 * @param {Function} callback - The callback to execute.
 * @throws {Error} If the script lock cannot be acquired or if an error occurs while executing the callback.
 */
function _withLock(callback) {
    return new Promise((resolve, reject) => {
        const lock = LockService.getScriptLock();
        try {
            lock.waitLock(LOCK_WAIT_TIME);
            Promise.resolve(callback()).then(resolve).catch(reject);
        } catch (error) {
            Logger.log(error);
            reject(error);
        } finally {
            lock.releaseLock();
        }
    });
}


/**
 * Returns the sheet with the given name from the configuration spreadsheet.
 * @param {string} sheetName - The name of the sheet to retrieve.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} - The sheet with the given name.
 */
function _getSheet(sheetName) {
    const ss = SpreadsheetApp.openById(CONFIG_SHEET_ID);
    return ss.getSheetByName(sheetName);
}

/**
 * Adds a row to the specified sheet with the given data.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to add the row to.
 * @param {Array} data - The data to add to the row.
 */
function _addRow(sheet, data) {
    _withLock(() => {
        sheet.appendRow(data);
    });
}

/**
 * Retrieves the data from a given sheet.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to retrieve data from.
 * @returns {Array<Array<any>>} - The data from the sheet.
 */
function _getSheetData(sheet) {
    let data;
    _withLock(() => {
        data = sheet.getDataRange().getValues();
    });
    return data;
}

/**
 * Retrieves data from a specified range in a Google Sheets spreadsheet.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to retrieve data from.
 * @param {number} startRow - The starting row of the range to retrieve.
 * @param {number} startCol - The starting column of the range to retrieve.
 * @param {number} numRows - The number of rows to retrieve.
 * @param {number} numCols - The number of columns to retrieve.
 * @returns {Array<Array<any>>} The retrieved data.
 */
function _getRangeData(sheet, startRow, startCol, numRows, numCols) {
    let data;
    _withLock(() => {
        data = sheet.getRange(startRow, startCol, numRows, numCols).getValues();
    });
    return data;
}

/**
 * Retrieves an array of question IDs from the "tbl_coaching_questions" sheet.
 * @returns {Promise<Array<number>>} An array of question IDs.
 */
function _getQuestionIDs() {
    return _withLock(() => {
        const sheet = _getSheet(QUESTIONS.SHEET_NAME);
        IDs = sheet.getRange(QUESTIONS.HEADER_ROWS + 1, QUESTIONS.ID_COL, sheet.getLastRow() - QUESTIONS.HEADER_ROWS).getValues().map(row => row[0]);
        return IDs
    });
}

/**
 * Retrieves an array of form IDs from the "tbl_coaching_forms" sheet.
 * @returns {Promise<Array<number>>} An array of form IDs.
 */
function _getFormIDs() {
    return _withLock(() => {
        const sheet = _getSheet('tbl_coaching_forms');
        const IDs = sheet.getRange("A3:A").getValues().flat().map(Number);
        return IDs;
    });
}

/**
 * Returns the form ID associated with the given question ID.
 * @param {string} questionID - The ID of the question to retrieve the form ID for.
 * @returns {string} The form ID associated with the given question ID.
 */
function _getFormID(questionID) {
    return _withLock(() => {
        const sheet = _getSheet(QUESTIONS_DB.SHEET_NAME);
        // Find row with question ID
        const IDs = sheet.getRange(QUESTIONS_DB.HEADER_ROWS + 1, QUESTIONS_DB.ID_COL, sheet.getLastRow() - QUESTIONS_DB.HEADER_ROWS).getValues().map(row => row[0]);
        const row = IDs.indexOf(questionID) + QUESTIONS_DB.HEADER_ROWS + 1;
        // Get form ID from row
        const formID = sheet.getRange(row, QUESTIONS_DB.FORM_ID_COL).getValue();
        return formID;
    });
}

/**
 * Updates a coaching question in the database.
 * @param {number} questionId - The ID of the question to update.
 * @param {string} text - The text of the question.
 * @param {string} category - The category of the question.
 * @param {boolean} hidden - Whether the question is hidden or not.
 * @returns {Promise<void>} - Resolves if the update was successful, rejects with an error message otherwise.
 */
function _updateQuestion(questionId, text, category, hidden) {
    // Ensure all parameters are correct data types
    questionId = parseInt(questionId);
    text = text.toString();
    category = category.toString();
    hidden = Boolean(hidden);
    return new Promise((resolve, reject) => {
        if (!validateValue('Question ID', questionId)) throw new Error('Invalid Question ID');
        if (!validateValue('Question Text', text)) throw new Error('Invalid Question Text');
        if (!validateValue('Question Category', category)) throw new Error('Invalid Question Category');
        if (!validateValue('Checkbox', hidden)) throw new Error('Invalid Hidden Checkbox Value');
        _withLock(() => {
            const sheet = _getSheet(QUESTIONS.SHEET_NAME);
            const IDs = sheet.getRange(QUESTIONS.HEADER_ROWS + 1, QUESTIONS.ID_COL, sheet.getLastRow() - QUESTIONS.HEADER_ROWS).getValues().map(row => row[0]);
            const row = IDs.indexOf(questionId) + QUESTIONS.HEADER_ROWS + 1;
            const formId = sheet.getRange(row, 2).getValue();
            const updatedBy = _getCurrentUserID();
            const updatedOn = Utilities.formatDate(new Date(), 'EST', 'yyyy-MM-dd');
            const newRow = [questionId, formId, text, category, hidden, updatedBy, updatedOn];
            sheet.getRange(row, QUESTIONS.ID_COL, QUESTIONS.ROW_SPAN, QUESTIONS.COL_SPAN).setValues([newRow]);
            resolve();
        });
    });
}

/**
 * Updates the coaching form with the given formId and values for performance, oneToOne, and SideBySide checkboxes.
 * @param {string} formId - The ID of the coaching form to update.
 * @param {boolean} performance - The value of the performance checkbox.
 * @param {boolean} oneToOne - The value of the one-to-one checkbox.
 * @param {boolean} SideBySide - The value of the side-by-side checkbox.
 * @returns {Promise<void>} - Resolves if the update was successful, rejects with an error otherwise.
 */
function _updateForm(formId, performance, oneToOne, SideBySide) {
    // Ensure all parameters are correct data types
    formId = parseInt(formId);
    performance = Boolean(performance);
    oneToOne = Boolean(oneToOne);
    SideBySide = Boolean(SideBySide);
    return new Promise((resolve, reject) => {
        if (!validateValue('Checkbox', performance)) throw new Error(new Error('Invalid Performance Checkbox Value'));
        if (!validateValue('Checkbox', oneToOne)) throw new Error(new Error('Invalid One-to-One Checkbox Value'));
        if (!validateValue('Checkbox', SideBySide)) throw new Error(new Error('Invalid Side-by-Side Checkbox Value'));
        _withLock(() => {
            const sheet = _getSheet('tbl_coaching_forms');
            const IDs = sheet.getRange(FORMS.HEADER_ROWS + 1, FORMS.ID_COL, sheet.getLastRow() - FORMS.HEADER_ROWS).getValues().map(row => row[0]);
            const row = IDs.indexOf(formId) + FORMS.HEADER_ROWS + 1;
            const updatedBy = _getCurrentUserID();
            const updatedOn = Utilities.formatDate(new Date(), 'EST', 'yyyy-MM-dd');
            const formName = sheet.getRange(row, FORMS.NAME_COL).getValue();
            const newRow = [formId, formName, performance, oneToOne, SideBySide, updatedBy, updatedOn];
            sheet.getRange(row, FORMS.ID_COL, FORMS.ROW_SPAN, FORMS.COL_SPAN).setValues([newRow]);
            resolve();
        });
    });
}

/**
 * Returns an array of unused forms.
 * @returns {Promise<Array<{id: string, name: string}>>} An array of unused forms, where each form is an object with an id and a name.
 */
async function _getUnusedForms() {
    const activeForms = await _getFormIDs();
    const formData = await _withLock(() => {
        const sheet = _getSheet(FORMS_DB.SHEET_NAME);
        const values = sheet.getRange(FORMS_DB.HEADER_ROWS + 1, FORMS_DB.ID_COL, sheet.getLastRow() - FORMS_DB.HEADER_ROWS, 2).getValues();
        return values;
    });
    const unusedForms = formData.map(([id, name]) => ({ id, name })).filter(form => !activeForms.includes(form.id));
    return unusedForms;
}

/**
 * Adds a new form to the spreadsheet with the given form ID.
 * @param {number} formId - The ID of the form to add.
 * @throws {Error} If the form ID is invalid or already exists in the spreadsheet.
 * @returns {Promise<void>} A Promise that resolves when the form has been added.
 */
async function _addForm(formId) {
    const parsedFormId = parseInt(formId);
    if (!validateValue('Form ID', parsedFormId)) throw new Error('Invalid Form ID.');    
    const existingFormIds = await _getFormIDs();
    if (existingFormIds.includes(parsedFormId)) throw new Error(`Form ID ${parsedFormId} already exists.`);
    return await _withLock(() => {
        const sheet = _getSheet(FORMS_DB.SHEET_NAME);
        const values = sheet.getRange(FORMS_DB.HEADER_ROWS + 1, FORMS_DB.ID_COL, sheet.getLastRow() - FORMS_DB.HEADER_ROWS, 2).getValues();
        const [forminfo] = values.filter(([id]) => id === parsedFormId);
        const [name] = forminfo.slice(1);
        const newRow = [parsedFormId, name, false, false, false, _getCurrentUserID(), Utilities.formatDate(new Date(), 'EST', 'yyyy-MM-dd')];
        const targetSheet = _getSheet(FORMS.SHEET_NAME);
        targetSheet.appendRow(newRow);
    });
}

async function _addQuestion(questionId, text, category, hidden) {
    // Ensure all parameters are correct data types
    questionId = parseInt(questionId);
    text = text.toString();
    category = category.toString();
    hidden = Boolean(hidden);    
    const sheet = await _getSheet(QUESTIONS.SHEET_NAME);
    const formId = await _getFormID(questionId);
    const updatedBy = await _getCurrentUserID();
    return new Promise((resolve, reject) => {
        if (!validateValue('Question Text', text)) throw new Error('Invalid Question Text');
        if (!validateValue('Question Category', category)) throw new Error('Invalid Question Category');
        if (!validateValue('Checkbox', hidden)) throw new Error('Invalid Hidden Checkbox Value');
        _withLock(() => {
            const updatedOn = Utilities.formatDate(new Date(), 'EST', 'yyyy-MM-dd');
            const newRow = [questionId, formId, text, category, hidden, updatedBy, updatedOn];
            sheet.appendRow(newRow);
            resolve();
        });
    });
}

/**
 * Removes a form with the given ID from the sheet.
 * @param {string} formId - The ID of the form to remove.
 * @throws {Error} If the form ID is invalid or does not exist.
 * @returns {Promise<void>} A Promise that resolves when the form is successfully removed.
 */
async function _removeForm(formId) {
    const parsedFormId = parseInt(formId);
    if (!validateValue('Form ID', parsedFormId)) throw new Error('Invalid Form ID.');
    const existingFormIds = await _getFormIDs();
    if (!existingFormIds.includes(parsedFormId)) throw new Error(`Form ID ${parsedFormId} does not exist.`);
    return await _withLock(() => {
        const sheet = _getSheet(FORMS.SHEET_NAME);
        const IDs = sheet.getRange(FORMS.HEADER_ROWS + 1, FORMS.ID_COL, sheet.getLastRow() - FORMS.HEADER_ROWS).getValues().map(row => row[0]);
        const row = IDs.indexOf(parsedFormId) + FORMS.HEADER_ROWS + 1;
        sheet.deleteRow(row);
    });
}