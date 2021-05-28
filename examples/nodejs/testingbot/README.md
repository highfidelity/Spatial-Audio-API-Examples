# Testing Bots

# Prerequisites
- [NodeJS](https://nodejs.org/en/)
    - We're using `NodeJS v14.15`.

<br>

### The Testing Bot code lets you add bots/npcs to a space. Bots can be given specific properties and can be programmed to carry out actions.

### Bots can:
 - ### be controlled from scripts that you write;
 - ### use pre-packaged behavior, specified in a .json;
 - ### use pre-packaged behavior specified on the command line;
 - ### use a .json, but override certain behaviors on the command line.

<br>

# Bot Properties
| Name                     | Type   | Description                                                                                                                                                                                                     | Default                                                   | Command line alias |
|--------------------------|--------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|--------------------|
| numbots                  | number | Number of bots to spawn                                                                                                                                                                                         |  1                  | n                  |
| name                     | array  | Bot user ID for identification and JWT creation. If this option is not specified, then the user ID of the bot will be "Bot #", where # will be replaced by the bot index number                                 | "Bot #", where # will be replaced by the bot index number |                    |
| audio                    | array  | Audio frequency, filename, URL, or empty string                                                                                                                                                                 | 440                                                       | a                  |
| gain                     | array  | Server-side gain for this input                                                                                                                                                                                 | 1                                                         | g                  |
| volume                   | array  | Relative sample volume between 0 to 1.0. To reduce the volume of the source, choose a value such as 0.01.                                                                                                       | 1                                                         | v                  |
| x                        | array  | Initial x position                                                                                                                                                                                              | 0                                                         |                    |
| y                        | array  | Initial y position                                                                                                                                                                                              | 0                                                         |                    |
| z                        | array  | Initial z position                                                                                                                                                                                              | 0                                                         |                    |
| motor                    | array  | Motor (motion) implementation, or empty string                                                                                                                                                                  | RandomBoundedMovement                                     | m                  |
| jwt                      | array  | JSON web token for connecting to a space.                                                                                                                                                                       | none                                                      | j                  |
| app_id                   | array  | Application Identifier from credentials, which can be specified along with space_id in lieu of JWT                                                                                                              | none                                                      |                    |
| space_id                 | array  | Application Identifier from credentials, which can be specified along with app_id in lieu of JWT                                                                                                                | none                                                      |                    |
| secret                   | array  | Secret for JWT. If neither JWT nor secret is specified, the generated JWT will be unsigned                                                                                                                      | none                                                      |                    |
| stack name               | array  | Parameter for internal use with a development stack                                                                                                                                                             | none                                                      | s                  |
| serverShouldSendUserData | array  | Must be true if the bot is to subscribe to user data, or false to tell the server to not send any user data                                                                                                     | false                                                     |                    |
| runtimeSeconds measure   | array  | How long should each bot run AFTER at it has completely started, or falsy to keep going indefinitely                                                                                                            | false                                                     |                    |
| measure                  | array  | If truthy, indicates that the bandwidth used by the bot should be reported and logged. Requires runtimeSeconds. | false                                                     |                    |
| startup                  | string | How to start the set of bots                                                                                                                                                                                    | parallel                                                  |                    |
| delay                    | number | Delay between starting bots, in ms                                                                                                                                                                              | 35                                                        |                    |  

<br>
<br>

# Motion
Bots can be programmed to follow motion steps or move randomly along a line or within a box boundary.

This bot will move back and forth along the x axis between -15 and 15.

~~~~
"motor": {"type": "RandomBoundedMovement", "x": [-15, 15]}
~~~~

This bot will move randomly within a box that stretches from -15 to 15 on the x axis and from -15 to 15 on the y axis.

~~~~
"motor": {"type": "RandomBoundedMovement", "x": [-15, 15], "y": [-15, 15]}
~~~~

<br>

# Audio
The bot audio property can take the following types of input:
* Number - read as a frequency value in Hz
* Empty string - no audio
* String with `:` - read as a remote URL to a file
* Other string - read as a file name based on the `src` directory

## API Only
* 'file' (exact string) - play random files from the audio folder (This will play stems of one song so that the bot noise will be harmonious!)

<br>

# Bot Functions
The `npm run bots` command uses the `integration-test.js` script, while the API Server uses the `botsManager.js` script. If you need finer control over the bots, you can write your own script that makes use of the Bot class in `bot.js` and which manipulates them more specifically. For example, each Bot instance has:

 - an instance variable `source`, which is an AudioSource object that has methods `play`, `pause`, and `load` (analogous to methods of the same name on the HTML Media Element);
 - an instance variable `motor`, which is a Motor object that has methods `start`, `stop`, `step`, `setRotation`, and so forth. There is a built-in subclass of Motor called RandomBoundedMotion, but you can define your own subclass of Motor with different behaviors. (The default behavior of a Bot is to load and use whatever non-empty value is specified for motor or the motor's type.)

<br>
<br>

# Node App

## Usage
1. Clone this repository using `git clone <repo URL>`.
2. Within this directory, run `npm install` to install or update the script dependencies. (NOTE: You may receive errors regarding `node-gyp`. This is an OPTIONAL module and you can ignore those errors.)
3. Run `npm run bots -- --help` for help.
4. Run `npm run bots`, supplying any command-line arguments as desired.

## Command Line Arguments
The following command line arguments can be used to define bots or access help:

 - `--configuration`/`-c`:  **\<string\>**  A relative path to a .json that has an array of individual bot configs, where the property names of each bot config are the above 
 option names. If one or more command line values are supplied, they override the configs.
 
 - `--help`/`-h`:  View help documentation, which includes more advanced arguments for profiling and bot startup control

Each property that takes an array on the command line will apply each element of that array to an individual bot. So, if 3 bots are created with 3 volumes specified, `--numBots 3 --volume 1 0.8 0.5`, the first bot will have a volume of 1, the second will have a volume of 0.8, and the third will have a volume of 0.5.

If fewer command line arguments for a property are listed than the number of bots created, the first value in the argument will apply to all remaining bots. For instance if 3 bots are created with only two volumes specified: `--numBots 3 --volume 1 0.8`, the first bot will have a volume of 1, the second will have a volume of 0.8, and the third will have a volume of 1.

 ### Example
 The following command line input will create 4 bots:
  1. "0" is blue at (0, 0, 0) and plays a sine wave at 440Hz with a volume of 0.9 with a gain of 0.5
  2. "Johnny5" is yellow at (1, 1, 1) and plays a local file called `file2.mp3` at a volume of 0.9 with a gain of 2
  3. "2" is blue at (2, 2, 2) and plays the file at `https://someURL.com` with a volume of 0.9 and gain of 10
  4. "3" is blue at (3, 3, 3) and does not play audio
    
~~~~
npm run bots -- --numBots 4 --audio 440 file2.mp3 "https://someURL.com" "" --volume 0.9 --gain 0.5 2 10 --name # Johnny5 --color #1d05f7 #f7d305 --x 0 1 2 3 --y 0 1 2 3 --z 0 1 2 3
~~~~

## Bot JSON Configuration
If you'd like to configure many bots in a specific way, you can create a bot JSON configuration file and pass that file via the command line using the `--configuration` argument. The number of bots, if not set via the 'numBots' property, will be the length of the array in this configuration.

Any configuration properties set via command line will override properties set via JSON.

This example will create two bots:
~~~~
{
	{
		"x": 42,
		"y": 19,
		"name": "C3PO",
		"audio": "https://c3po.mp3"
	},
	{
		"x": 54,
		"y": 29,
		"name": "R2D2",
		"audio": "https://beeps.mp3"
	}
}
~~~~

<br>
<br>

# Bots REST API
This feature allows you to run bots from a server, with REST calls for adding, removing, and getting data about the bots.

## Usage
1. Copy this folder to your server or localhost.
2. Within this directory, run `npm install` to install or update the script dependencies. (NOTE: You may receive errors regarding `node-gyp`. This is an OPTIONAL module and you can ignore those errors.)
3. Run `node -r esm src/botsAPIServer.js` to start the server.
4. Use a console or REST client to make GET, POST, or DELETE requests to your server using the commands below.

## Command Line Arguments
 - `<PORT #>`:  **\<number\>**  enter a port number to run the server on. Default is '3000'.


## Requests
| Method | Request Path           | Example Body                    | Response Data                                       |
|--------|------------------------|---------------------------------|-----------------------------------------------------|
| POST   | /addBots               | {"numBots":3,"groupID":"A","properties":{"stackName":"\<YOUR STACKNAME\>", "jwt": "\<YOUR TOKEN\>", audio":["file"],"measure": ["true"],"motor":[{          "type":"RandomBoundedMovement","x":[0,10],"y":[0,10],"z":[0,10]}]}} | {"groupID": "A","bots": [ "Bot 0 Group A", "Bot 1 Group A", "Bot 2 Group A"]} |
| GET    | /listBots              | {}                              | { "botsList":{"A":["Bot 0 Group A","Bot 1 Group A","Bot 2 Group A"]}} |
| GET    | /listConnectionStates  | {}                              | {"botsList":{"A":{"connected":3}}}                  |
| GET    | /getBotStats/{botName} | {}                              | {"removedBots":["Bot 0 Group A"]}                   |
| DELETE | /removeBots            | {"botNames":["Bot 0 Group A"]   | {"removedBots": ["Bot 0 Group A"]}                  |
| DELETE | /removeGroups          | {"groupIDs":["A", "B"]}         | {"removedGroups":{"A":2,"B":3}}                     |
| DELETE | /removeAll             | {}                              | {"removedBots":{"B":3,"A":3,"remaining":0}}         |