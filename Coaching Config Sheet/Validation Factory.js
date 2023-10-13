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
            case "Form ID":
                return new FormIdValidator();
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
        return typeof value === "string" && value.length <= 255;
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
        return validCategories.includes(value) || value === "";
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
    async validate(value) {
        const ID = parseInt(value);
        const IDs = await _getQuestionIDs();
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
    async validate(value) {
        const ID = parseInt(value);
        const IDs = await _getFormIDs();
        return IDs.includes(ID);
    }
}

function validateValue(type, ...values) {
    const validator = validatorFactory.createValidator(type);
    return validator.validate(...values);
}