import { ValidationError } from '../utils/errors.js';

const validate = (schema) => (req, res, next) => {
  try {
    const data = {
      ...req.body,
      ...req.params,
      ...req.query
    };
    
    // If it's a multipart request (with files), req.body might need preprocessing
    // But Zod handles the object structure.
    
    schema.parse(req.body); 
    next();
  } catch (error) {
    next(error);
  }
};

export default validate;
