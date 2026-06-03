import { NextResponse } from 'next/server'

type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'QUOTA_EXCEEDED'
  | 'ALREADY_ONLINE'
  | 'INSTANCE_OFFLINE'
  | 'INTERNAL_ERROR'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 })
}

export function error(code: ErrorCode, detail: string, status: number) {
  return NextResponse.json({ error: code, detail }, { status })
}

export const Errors = {
  unauthorized: (detail = 'Authentication required') =>
    error('UNAUTHORIZED', detail, 401),
  forbidden: (detail = 'Insufficient permissions') =>
    error('FORBIDDEN', detail, 403),
  notFound: (detail = 'Resource not found') =>
    error('NOT_FOUND', detail, 404),
  conflict: (detail: string) => error('CONFLICT', detail, 409),
  quotaExceeded: (detail: string) => error('QUOTA_EXCEEDED', detail, 422),
  alreadyOnline: () => error('ALREADY_ONLINE', 'Instance is already online', 409),
  instanceOffline: () => error('INSTANCE_OFFLINE', 'Instance is currently offline', 503),
  validation: (detail: string) => error('VALIDATION_ERROR', detail, 400),
  internal: (detail = 'Unexpected error') => error('INTERNAL_ERROR', detail, 500),
}
