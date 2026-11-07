import { HttpError } from '../lib/httpError.js';

// Validasi di boundary HTTP supaya service menerima data yang sudah bertipe
// benar (mis. id berupa number), bukan string mentah dari URL/query.
export function validate(schemas) {
  return (req, res, next) => {
    const validated = {};

    for (const [source, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[source]);

      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: issue.path.join('.') || source,
          message: issue.message,
        }));

        // Frontend hanya membaca `message`; `errors` membantu debugging.
        return next(new HttpError(400, errors[0].message, errors));
      }

      validated[source] = result.data;
    }

    req.validated = validated;
    next();
  };
}
