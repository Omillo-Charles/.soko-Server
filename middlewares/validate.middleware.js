import { ValidationError } from '../utils/errors.js';

const validate = (schema) => (req, res, next) => {
  try {
    const data = {
      ...req.body,
      ...req.params,
      ...req.query
    };
    
    // Parse the merged data to validate body, params, and query
    schema.parse(data); 
    next();
  } catch (error) {
    next(error);
  }
};

export default validate;
