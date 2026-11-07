// Error yang memang layak dikirim ke client. Error lain dianggap bug server
// dan pesannya diganti generik oleh error handler pusat.
export class HttpError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    if (errors) this.errors = errors;
  }
}
