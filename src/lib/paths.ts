import path from 'node:path';

interface ResolvePathOptions {
  allowedExtensions?: string[];
  blockedBasenames?: string[];
}

export interface ResolvedPath {
  fullPath: string;
  relativePath: string;
}

export function resolvePathWithinRoot(
  root: string,
  candidatePath: string,
  options: ResolvePathOptions = {},
): ResolvedPath | null {
  const normalizedCandidate = candidatePath.replace(/\\/g, '/').trim();
  if (!normalizedCandidate || normalizedCandidate.startsWith('/')) return null;

  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, normalizedCandidate);
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    return null;
  }

  const relativePath = path.relative(resolvedRoot, resolvedPath).replace(/\\/g, '/');
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  const basename = path.basename(resolvedPath);
  if (options.blockedBasenames?.includes(basename)) {
    return null;
  }

  if (options.allowedExtensions && !options.allowedExtensions.some((ext) => resolvedPath.endsWith(ext))) {
    return null;
  }

  return {
    fullPath: resolvedPath,
    relativePath,
  };
}
