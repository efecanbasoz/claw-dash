import { NextResponse } from 'next/server';
import { ENABLE_DANGEROUS_OPERATIONS } from './constants';
import { getDangerousOperationsConfigError } from './dashboard-auth';

export function requireDangerousOperationsEnabled() {
  if (!ENABLE_DANGEROUS_OPERATIONS) {
    return NextResponse.json(
      {
        error: 'Dangerous operations are disabled. Set ENABLE_DANGEROUS_OPERATIONS=true to enable this endpoint.',
      },
      { status: 403 },
    );
  }

  const configError = getDangerousOperationsConfigError(ENABLE_DANGEROUS_OPERATIONS);
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  return null;
}
