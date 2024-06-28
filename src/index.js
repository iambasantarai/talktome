#!/usr/bin/env node

'use strict';

import path from 'path';
import { readFileSync } from 'fs';

import figlet from 'figlet';
import inquirer from 'inquirer';
import { IgApiClient } from 'instagram-private-api';

const pkgPath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

process.stdout.write('\x1Bc');
console.log(
  figlet.textSync('talktome', {
    font: 'Small Slant',
  }),
);
console.log(`Version: ${pkg.version}`);

const ig = new IgApiClient();

const authenticator = async () => {
  const { username, password } = await inquirer.prompt([
    {
      name: 'username',
      type: 'input',
      prefix: '>',
      message: 'Enter your username: ',
    },
    {
      name: 'password',
      type: 'password',
      mask: '*',
      prefix: '>',
      message: 'Enter your password: ',
    },
  ]);

  ig.state.generateDevice(username);

  return await ig.account.login(username, password);
};

(async () => {
  const loggedInUser = await authenticator();
  console.log('\r Logged in as ', loggedInUser.username);
})();
