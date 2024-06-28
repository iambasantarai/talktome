#!/usr/bin/env node

'use strict';

import path from 'path';
import { readFileSync } from 'fs';

import figlet from 'figlet';

const pkgPath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

process.stdout.write('\x1Bc');
console.log(
  figlet.textSync('talktome', {
    font: 'Small Slant',
  }),
);
console.log(`Version: ${pkg.version}`);
