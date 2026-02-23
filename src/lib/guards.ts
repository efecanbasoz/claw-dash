import { NextResponse } from 'next/server';
import { ENABLE_DANGEROUS_OPERATIONS } from './constants';

export function requireDangerousOperationsEnabled() {
  if (ENABLE_DANGEROUS_OPERATIONS) {
    return null;
  }

  return NextResponse.json(
    {
      error: 'Dangerous operations are disabled. Set ENABLE_DANGEROUS_OPERATIONS=true to enable this endpoint.',
    },
    { status: 403 },
  );
}
