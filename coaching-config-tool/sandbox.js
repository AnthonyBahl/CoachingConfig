/***********************************************************************************************************************
 * Validation Facotry.gs
 **********************************************************************************************************************/
/**
 * A factory object for creating validator objects based on the specified validator type.
 * @typedef {Object} ValidatorFactory
 * @property {function} createValidator - A function that creates a validator object based on the specified validator type.
 * @throws {Error} Invalid validator type.
 */
const validatorFactory = {
    /**
     * Creates a validator object based on the specified validator type.
     * @param {string} type - The type of validator to create.
     * @returns {Validator} A validator object.
     * @throws {Error} Invalid validator type.
     */
    createValidator(type) {
        switch (type) {
            case "Checkbox":
                return new BooleanValidator();
            case "Question Text":
                return new QuestionTextValidator();
            case "Question Category":
                return new QuestionCategoryValidator();
            case "Question ID":
                return new QuestionIdValidator();
            default:
                throw new Error("Invalid validator type!");
        }
    }
};

/**
 * Abstract base class for all validators.
 * @class
 * @abstract
 */
class Validator {
    /**
     * Validates the input field value.
     * @abstract
     * @param {HTMLInputElement} field - The input field to validate.
     * @returns {boolean} - True if the input field value is valid, false otherwise.
     * @throws {Error} - If the method is not implemented in a subclass.
     */
    validate(field) {
        throw new Error("Abstract method!");
    }
}

/**
 * A validator class for validating a boolean value
 * Extends the `Validator` class and overrides the `validate` method to validate a boolean value
 * @extends Validator
 */
class BooleanValidator extends Validator {
    /**
     * Validates a boolean value.
     * @param {boolean} value - The value to be validated.
     * @returns {boolean} - Returns true if the value is a boolean, otherwise false.
     */
    validate(value) {
        return value === true || value === false;
    }
}

/**
 * A validator class for validating the question name field.
 * Extends the `Validator` class and overrides the `validate` method to validate a question name value
 * @extends Validator
 */
class QuestionTextValidator extends Validator {
    /**
     * Validates a string value.
     * @param {string} value - The value to be validated.
     * @returns {boolean} - Returns true if the value is a string and its length is between 3 and 255 characters, otherwise returns false.
     */
    validate(value) {
        return typeof value === "string" && value.length >= 3 && value.length <= 255;
    }
}

/**
 * A validator class for validating the question category value
 * Extends the `Validator` class and overrides the `validate` method to validate a question category value
 * @extends Validator
 */
class QuestionCategoryValidator extends Validator {
    /**
     * Validates a string value.
     * @param {string} value - The value to be validated.
     * @returns {boolean} - Returns true if the value is a string and its length is between 3 and 255 characters, otherwise returns false.
     */
    validate(value) {
        const validCategories = getAllQuestionCategories();
        return validCategories.includes(value);
    }
}

/**
 * A validator class for validating the question ID value
 * Extends the `Validator` class and overrides the `validate` method to validate a question ID value
 * @extends Validator
 */
class QuestionIdValidator extends Validator {
    /**
     * Validates if the given value is a valid question ID.
     * @param {string} value - The value to be validated.
     * @returns {boolean} - Returns true if the value is a valid question ID, otherwise returns false.
     */
    validate(value) {
        const ID = parseInt(value);
        const IDs = _getQuestionIDs();
        return IDs.includes(ID);
    }
}

/**
 * A validator class for validating the form ID value
 * Extends the `Validator` class and overrides the `validate` method to validate a form ID value
 * @extends Validator
 */
class FormIdValidator extends Validator {
    /**
     * Validates if the given value is a valid form ID.
     * @param {string} value - The value to be validated.
     * @returns {boolean} - Returns true if the value is a valid form ID, otherwise returns false.
     */
    validate(value) {
        const ID = parseInt(value);
        const IDs = _getFormIDs();
        return IDs.includes(ID);
    }
}

function validateValue(type, ...values) {
    const validator = validatorFactory.createValidator(type);
    return validator.validate(...values);
}

/***********************************************************************************************************************
 * End Validation Facotry.gs
 **********************************************************************************************************************/

/***********************************************************************************************************************
 * Spreadsheet Access.gs
 **********************************************************************************************************************/

const CONFIG_SHEET_ID = '1uvJdzy_VV7c39cxspgQfnRKBPW2k8NaV_HCC-SoVPO8';
const LOCK_WAIT_TIME = 30000;

/**
 * Executes the given callback while managing a script lock.
 * @param {Function} callback - The callback to execute.
 * @throws {Error} If the script lock cannot be acquired or if an error occurs while executing the callback.
 */
function _withLock(callback) {
    const lock = LockService.getScriptLock();
    try {     
        lock.waitLock(LOCK_WAIT_TIME);
        callback();
    } catch (error) {
        Logger.log(error);
        throw error;
    } finally {
        lock.releaseLock();
    }
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
 * @returns {Array<number>} An array of question IDs.
 */
function _getQuestionIDs() {
    return _withLock(() => {
        const sheet = _getSheet('tbl_coaching_questions');
        const IDs = sheet.getRange("A3:A").getValues().flat().map(Number);
        return IDs;
    });
}

/**
 * Retrieves an array of form IDs from the "tbl_coaching_forms" sheet.
 * @returns {Array<number>} An array of form IDs.
 */
function _getFormIDs() {
    return _withLock(() => {
        const sheet = _getSheet('tbl_coaching_forms');
        const IDs = sheet.getRange("A3:A").getValues().flat().map(Number);
        return IDs;
    });
}

/**
 * Updates a coaching question in the database.
 * @param {number} questionId - The ID of the question to update.
 * @param {number} formId - The ID of the form the question belongs to.
 * @param {string} text - The text of the question.
 * @param {string} category - The category of the question.
 * @param {boolean} hidden - Whether the question is hidden or not.
 * @param {string} updatedBy - The name of the user who updated the question.
 * @param {Date} updatedOn - The date when the question was updated.
 * @returns {boolean} - Whether the update was successful or not.
 */
function updateQuestion(questionId, formId, text, category, hidden, updatedBy, updatedOn) {
    let success = false;
    const IDs = _getQuestionIDs();
    _withLock(() => {
        const sheet = _getSheet('tbl_coaching_questions');
        const IDs = sheet.getRange("A3:A").getValues().flat();
        const row = IDs.indexOf(question.id) + 3;
        const newRow = [questionId, formId, text, category, hidden, updatedBy, updatedOn];
        sheet.getRange(row, 1, 1, 7).setValues([newRow]);
        success = true;
    });
    return success;
}

/***********************************************************************************************************************
 * End Spreadsheet Access.gs
 **********************************************************************************************************************/

/***********************************************************************************************************************
 * APIv1.gs
 **********************************************************************************************************************/

/**
 * Returns the user ID corresponding to the given email address.
 * @param {string} email - The email address to search for.
 * @returns {number} The corresponding user ID as an integer.
 * @throws {Error} If no user ID is found for the given email address.
 */
function _getIdFromEmail(email) {
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
 * Returns a JSON string of all valid question categories from the 'Valid Question Categories' sheet.
 * @returns {string} A JSON string of all valid question categories.
 */
function getAllQuestionCategories() {
    const sheet = _getSheet('Valid Question Categories');
    const data = _getSheetData(sheet);
    const categories = data.slice(1).map(row => row[0]);
    return categories;
}

function updateQuestion(question) {
    const requiredProperties = ['id', 'formId', 'text', 'category', 'hidden'];
    // Verify that the question object has all required properties
    const missingProperties = requiredProperties.filter(property => !question.hasOwnProperty(property));
    if (missingProperties.length > 0) {
        throw new Error(`Missing required properties: ${missingProperties.join(', ')}`);
    }    
    if(!validateValue('Question ID', id)) throw new Error('Invalid Question ID');
    if(!validateValue('Form ID', formId)) throw new Error('Invalid Form ID');
    if(!validateValue('Question Text', text)) throw new Error('Invalid Question Text');
    if(!validateValue('Question Category', category)) throw new Error('Invalid Question Category');
    if(!validateValue('Checkbox', hidden)) throw new Error('Invalid Hidden Checkbox Value');
    _updateQuestion(question.id, question.formId, question.text, question.category, question.hidden, _getIdFromEmail(Session.getActiveUser().getEmail()), Utilities.formatDate(new Date(), 'EST', 'yyyy-MM-dd'));
    
}

function test() {
    const question = {
        id: '1',
        formId: '1',
        text: 'This is a test question',
        category: 'Test',
        hidden: false
    };
    updateQuestion(question);
}

/***********************************************************************************************************************
 * End APIv1.gs
 **********************************************************************************************************************/