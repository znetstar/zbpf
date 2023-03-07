import * as _ from 'lodash'

export type UnitFile = Record<string, Record<string, string|string[]>>;
export function makeUnitFile(unit: UnitFile) {
  const lines: string[] = [];

  for (const sectionName of Object.getOwnPropertyNames(unit)) {
    lines.push(`[${sectionName}]`);
    for (const propName of Object.getOwnPropertyNames(unit[sectionName])) {
      lines.push(
        ...([] as string[]).concat(unit[sectionName][propName]).map(val => `${propName}=${val}`)
      );
    }
  }

  return lines.join('\n').trim();
}

export function writeOptions(unit: UnitFile, options: string[], sep: string = ':') {
  for (let eq of options.map(k => k.split('='))) {
    const path = eq[0].replace(new RegExp(`\\${sep}`, 'g'), '.');
    const val = _.get(unit, path) || [];

    _.set(unit as any, path, [].concat(val as any).concat(eq.slice(1).join('=') as any));
  }
}
