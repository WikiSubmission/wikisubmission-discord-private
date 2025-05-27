import minimist from 'minimist';

export function getCliParams(forKey?: string): string[] {
  const argv = minimist(process.argv.slice(2));

  if (forKey) {
    return Array.isArray(argv[forKey])
      ? argv[forKey]
      : [argv[forKey]].filter(Boolean);
  }

  return argv._;
}
