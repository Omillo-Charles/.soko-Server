const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (error) {
        const message = error.errors.map(err => err.message).join(', ');
        const err = new Error(message);
        err.statusCode = 400;
        next(err);
    }
};

export default validate;
