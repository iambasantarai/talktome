#!/bin/node

'use strict';

import path from 'path';
import { readFileSync, writeFileSync } from 'fs';

import figlet from 'figlet';
import inquirer from 'inquirer';
import {
  IgApiClient,
  IgLoginTwoFactorRequiredError,
} from 'instagram-private-api';

const pkgPath = path.join(process.cwd(), 'package.json');
const sessionFilePath = path.join(process.cwd(), 'session.json');

const pkg = JSON.parse(readFileSync(pkgPath, { encoding: 'utf8' }));

process.stdout.write('\x1Bc');
console.log(
  figlet.textSync('talktome', {
    font: 'Small Slant',
  }),
);
console.log('A CLI app for sending and receiving instagram messages.');
console.log(`Version: ${pkg.version}`);

const ig = new IgApiClient();

function storeSession(data) {
  writeFileSync(sessionFilePath, JSON.stringify(data));
}

function retrieveSession() {
  return JSON.parse(readFileSync(sessionFilePath, { encoding: 'utf8' }));
}

function sessionExists() {
  const session = retrieveSession();

  if (session === '{}') return false;

  return true;
}

const authenticator = async () => {
  try {
    if (sessionExists()) {
      await ig.simulate.preLoginFlow();

      const session = retrieveSession();
      console.log(session);
      return await ig.state.deserialize(session);
    }

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

    // This function executes after every request
    ig.request.end$.subscribe(async () => {
      const serialized = await ig.state.serialize();
      delete serialized.constants; // this deletes the version info, so you'll always use the version provided by the library
      storeSession(serialized);
    });

    return await ig.account.login(username, password);
  } catch (error) {
    if (error instanceof IgLoginTwoFactorRequiredError) {
      try {
        const { username, totp_two_factor_on, two_factor_identifier } =
          error.response.body.two_factor_info;
        const verificationMethod = totp_two_factor_on ? '0' : '1';

        const { otp } = await inquirer.prompt([
          {
            type: 'input',
            name: 'otp',
            prefix: '>',
            message: `Enter otp received via ${verificationMethod === '1' ? 'SMS' : 'TOTP'}: `,
          },
        ]);

        return await ig.account.twoFactorLogin({
          username,
          verificationCode: otp,
          twoFactorIdentifier: two_factor_identifier,
          verificationMethod,
          trustThisDevice: '1',
        });
      } catch (error) {
        console.log('ERROR: ', error);
        console.log(`Can't log in. ${error.response.body.message}`);
      }
    }
    console.log('ERROR: ', error);
    console.log(`Can't log in. ${error.response.body.message}`);
  }
};

(async () => {
  const loggedInUser = await authenticator();

  if (loggedInUser) console.log('\r Logged in as ', loggedInUser.username);
})();
