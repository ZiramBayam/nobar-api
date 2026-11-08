import { HttpError } from '../lib/httpError.js';

// Validasi di boundary HTTP supaya service menerima data yang sudah bertipe
// benar (mis. id berupa number), bukan string mentah dari URL/query.
export function validate(schemas) {
  return (req, res, next) => {
    const validated = {};

    for (const [source, schema] of Object.entries(schemas)) {
      // Express 5 meninggalkan req.body undefined saat body kosong. Anggap
      // objek kosong agar pesan yang muncul per field ("Film wajib diisi"),
      // bukan pesan bawaan Zod yang berbahasa Inggris.
      const input = source === 'body' ? (req.body ?? {}) : req[source];
      const result = schema.safeParse(input);

      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: issue.path.join('.') || source,
          // Issue tanpa path berarti body bukan objek (mis. array/null).
          message: issue.path.length === 0 ? 'Body request tidak valid' : issue.message,
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
