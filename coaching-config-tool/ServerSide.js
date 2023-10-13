
let COACHING_SHEET;

/**
 * Initializes the script properties.
 * @async
 * @returns {Promise<string>} Resolves with COACHING_SHEET if successful, rejects otherwise.
 */
async function initialize() {
    return new Promise(async (resolve, reject) => {
        COACHING_SHEET = PropertiesService.getScriptProperties().getProperty('coachingConfigSheet');
        if (COACHING_SHEET) {
            try {
                await getAndSaveExpectationTypes();
                resolve(COACHING_SHEET);
            } catch (err) {
                reject(err);
            }
        } else {
            reject(new Error("Failed to get COACHING_SHEET"));
        }
    });
}

/**
 * Retrieves and saves valid expectation types from the sheet.
 * @throws {Error} If any error occurs during operation.
 */
function getAndSaveExpectationTypes() {
    try {
        const ss = SpreadsheetApp.openById(COACHING_SHEET);
        const sheet = ss.getSheetByName("Valid Expectation Types");
        const data = sheet.getRange(2, 1, sheet.getLastRow() - 1).getValues();
        const standardArray = data.map(row => row[0]);

        PropertiesService.getScriptProperties().setProperty("EXPECTATION_TYPES", JSON.stringify(standardArray));
    } catch (error) {
        throw error;
    }
}

/**
 * Gets the saved expectation types.
 * @async
 * @returns {string|null} The saved expectation types or null.
 * @throws {Error} If unable to get expectation types.
 */
async function getExpectationTypes() {
    if (!COACHING_SHEET) {
        try {
            await initialize();
        } catch (err) {
            AlertBuilder.handleError(err);
        }
    }
    try {
        return PropertiesService.getScriptProperties().getProperty('EXPECTATION_TYPES');
    } catch (error) {
        throw new Error("Unable to get expectation types");
    }
}

/**
 * Populates data from a given Google Spreadsheet sheet.
 * 
 * @param {string} sheetName - The name of the sheet to read.
 * @param {number} skipRows - The number of rows to skip.
 * @param {number} columnCount - The number of columns to read.
 * @param {function} callback - The callback function to handle each row.
 * @returns {object} - The populated data.
 */
async function populateData(sheetName, skipRows, columnCount, callback) {
    if (!COACHING_SHEET) {
        try {
            await initialize();
        } catch (err) {
            throw err;
        }
    }

    var sheet = SpreadsheetApp.openById(COACHING_SHEET).getSheetByName(sheetName);
    var rows = sheet.getRange(skipRows + 1, 1, sheet.getLastRow() - skipRows, columnCount).getValues();
    var data = {};

    for (var i = 0; i < rows.length; i++) {
        callback(data, rows[i]);
    }

    return data;
}

/**
 * Generates a JSON string containing multiple sets of data from different Google Spreadsheet sheets.
 *
 * @returns {string} - The stringified JSON object containing the collected data.
 */
async function generateJSON() {
    // Initialize data objects
    var employeeData = {};
    var workgroupData = {};
    var jobProfileData = {};
    var expectationData = {};
    var formData = {};
    var questionData = {};

    // Populate employeeData, workgroupData, jobProfileData
    await populateData('Employee', 1, 9, function (data, row) {
        var id = row[0];
        employeeData[id] = {
            name: row[1],
            level: row[3],
            workgroupId: row[4],
            jobProfileId: row[6],
            samAccountName: row[8],
            email: row[2]
        };
        workgroupData[row[4]] = row[5];
        jobProfileData[row[6]] = row[7];
    });

    // Populate expectationData
    expectationData = await populateData('tbl_coaching_expectations', 2, 13, function (data, row) {
        var id = row[0];
        data[id] = {
            resourceId: row[1],
            performance: row[2],
            oneToOne: row[3],
            sideBySide: row[4],
            startDate: row[5],
            endDate: row[6],
            expectationType: row[7],
            active: row[8],
            createdBy: row[9],
            createdDate: row[10],
            modifiedBy: row[11],
            modifiedDate: row[12]
        };
    });

    // Populate formData
    var tblCoachingFormsData = await populateData('tbl_coaching_forms', 2, 7, function (data, row) {
        data[row[0]] = row;
    });

    // Populate formData
    formData = await populateData('forms', 1, 2, function (data, row) {
        var id = row[0];
        var tblRow = tblCoachingFormsData[id] || [];
        data[id] = {
            id: id,
            name: row[1],
            versions: [],  // Placeholder for versions which will be populated later
            performanceCoaching: tblRow[2],
            oneToOne: tblRow[3],
            sideBySide: tblRow[4],
            modifiedBy: tblRow[5],
            modifiedDate: tblRow[6],
            questions: []  // Placeholder for questions which will be nested later
        };
    });

    // Populate questionData
    var tblCoachingQuestionsData = await populateData('tbl_coaching_questions', 2, 7, function (data, row) {
        data[row[0]] = row;
    });

    // Populate questionData
    questionData = await populateData('questions', 1, 5, function (data, row) {
        var formId = row[0];
        var tblRow = tblCoachingQuestionsData[row[2]] || [];
        var question = {
            id: row[2],
            version: row[1],
            rank: row[3],
            text: tblRow[2],
            type: row[4],
            category: tblRow[3],
            hidden: tblRow[4],
            modifiedBy: tblRow[5],
            modifiedDate: tblRow[6]
        };
        if (formData[formId]) {
            formData[formId].questions.push(question);
        }
    });


    // Iterate through formData to populate the versions array
    for (var formId in formData) {
        var form = formData[formId];
        var versionsSet = new Set();  // Use a Set to ensure distinct versions
        for (var i = 0; i < form.questions.length; i++) {
            versionsSet.add(form.questions[i].version);
        }
        form.versions = [...versionsSet];
    }

    // Get the current date and time
    var datePulled = new Date().toISOString();

    // Create the final JSON object
    var finalObject = {
        employeeData: employeeData,
        workgroupData: workgroupData,
        jobProfileData: jobProfileData,
        expectationData: expectationData,
        formData: formData,

        datePulled: datePulled
    };

    return JSON.stringify(finalObject);
}

/**
 * Retrieves the employee ID of the person actively using the tool.
 * @async
 * @returns {number} The employee ID.
 * @throws Will throw an error if the employee ID could not be found.
 */
async function getUserEmID() {
    if (!COACHING_SHEET) {
        try {
            await initialize();
        } catch (err) {
            throw err;
        }
    }

    const sheet = SpreadsheetApp.openById(COACHING_SHEET).getSheetByName('Employee');
    const emailCol = sheet.getRange('C:C').getValues().flat();
    const emIDCol = sheet.getRange('A:A').getValues().flat();

    const email = Session.getActiveUser().getEmail();
    const index = emailCol.indexOf(email);
    const emID = index !== -1 ? emIDCol[index] : null;

    if (!emID) {
        throw new Error("Employee ID not found.");
    }

    return emID;
}

/**
 * Updates the "Modified By" and "Modification Date" columns in a sheet.
 * @param {object} sheet - The sheet to update.
 * @param {number} rowToEdit - The row number to edit.
 * @param {number} emIdColumn - The column number for the Employee ID.
 * @param {number} dateColumn - The column number for the date.
 */
async function updateModifiedBy(sheet, rowToEdit, emIdColumn, dateColumn) {
    const currentDate = Utilities.formatDate(new Date(), "EST", "yyyy-MM-dd");
    const emId = await getUserEmID();
    sheet.getRange(rowToEdit, emIdColumn).setValue(emId);
    sheet.getRange(rowToEdit, dateColumn).setValue(currentDate);
}

/**
 * Sets the 'active' status of an expectation.
 * @param {number|string} expectationId - The ID of the expectation.
 * @param {boolean} isActive - The active status.
 * @throws Will throw an error if the expectation ID could not be found.
 */
async function setExpectationStatus(expectationId, isActive) {
    if (!COACHING_SHEET) {
        try {
            await initialize();
        } catch (err) {
            throw err;
        }
    }

    const sheet = SpreadsheetApp.openById(COACHING_SHEET).getSheetByName('tbl_coaching_expectations');
    const idColumn = sheet.getRange(3, 1, sheet.getLastRow() - 2).getValues().flat();
    const rowToEdit = idColumn.findIndex(id => Number(id) === Number(expectationId)) + 3;

    if (isActive) {
        const expectationDetails = sheet.getRange(rowToEdit, 2, 1, 7).getValues();
        Logger.log(expectationDetails);
        const isValid = await checkForOverlap(expectationDetails[0][0], expectationDetails[0][6], expectationDetails[0][4], expectationDetails[0][5]);
        Logger.log(isValid);
        if (isValid !== -1) {
            throw new Error(`Could not update expectation archive status for ID: ${expectationDetails[0][0]} due to conflicting expectation. Search id{${isValid}}`);
        }
    }

    if (rowToEdit >= 3) {
        sheet.getRange(rowToEdit, 9).setValue(isActive);
        updateModifiedBy(sheet, rowToEdit, 12, 13);
    } else {
        throw new Error(`Expectation ID (${expectationId}) not found.`);
    }
}

/**
* Validates an expectation object's properties.
* @param {Object} expectation - The expectation object to validate.
* @returns {Promise} A promise that resolves if validation is successful, otherwise rejects.
*/
async function validateExpectation(expectation) {
    Logger.log(`Validating expectation: ${JSON.stringify(expectation)}`);
    return new Promise((resolve, reject) => {
        if (
            typeof expectation.performance === 'number' && expectation.performance >= 0 &&
            typeof expectation.oneToOne === 'number' && expectation.oneToOne >= 0 &&
            typeof expectation.sideBySide === 'number' && expectation.sideBySide >= 0 &&
            new Date(expectation.startDate) >= new Date('1/1/1990') &&
            new Date(expectation.endDate) <= new Date('12/31/3000') &&
            new Date(expectation.endDate) >= new Date(expectation.startDate)
        ) {
            resolve();
        } else {
            reject(new Error('Validation failed.'));
        }
    });
}

/**
 * Updates expectation data on the coaching sheet.
 * @param {number} expectationId - The ID of the expectation to update.
 * @param {Object} expectation - The new data for the expectation.
 * @throws {Error} Throws an error if initialization or validation fails.
 */
async function updateExpectationData(expectationId, expectation) {
    if (!COACHING_SHEET) {
        await initialize();
    }

    await validateExpectation(expectation);

    const sheet = SpreadsheetApp.openById(COACHING_SHEET).getSheetByName('tbl_coaching_expectations');
    const idColumn = sheet.getRange(3, 1, sheet.getLastRow() - 2).getValues().flat();
    const rowToEdit = idColumn.findIndex(id => Number(id) === Number(expectationId)) + 3;

    if (rowToEdit >= 3) {
        const {
            resourceId,
            performance,
            oneToOne,
            sideBySide,
            startDate,
            endDate,
            expectationType,
            active
        } = expectation;

        const updatedRow = [
            resourceId,
            performance,
            oneToOne,
            sideBySide,
            startDate,
            endDate,
            expectationType,
            active
        ];

        const isValid = await checkForOverlap(resourceId, expectationType, startDate, endDate, expectationId);

        if (isValid !== -1) {
            throw new Error(`Could not update expectation info for ID: ${resourceId} due to conflicting expectation. Search id{${isValid}}`);
        }

        sheet.getRange(rowToEdit, 2, 1, updatedRow.length).setValues([updatedRow]);
        updateModifiedBy(sheet, rowToEdit, 12, 13);
    } else {
        throw new Error(`Expectation ID (${expectationId}) not found.`);
    }
}

/**
 * Checks if a new expectation has overlapping start and end dates with existing, active expectations
 * that have the same resource ID and expectation type.
 *
 * @async
 * @param {string|number} resourceId - The ID of the resource.
 * @param {string} expectationType - The type of expectation.
 * @param {Date} startDate - The start date of the new expectation.
 * @param {Date} endDate - The end date of the new expectation.
 * @param {string|number} ignoreId -  Expectation ID to ignore.
 * @returns {Promise<boolean>} - Returns `true` if there is no overlap, `false` otherwise.
 */
// Function to check for overlapping date ranges
async function checkForOverlap(resourceId, expectationType, startDate, endDate, ignoreId = -1) {
    const sheet = SpreadsheetApp.openById(COACHING_SHEET).getSheetByName('tbl_coaching_expectations');
    const data = sheet.getRange(3, 1, sheet.getLastRow() - 2, 9).getValues();

    const newIgnoreId = parseInt(ignoreId);
    // Convert new dates to Date objects
    const newStartDate = new Date(startDate);
    const newEndDate = new Date(endDate);
    Logger.log(`resourceId is: ${resourceId}`);
    Logger.log(`expectationType is: ${expectationType}`);
    Logger.log(`startDate is: ${startDate}`);
    Logger.log(`endDate is: ${endDate}`);
    for (const row of data) {
        const expectationId = row[0];
        const existingResourceId = row[1];
        const existingStartDate = new Date(row[5]);
        const existingEndDate = new Date(row[6]);
        const existingExpectationType = row[7];
        const isActive = row[8];
        Logger.log(`Comparing to Id: ${existingResourceId}, Type: ${existingExpectationType}, startDate: ${existingStartDate}, endDate: ${existingEndDate}`);
        Logger.log(`Ignore ID is: ${ignoreId} with type ${typeof ignoreId} and this expectation ID is ${expectationId} with type ${typeof expectationId}`);
        // Check if active, same resource ID and same expectation type
        if (isActive && existingResourceId === resourceId && existingExpectationType === expectationType && expectationId !== newIgnoreId) {
            if ((newStartDate >= existingStartDate && newStartDate <= existingEndDate) ||
                (newEndDate >= existingStartDate && newEndDate <= existingEndDate) ||
                (newStartDate <= existingStartDate && newEndDate >= existingEndDate)) {
                return expectationId;
            }
        }
    }
    return -1;
}





/**
* Adds new expectation data to the coaching sheet.
* @param {Object} expectation - The new data for the expectation.
* @throws {Error} Throws an error if initialization or validation fails.
*/
async function addNewExpectation(expectation) {
    if (!COACHING_SHEET) {
        await initialize();
    }

    const {
        resourceId,
        performance,
        oneToOne,
        sideBySide,
        startDate,
        endDate,
        expectationType,
        active
    } = expectation;

    const isValid = await checkForOverlap(resourceId, expectationType, startDate, endDate);

    if (isValid !== -1) {
        throw new Error(`Could not add new expectation for ID: ${resourceId} due to conflicting expectation. Search id{${isValid}}`);
    }

    const sheet = SpreadsheetApp.openById(COACHING_SHEET).getSheetByName('tbl_coaching_expectations');
    const idColumn = sheet.getRange(3, 1, sheet.getLastRow() - 2).getValues().flat();
    const newId = Math.max(...idColumn.map(Number)) + 1;

    const newRow = [
        newId,
        resourceId,
        performance,
        oneToOne,
        sideBySide,
        startDate,
        endDate,
        expectationType,
        active
    ];

    sheet.appendRow(newRow);
    const lastRow = sheet.getLastRow();
    updateModifiedBy(sheet, lastRow, 10, 11);
    return newId;
}

async function getFormData() {
    var formData = {};

    // Populate formData
    var tblCoachingFormsData = await populateData('tbl_coaching_forms', 2, 7, function (data, row) {
        data[row[0]] = row;
    });

    // Populate formData
    formData = await populateData('forms', 1, 2, function (data, row) {
        var id = row[0];
        var tblRow = tblCoachingFormsData[id] || [];
        data[id] = {
            id: id,
            name: row[1],
            versions: [],  // Placeholder for versions which will be populated later
            performanceCoaching: tblRow[2],
            oneToOne: tblRow[3],
            sideBySide: tblRow[4],
            modifiedBy: tblRow[5],
            modifiedDate: tblRow[6],
            questions: []  // Placeholder for questions which will be nested later
        };
    });

    // Populate questionData
    var tblCoachingQuestionsData = await populateData('tbl_coaching_questions', 2, 7, function (data, row) {
        data[row[0]] = row;
    });

    // Populate questionData
    questionData = await populateData('questions', 1, 5, function (data, row) {
        var formId = row[0];
        var tblRow = tblCoachingQuestionsData[row[2]] || [];
        var question = {
            id: row[2],
            version: row[1],
            rank: row[3],
            text: tblRow[2],
            type: row[4],
            category: tblRow[3],
            hidden: tblRow[4],
            modifiedBy: tblRow[5],
            modifiedDate: tblRow[6]
        };
        if (formData[formId]) {
            formData[formId].questions.push(question);
        }
    });


    // Iterate through formData to populate the versions array
    for (var formId in formData) {
        var form = formData[formId];
        var versionsSet = new Set();  // Use a Set to ensure distinct versions
        for (var i = 0; i < form.questions.length; i++) {
            versionsSet.add(form.questions[i].version);
        }
        form.versions = [...versionsSet];
    }

    return formData;
}