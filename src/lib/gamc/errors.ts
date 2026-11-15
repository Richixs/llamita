export class GamcValidationError extends Error {}

export class GamcConfigError extends Error {}

export class GamcUpstreamError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
