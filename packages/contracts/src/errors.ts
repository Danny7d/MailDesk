import { z } from 'zod';

export const ApiErrorSchema = z.object({
  error: z.object({
    type: z.string(),
    code: z.string(),
    message: z.string(),
    request_id: z.string().optional(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const errorTypes = {
  internal_error: 'internal_error',
  validation_error: 'validation_error',
  not_found: 'not_found',
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  rate_limit_exceeded: 'rate_limit_exceeded',
  service_unavailable: 'service_unavailable',
} as const;

export const errorCodes = {
  unexpected: 'unexpected',
  invalid_input: 'invalid_input',
  missing_required: 'missing_required',
  resource_not_found: 'resource_not_found',
  invalid_credentials: 'invalid_credentials',
  insufficient_permissions: 'insufficient_permissions',
  too_many_requests: 'too_many_requests',
  dependency_unavailable: 'dependency_unavailable',
} as const;

export function createApiError(
  type: keyof typeof errorTypes,
  code: keyof typeof errorCodes,
  message: string,
  requestId?: string
): ApiError {
  return {
    error: {
      type,
      code,
      message,
      request_id: requestId,
    },
  };
}
