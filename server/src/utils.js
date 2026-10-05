export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const HOURS = 'EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0';
