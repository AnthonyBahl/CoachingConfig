/**
 * Object containing HTML entities and their corresponding regex and value for decoding.
 * @type {Object.<string, {regex: RegExp, value: string}>}
 */
const entities = {
  '&lt;': { regex: /&lt;/g, value: '<' },
  '&gt;': { regex: /&gt;/g, value: '>' },
  '&amp;': { regex: /&amp;/g, value: '&' },
  '&quot;': { regex: /&quot;/g, value: '"' },
  '&apos;': { regex: /&apos;/g, value: "'" },
  '&#34;': { regex: /&#34;/g, value: '"' }
};

/**
 * Decodes HTML entities in a given input string.
 * @param {string} input - The input string to decode.
 * @returns {string} The decoded string.
 */
function decodeHtmlEntities(input) {
  for (let entity in entities) {
    input = input.replace(entities[entity].regex, entities[entity].value);
  }
  return input;
}

/**
 * Retrieves form data and populates it with questions and versions.
 * @returns {Promise<Object>} A promise that resolves to an object containing form data.
 */
async function getFormData() {
  try {
    let formData = {};

    // Get formData
    const tblCoachingFormsData = await populateData('tbl_coaching_forms', 2, 7, function (data, row) {
      data[row[0]] = row;
    });

    // Populate formData
    formData = await populateData('forms', 1, 2, function (data, row) {
      const id = row[0];
      const tblRow = tblCoachingFormsData[id] || [];
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
    const tblCoachingQuestionsData = await populateData('tbl_coaching_questions', 2, 7, function (data, row) {
      data[row[0]] = row;
    });

    // Populate questionData
    questionData = await populateData('questions', 1, 5, function (data, row) {
      const formId = row[0];
      const tblRow = tblCoachingQuestionsData[row[2]] || [];
      const question = {
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
    for (const formId in formData) {
      let form = formData[formId];
      let versionsSet = new Set();  // Use a Set to ensure distinct versions
      for (let i = 0; i < form.questions.length; i++) {
        versionsSet.add(form.questions[i].version);
      }
      form.versions = [...versionsSet];
    }

    return formData;
  } catch (error) {
    console.error("Error in getFormData():", error);
    throw error;
  }
}

/**
 * Generates HTML table rows for each question in the question data.
 * @param {Object[]} questions - An array of question data objects.
 * @returns {string} The HTML table rows for each question.
 */
function generateQuestionRows(questions, questionCategories, isEditor, currentVersion) {
  // Sort questions by rank in ascending order
  questions.sort((a, b) => a.rank - b.rank);
  let questionRows = '';
  questions.forEach((question) => {
    const rowClass = question.version !== currentVersion ? 'd-none' : '';
    const questionText = question.type === 'Agent Name Validation' ? 'Agent Name' : question.text ? question.text : `Question ID: ${question.id}`;
    questionRows += `
    <tr class="${rowClass} question" data-id="${question.id}" data-version-id="${question.version}">
      <td class="col-6">
        ${isEditor ? `
        <input type="text" class="form-control question-text" data-value="${questionText}" value="${questionText}"${question.type === 'Agent Name Validation' ? ' disabled' : ''}>
        <small class="form-text text-muted text-danger question-help-block d-none">
          Questions are limited to 255 characters.
        </small>
        ` : questionText}
      </td>
      <td class="col-2 text-center align-middle">${question.type}</td>
      <td class="col-2 text-center align-middle">${isEditor && question.type !== 'Agent Name Validation' ? `
        <select class="form-select category-select" data-value="${question.category}">
          <option></option>
          ${questionCategories.map(category =>
          `<option ${category === question.category ? 'selected' : ''}>${category}</option>`
          )}
        </select>` : isEditor ? question.type : question.category ? question.category : ''}
      </td>
      <td class="text-center">
        ${generateCheckbox(question.hidden || question.type === 'Agent Name Validation',
                          isEditor && question.type !== 'Agent Name Validation',
                          'hidden-check')}
      </td>
      <td class="text-center">
        <button class="btn btn-outline-success save-question d-none" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
            <path d="M819.999-671.538v459.229q0 30.308-21 51.308t-51.308 21H212.309q-30.308 0-51.308-21t-21-51.308v-535.382q0-30.308 21-51.308t51.308-21h459.229l148.461 148.461ZM760-646 646-760H212.309q-5.385 0-8.847 3.462-3.462 3.462-3.462 8.847v535.382q0 5.385 3.462 8.847 3.462 3.462 8.847 3.462h535.382q5.385 0 8.847-3.462 3.462-3.462 3.462-8.847V-646ZM480-269.233q41.538 0 70.768-29.23 29.231-29.231 29.231-70.768 0-41.538-29.231-70.769-29.23-29.23-70.768-29.23T409.232-440q-29.231 29.231-29.231 70.769 0 41.537 29.231 70.768 29.23 29.23 70.768 29.23ZM255.386-564.616h328.459v-139.998H255.386v139.998ZM200-646V-200-760v114Z"/>
          </svg>
        </button>
      </td>
    </tr>
  `;
  });
  return questionRows;
}

/**
 * Generates HTML table rows for each form in the form data.
 * @param {Object[]} formData - An array of form data objects.
 * @param {boolean} isEditor - A boolean indicating whether the user is an editor.
 * @returns {string} The HTML table rows for each form.
 */
function generateFormRows(formData, questionCategories, isEditor) {
  let formRows = '';
  formData.forEach((form, index) => {
    let currentVersion = form.versions.sort((a, b) => b - a)[0];
    formRows += `
    <tr class="form-row" data-id="${form.id}">
      <td class="question-toggle">
        <button class="btn btn-link p-0">
          <svg width="24" height="24">
            <use xlink:href="#expand" />
          </svg>
        </button>
      </td>
      <td class="text-center">${form.id}</td>
      <td>${form.name}</td>
      <td class="d-flex justify-content-center">
        <select class="form-select text-sm version-select">
          ${generateOptions(form.versions, currentVersion)}
        </select>
      </td>
      <td class="text-center">${generateCheckbox(form.performanceCoaching, isEditor, 'performance-check')}</td>
      <td class="text-center">${generateCheckbox(form.oneToOne, isEditor, 'onetoOne-check')}</td>
      <td class="text-center">${generateCheckbox(form.sideBySide, isEditor, 'sideBySide-check')}</td>
      <td>${isEditor ? `
        <button class="btn btn-outline-danger delete-form">
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
            <path class="path-danger" d="M292.309-140.001q-29.923 0-51.115-21.193-21.193-21.192-21.193-51.115V-720h-40v-59.999H360v-35.384h240v35.384h179.999V-720h-40v507.691q0 30.308-21 51.308t-51.308 21H292.309ZM680-720H280v507.691q0 5.385 3.462 8.847 3.462 3.462 8.847 3.462h375.382q4.616 0 8.463-3.846 3.846-3.847 3.846-8.463V-720ZM376.155-280h59.999v-360h-59.999v360Zm147.691 0h59.999v-360h-59.999v360ZM280-720v520-520Z"/>
          </svg>
        </button>
        <button class="btn btn-outline-success save-form d-none" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
            <path d="M819.999-671.538v459.229q0 30.308-21 51.308t-51.308 21H212.309q-30.308 0-51.308-21t-21-51.308v-535.382q0-30.308 21-51.308t51.308-21h459.229l148.461 148.461ZM760-646 646-760H212.309q-5.385 0-8.847 3.462-3.462 3.462-3.462 8.847v535.382q0 5.385 3.462 8.847 3.462 3.462 8.847 3.462h535.382q5.385 0 8.847-3.462 3.462-3.462 3.462-8.847V-646ZM480-269.233q41.538 0 70.768-29.23 29.231-29.231 29.231-70.768 0-41.538-29.231-70.769-29.23-29.23-70.768-29.23T409.232-440q-29.231 29.231-29.231 70.769 0 41.537 29.231 70.768 29.23 29.23 70.768 29.23ZM255.386-564.616h328.459v-139.998H255.386v139.998ZM200-646V-200-760v114Z"/>
          </svg>
        </button>` : ''}
      </td>
    </tr>
    <tr class="question-row d-none" data-form-id="${form.id}">
      <td colspan="8">
        <table class="table text-sm table-hover">
          <thead>
            <tr class="table-secondary">
                <th class="col-6 text-center align-middle">Question</th>
                <th class="col-2 text-center align-middle">Type</th>
                <th class="col-2 text-center align-middle">Category</th>
                <th class="text-center align-middle">Hidden</th>
                <th class="text-center align-middle">${isEditor ? `Actions` : ''}</th>
              </tr>
          </thead>
          <tbody>
            ${generateQuestionRows(form.questions, questionCategories, isEditor, currentVersion)}
          </tbody>
          <tfoot><tr class="table-secondary"><td colspan="4"></td></tr></tfoot>
        </table>
      </td>
    </tr>
  `;
  });
  return formRows;
}

function generateOptions(values, selectedValue = '') {
  let options = '';
  values.forEach((value) => {
    options += `
    <option ${value === selectedValue ? 'selected' : ''}>${value}</option>
    `;
  });
  return options;
}

function generateCheckbox(value, enabled, name) {
  let checkbox = '<input class="form-check-input {name}" type="checkbox" data-value="{dataValue}"{status}{enabled}>';
  checkbox = checkbox.replace('{name}', name);
  checkbox = checkbox.replace('{dataValue}', value);
  checkbox = checkbox.replace('{status}', value ? ' checked' : '');
  checkbox = checkbox.replace('{enabled}', enabled ? '' : ' disabled');
  return checkbox;
}

/**
 * Generates a list of HTML options for a select element based on an array of form objects.
 *
 * @param {Array} formList - An array of form objects containing an id and name property.
 * @returns {string} - A string of HTML option elements with values and text based on the form objects.
 */
function generateAddFormList(formList){
  let addFormList = '';
  formList.forEach((form) => {
    addFormList += `
    <option value="${form.id}">${form.name}</option>
    `;
  });
  return addFormList;
}

/**
 * Retrieves the form page HTML content.
 * @returns {Promise<string>} A promise that resolves to the form page HTML content.
 */
async function getFormPage() {
  try {
    const template = injectRole(HtmlService.createTemplateFromFile('Forms'));

    // Filter to active forms
    template.formData = Object.values(await getFormData()).filter(form => form.performanceCoaching !== undefined);
    template.questionCategories = await CoachingDashboard.getAllQuestionCategories();
    template.formList = await CoachingDashboard.getUnusedForms();

    let content = template.evaluate().getContent();
    return decodeHtmlEntities(content);
  } catch (error) {
    console.error("Error in getFormPage():", error);
    throw error;
  }
}

/**
 * Saves a question to the Coaching Dashboard.
 * @async
 * @function saveQuestion
 * @param {number} id - The ID of the question to be saved.
 * @param {string} text - The text of the question to be saved.
 * @param {string} category - The category of the question to be saved.
 * @param {boolean} hidden - Whether the question should be hidden or not.
 * @throws {Error} If there is an error updating the question in the Coaching Dashboard.
 */
async function saveQuestion(id, text, category, hidden) {
  try {
    await CoachingDashboard.updateQuestion(id, text, category, hidden);
  } catch (error) {
    throw error;
  }
}

/**
 * Saves the form data to the database.
 * @async
 * @function saveForm
 * @param {string} id - The ID of the form to update.
 * @param {boolean} performanceCoaching - The value of the performance coaching checkbox.
 * @param {boolean} oneToOne - The value of the one-to-one coaching checkbox.
 * @param {boolean} sideBySide - The value of the side-by-side coaching checkbox.
 * @throws {Error} If there was an error updating the form.
 */
async function saveForm(id, performanceCoaching, oneToOne, sideBySide) {
  try {
    Logger.log(`Saving form ${id} with values ${performanceCoaching}, ${oneToOne}, ${sideBySide}`);
    await CoachingDashboard.updateForm(id, performanceCoaching, oneToOne, sideBySide);
  } catch (error) {
    throw error;
  }
}

/**
 * Adds a form to the Coaching Dashboard.
 * @param {string} formId - The ID of the form to be added.
 * @throws {Error} If there is an error adding the form.
 */
async function addForm(formId) {
  try {
    await CoachingDashboard.addForm(formId);
  } catch (error) {
    throw error;
  }
}

/**
 * Removes a form with the given ID from the Coaching Dashboard.
 * @param {string} formId - The ID of the form to remove.
 * @throws {Error} If there was an error removing the form.
 */
async function removeForm(formId) {
  try {
    await CoachingDashboard.removeForm(formId);
  } catch (error) {
    throw error;
  }
}