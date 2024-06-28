#!/usr/bin/env node

'use strict';

import figlet from 'figlet';

process.stdout.write('\x1Bc');
console.log(
  figlet.textSync('talktome', {
    font: 'Small Slant',
  }),
);
