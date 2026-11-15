export class FirmsValidationError extends Error {}

export class FirmsConfigError extends Error {}

export class FirmsUpstreamError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
