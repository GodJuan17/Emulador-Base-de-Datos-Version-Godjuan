export type DomainError = {
  code: string;
  message: string;
};

export type Result<Value, Error = DomainError> =
  { ok: true; value: Value } | { ok: false; error: Error };

export function success<Value>(value: Value): Result<Value, never> {
  return { ok: true, value };
}

export function failure(code: string, message: string): Result<never> {
  return { ok: false, error: { code, message } };
}
