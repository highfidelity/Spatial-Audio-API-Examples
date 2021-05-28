'use strict';
const yargs = require('yargs');
const Bot = require("../bot");

const defaults = {
    audio: 440,
    motor: "RandomBoundedMovement",
    x: 0,
    y: 0,
    z: 0,
    gain: 1,
    volume: 1,
    name: 'Bot #',
    serverShouldSendUserData: true,
    runtimeSeconds: 0,
    measure: '',
    jwt: '',
    app_id: '', space_id: '', stackName: '',  // Edit in your own values here.
    secret: ''
};
function describe(label, propertyName) {
    // yargs config file option doesn't turn arrays inside out. See processBotOptions.
    return `${label} [default: ${JSON.stringify(defaults[propertyName])}]`;
}
const argv = yargs
      .option('jwt', {
          alias: 'j',
          describe: describe('JSON web token for connecting to a space.', 'jwt'),
          type: 'array'
      })
      .option('app_id', {
          describe: describe('Application Identifier from credentials, which can be specified along with space_id in lieu of JWT', 'app_id'),
          type: 'array'
      })
      .option('space_id', {
          describe: describe('Application Identifier from credentials, which can be specified along with app_id in lieu of JWT', 'space_id'),
          type: 'array'
      })
      .options('name', {
          describe: describe('Bot user ID for identification and JWT creation. If this option is not specified, then the user ID of the bot will be "Bot #", where # will be replaced by the bot index number', 'name'),
          type: 'array'
      })
      .option('secret', {
          describe: describe('Secret for JWT. If neither JWT nor secret is specified, the generated JWT will be unsigned', 'secret'),
          type: 'array'
      })
      .option('stackName', {
          alias: 's',
          describe: describe('Parameter for internal use with a development stack', 'stackName'),
          type: 'array'
      })
      .option('audio', {
          alias: 'a',
          describe: describe('Audio frequency, filename, URL, or empty string', 'audio'),
          type: 'array'
      })
      .options('x', {
          describe: describe('Initial x position', 'x'),
          type: 'array'
      })
      .options('y', {
          describe: describe('Initial y position', 'y'),
          type: 'array'
      })
      .options('z', {
          describe: describe('Initial z position', 'z'),
          type: 'array'
      })
      .options('motor', {
          alias: 'm',
          describe: describe('Motor (motion) implementation, or empty string', 'motor'),
          type: 'array'
      })
      .options('gain', {
          alias: 'g',
          describe: describe('Server-side gain for this input', 'gain'),
          type: 'array'
      })
      .options('volume', {
          alias: 'v',
          describe: describe('Relative sample volume between 0 to 1.0. To reduce the volume of the source, choose a value such as 0.01.', 'volume'),
          type: 'array'
      })
      .options('serverShouldSendUserData', {
          describe: describe('Must be true if the bot is to subscribe to user data, or false to tell the server to not send any user data', 'serverShouldSendUserData'),
          type: 'array'
      })
      .options('runtimeSeconds', {
          alias: 'r',
          describe: describe('How long should each bot run AFTER at it has completely started, or falsy to keep going indefinitely', 'runtimeSeconds'),
          type: 'array'
      })
      .options('measure', {
          describe: describe('If truthy, indicates that the bandwidth used by the bot should be reported and logged. Requires both runtimeSeconds, and that libcap or Npcap be installed (see https://www.npmjs.com/package/cap#requirements)', 'measure'),
          type: 'array'
      })
      .options('configuration', {
          alias: 'c',
          describe: 'A relative path to a .json that has an array of individual bot configs, where the property names of each bot config are the above option names. If one or more command line values are supplied, they override the configs',
          type: 'string'
      })
      .options('offset', {
          alias: 'o',
          describe: 'Offset within the configuration file at which to start (wraps around), e.g., if you are starting multiple bot processes from the same configuration file',
          type: 'number',
          default: 0
      })
      .option('numBots', {
          alias: 'n',
          describe: 'Number of bots to spawn [default: length of array in configuration, else 1]',
          type: 'number'
      })
      .options('startup', {
          describe: 'How to start the set of bots',
          choices: ['serial', 'parallel'],
          default: 'parallel'
      })
      .options('delay', {
          describe: 'Delay between starting bots, in ms',
          type: 'number',
          default: 35
      })
      .help()
      .alias('help', 'h')
      .argv;

let configuration = [];
if (argv.configuration) {
    configuration = require('./' + argv.configuration);
}
function runDefaultedBot(ignored, botIndex) {
    // Gather the options for the given botIndex, from json or command line,
    // run the bot, and return it.

    // We start with the options specified by the json. Note that these might include
    // anything that we recognize in Bot.run, even if we don't handle it on the command line.
    let botOptions = configuration[(botIndex + argv.offset) % configuration.length] || {}; 

    Object.keys(defaults).forEach(propertyName => {
        let commandLineValue = argv[propertyName];
        if (commandLineValue) { // overrides json
            let commandLineHasEnough = botIndex < commandLineValue.length;
            botOptions[propertyName] = commandLineHasEnough ?
                commandLineValue[botIndex] :
                commandLineValue[0];
        } else if (!botOptions.hasOwnProperty(propertyName)) { // Not in json.
            botOptions[propertyName] = defaults[propertyName]; // Get from defaults.
        }
    });
    console.log(botIndex, botOptions);
    return new Bot({botIndex, ...botOptions});
}

const isSerial = argv.startup === 'serial';
const delay = argv.delay;
const bots = Array.from({length: argv.numBots || configuration.length || 1}, runDefaultedBot)
async function sequentialStarts() {
    for (let bot of bots) {
        let started = bot.start();
        if (isSerial) { // without awaiting is fine, as long as we "yield" before more, below
            await started;
        }
        // Within a single node process on my old MacBook Pro, not pausing here
        // can result in crashes or the rtc signaling getting stuck.
        // In particular, I can get 44 bots connected reliably with a timeout of 0,
        // but to get 50 bots connected takes a timeout of 35 ms.
        if (delay) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
sequentialStarts();
// Force an exit if/when all the bots are stopped.
Promise.all(bots.map(bot => bot.stopped)).then(process.exit);

