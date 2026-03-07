import { ZodError } from 'zod';

const validate = (schema) => (req, res, next) => {
    try {
        if (!schema) {
            return next(new Error("Validation schema not provided to middleware"));
        }
        
        // Use safeParse instead of parse to avoid catching non-Zod errors in the catch block
        const result = schema.safeParse(req.body);
        
        if (!result.success) {
            const message = result.error.errors.map(err => err.message).join(', ');
            const err = new Error(message);
            err.statusCode = 400;
            return next(err);
        }
        
        next();
    } catch (error) {
        // This catch block now only handles truly unexpected errors
        next(error);
    }
};

export default validate;
