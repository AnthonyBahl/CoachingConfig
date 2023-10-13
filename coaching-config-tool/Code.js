// Declare roles
const ROLES = {
    OWNER: 'owner',
    ADMIN: 'admin',
    EDITOR: 'editor'
};

function doGet(e) {
  var template = injectRole(HtmlService.createTemplateFromFile('index'));
  return template.evaluate()
                 .setFaviconUrl('https://raw.githubusercontent.com/AnthonyBahl/CoachingConfig/main/logo.png')
                 //.setFaviconUrl('https://github.csnzoo.com/abahl/coaching-config-tool/blob/a00a0e745d80b150cdc8761897feaec5b98637c5/logo.png')
                 .setTitle("Coaching Configuration");
}

/**
 * Returnst the HTML content of a file as a string
 *
 * @param {string} filename - The name of the HTML file to include.
 * @returns {string} The content of the HTML file as a string.
 * @example
 * const myHtml = include("myFile");
 */
function include(filename) {  
  var template = injectRole(HtmlService.createTemplateFromFile(filename));
  return template.evaluate().getContent();
}

function injectRole(template) {
  const email = Session.getActiveUser().getEmail();
  const role = authenticate(email);
  const isOwner = (role === ROLES.OWNER);
  const isAdmin = (isOwner || role === ROLES.ADMIN);
  const isEditor = (isAdmin || role === ROLES.EDITOR);
  template.isOwner = isOwner;
  template.isAdmin = isAdmin;
  template.isEditor = isEditor;
  return template;
}

/**
 * Logs the activity of the active user.
 * 
 * @param {(string|Object)} activity - The activity to log. If activity is not a string, it tries to convert it to string.
 * 
 * @throws Will throw an error if activity is null or undefined.
 */
function logActivity(activity){
  if (typeof activity !== 'string') {
    try {
      activity = activity.toString();
    } catch (error) {
      throw new TypeError('Activity must be a string, but received ' + typeof activity);
    }
  }
    
  var userEmail = Session.getActiveUser().getEmail();
  Logger.log(userEmail + ": " + activity);
}

function calculateStringPropertySpaceUsed(propertyValue) {
  const propertySize = propertyValue.length;
  let propertySpaceUsed, propertySpaceLeft, unit;

  if (propertySize < 1024) {
    propertySpaceUsed = propertySize;
    propertySpaceLeft = 1024 - propertySize;
    unit = 'bytes';
  } else {
    propertySpaceUsed = (propertySize / 1024).toFixed(2);
    propertySpaceLeft = (9 - propertySpaceUsed).toFixed(2);
    unit = 'KB';
  }

  Logger.log(`String property space used: ${propertySpaceUsed} ${unit}`);
  Logger.log(`String property space left: ${propertySpaceLeft} ${unit}`);
  Logger.log(`Space used: ${((propertySpaceUsed / propertySpaceLeft) * 100).toFixed(2)}%`)
}

/****************************************************************************
 * Authentication Start
 ****************************************************************************/

/**
 * Retrieves the list of users from the script properties and returns it as a JSON object.
 * If no users are found, returns an empty object.
 * @returns {Object} - The list of users as a JSON object.
 */
function getUsers() {
    const properties = PropertiesService.getScriptProperties();
    const users = properties.getProperty('users');
    return users ? JSON.parse(users) : {};
}

/**
 * Adds a new user to the list of users with the specified email and role.
 * @param {string} email - The email address of the new user.
 * @param {string} role - The role to assign to the new user.
 * @returns {void}
 * @throws {Error} - If the email or role parameters are not provided, if the role parameter is invalid, or if the user is not an admin.
 */
function addNewUser(email, role) {
    try {
        validateAdmin();

        if (!email || !role) {
            throw new Error("Both email and role are required");
        }

        if (!Object.values(ROLES).includes(role)) {
            throw new Error("Invalid role specified");
        }

        if (role === ROLES.OWNER && !validateOwner()) {
            throw new Error("Only the current owner can modify owners");
        }

        const properties = PropertiesService.getScriptProperties();
        let users = getUsers();
        users[email] = role;

        properties.setProperty('users', JSON.stringify(users));
        calculateStringPropertySpaceUsed('users');
    } catch (err) {
        throw err;
    }
}

/**
 * Edits the role of a user based on their email address.
 * @param {string} email - The email address of the user to edit.
 * @param {string} newRole - The new role to assign to the user.
 * @returns {void}
 * @throws {Error} - If the email or newRole parameters are not provided, if the newRole parameter is invalid, or if the user does not exist.
 */
function editUser(email, newRole) {
    try {
        validateAdmin();

        if (!email || !newRole) {
            throw new Error("Both email and newRole are required");
        }

        if (!Object.values(ROLES).includes(newRole)) {
            throw new Error("Invalid role specified");
        }

        if (newRole === ROLES.OWNER && !validateOwner()) {
            throw new Error("Only the current owner can modify owners");
        }

        let users = getUsers();
        if (!users[email]) {
            throw new Error("User does not exist");
        }

        users[email] = newRole;
        PropertiesService.getScriptProperties().setProperty('users', JSON.stringify(users));
        calculateStringPropertySpaceUsed('users');
    } catch (err) {
        throw err;
    }
}

/**
 * Removes a user from the list of users based on their email address.
 * @param {string} email - The email address of the user to remove.
 * @returns {void}
 * @throws {Error} - If the email parameter is not provided or if the user does not exist.
 */
function removeUser(email) {
    try {
        validateAdmin();

        if (!email) {
            throw new Error("Email is required");
        }

        let users = getUsers();
        if (!users[email]) {
            throw new Error("User does not exist");
        }

        delete users[email];
        PropertiesService.getScriptProperties().setProperty('users', JSON.stringify(users));
        calculateStringPropertySpaceUsed('users');
    } catch (err) {
        throw err;
    }
}

function getUserRole() {
  const email = Session.getActiveUser().getEmail();
  return authenticate(email);
}

/**
 * Authenticates a user based on their email address and returns their role.
 * If the user is not found, defaults to the "viewer" role.
 * @param {string} email - The email address of the user to authenticate.
 * @returns {string} - The role of the authenticated user.
 * @throws {Error} - If an error occurs while authenticating the user.
 */
function authenticate(email) {
    try {
        if (!email) {
            throw new Error("Email is required for authentication");
        }

        let users = getUsers();
        let role = users[email];

        // If the user is not found, default to "viewer" role.
        if (!role) {
            role = ROLES.VIEWER;
        }
        return role;
    } catch (err) {
        throw err;
    }
}

/**
 * Validates that the current user is an admin by checking their email address and role.
 * If the user is not an admin, throws an error.
 * @returns {void}
 * @throws {Error} - If the current user is not an admin.
 */
function validateAdmin() {
    const adminEmail = Session.getActiveUser().getEmail();
    const adminRole = authenticate(adminEmail);

    if (adminRole !== ROLES.ADMIN && adminRole !== ROLES.OWNER) {
        throw new Error("Only admins can perform this action");
    }
}

/**
 * Checks if user is the owner.
 * If the user is not an admin, throws an error.
 * @returns {boolean} - true if the user is the owner, otherwise false.
 */
function validateOwner() {
    const adminEmail = Session.getActiveUser().getEmail();
    const role = authenticate(adminEmail);
    return role === ROLES.OWNER ? true : false;
}

function getRoles() {
    //return validateOwner() ? Object.values(ROLES) : Object.values(ROLES).filter(role => role !== ROLES.OWNER);
    return ROLES;
  }

/****************************************************************************
 * Authentication End
 ****************************************************************************/