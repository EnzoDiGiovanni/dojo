export class HttpError extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 409 | 503,
    message: string,
  ) {
    super(message)
  }
}
