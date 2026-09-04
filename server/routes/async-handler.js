// Express 4 does not catch rejected promises from route handlers, so every
// async handler is wrapped: a thrown error reaches the error middleware
// instead of hanging the request.
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
