#!/bin/node

'use strict';

import path from 'path';
import { readFileSync } from 'fs';

import figlet from 'figlet';
import inquirer from 'inquirer';
import {
  IgApiClient,
  IgLoginTwoFactorRequiredError,
} from 'instagram-private-api';

const pkgPath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

process.stdout.write('\x1Bc');
console.log(
  figlet.textSync('talktome', {
    font: 'Small Slant',
  }),
);
console.log('A CLI app for sending and receiving instagram messages.');
console.log(`Version: ${pkg.version}`);

const ig = new IgApiClient();

const login = async () => {
  try {
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
        console.log(`Can't log in. ${error.response.body.message}`);
      }
    }
    console.log(`Can't log in. ${error.response.body.message}`);
  }
};

const logout = async () => {
  try {
    await ig.account.logout();
    console.log('\r Bye!');
  } catch (error) {
    console.log(`Can't log out. ${error.response.body.message}`);
  }
};

async function viewInbox() {
  try {
    const inbox = ig.feed.directInbox();
    const threads = await inbox.items();

    const choices = threads.map(
      ({ thread_id, thread_title, last_permanent_item }) => ({
        name: `${thread_title}: ${last_permanent_item.text ? last_permanent_item.text : 'No preview available.'}`,
        value: thread_id,
      }),
    );

    const { thread } = await inquirer.prompt([
      {
        type: 'list',
        name: 'thread',
        message: 'Select conversation:',
        choices,
        loop: false,
        pageSize: choices.length,
        prefix: '?',
      },
    ]);

    await goToThread(thread);
  } catch (error) {
    console.log(error.response.body.message);
  }
}

async function goToThread(threadId) {
  try {
    const inbox = ig.feed.directInbox();
    const threads = await inbox.items();
    const thread = threads.find(({ thread_id }) => thread_id === threadId);

    if (!thread) {
      console.log(`Couldn't find the thread.`);
      return viewInbox();
    }

    await viewThreadMessages(thread);
  } catch (error) {
    console.log(error.response.body.message);
  }
}

async function viewThreadMessages(thread) {
  for (let i = 0; i < thread.items.length; i++) {
    const message = thread.items[i];
    console.log(message.text);
  }
  await prompt(thread);
}

async function prompt(thread) {
  const { input } = await inquirer.prompt([
    {
      type: 'input',
      name: 'input',
      message: '>',
      prefix: '',
    },
  ]);

  // TODO: send message

  switch (input) {
    case '/inbox':
      await viewInbox();
      break;
    case '/refresh':
      console.log('Not implemented yet.');
      break;
    case '/quit':
      process.exit();
    default:
      console.log('Invalid input.');
      break;
  }
}

async function viewFollowers(user) {
  try {
    const followers = await ig.feed.accountFollowers(user.pk).items();

    console.log('\r - My followers -');
    followers.map((follower) => {
      console.log(`\r ${follower.full_name} (@${follower.username})`);
    });
  } catch (error) {
    console.log(error.response.body.message);
  }
}

(async () => {
  const loggedInUser = await login();

  const choices = ['inbox', 'followers', 'quit', 'logout'];

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      prefix: '?',
      choices,
      message: 'Choose an action to perform:',
    },
  ]);

  if (loggedInUser) {
    console.log('\r Logged in as ', loggedInUser.username);

    switch (choice) {
      case 'inbox':
        await viewInbox();
        break;
      case 'followers':
        await viewFollowers(loggedInUser);
        break;
      case 'logout':
        await logout();
        break;
      case 'quit':
        console.log('\r Bye!');
        break;
      default:
        console.log('\r Invalid choice.');
        break;
    }
  }
})();
