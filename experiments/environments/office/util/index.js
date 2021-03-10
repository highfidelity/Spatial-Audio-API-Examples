
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

let MAP={};

function loadMap(mapPath) {
    if (!fs.statSync(mapPath).isFile()) {
        console.error(`Specified path "${mapPath}" is not a file!`);
        return;
    }
    // Read the audio file from our local filesystem into a file buffer.
    const fileBuffer = fs.readFileSync(mapPath);
    MAP = JSON.parse(fileBuffer);
}


function generateClientFile(outputFile) {
    let output = { 'rooms': {}};
    for (const [room, roomData] of Object.entries(MAP.rooms)) {
        output.rooms[room] = { 
            'x_min': roomData.x_min,
            'x_max': roomData.x_max,
            'y_min': roomData.y_min,
            'y_max': roomData.y_max,
            'z_min': roomData.z_min,
            'z_max': roomData.z_max,
            'doors': {}            
        };
        
        for (const [door, doorData] of Object.entries(roomData.doors)) {
            output.rooms[room].doors[door] = {
                'x': doorData.x,
                'z': doorData.z,
                'r': doorData.r
            };
        }
    }
    
    if(!outputFile) {
        process.stdout.write(JSON.stringify(output));
    } else {
        fs.writeFile(outputFile, JSON.stringify(output), (err) => { console.log(err); });
    }
}

async function deleteZones(stack, jwt, space) {
    let space_url = function(path) {
        return `https://loadbalancer-${stack}.highfidelity.io/api/v1/spaces/${space}/settings${path}?token=${jwt}`
    }
    console.log("Deleting zone and attenuation settings");
 
    // delete existing zones by retrieving
    await fetch(space_url(`/zones/`), {
        method: 'DELETE'
    });
    // reset the global attenuation_coefficients
    await fetch(space_url(''), {
        method: 'POST',
        headers: {
            'Content-type': 'application/json; charset=UTF-8' // Indicates the content 
        },        
        body: JSON.stringify({
            'global-attenuation': 0.5
        })
    });    
}

async function generateZones(stack, jwt, space) {
    
    let space_url = function(path) {
        return `https://loadbalancer-${stack}.highfidelity.io/api/v1/spaces/${space}/settings${path}?token=${jwt}`
    }
    console.log("Uploading audio and zone settings");
 
    // delete existing zones
    await fetch(space_url(`/zones/`), {
        method: 'DELETE'
    });
        
    // set the global attenuation_coefficients
    await fetch(space_url(''), {
        method: 'POST',
        headers: {
            'Content-type': 'application/json; charset=UTF-8' // Indicates the content 
        },        
        body: JSON.stringify({
            'global-attenuation': 1.0
        })
    });
    
    let zone_to_id = {};
    
    let zone_post_data = []
    // create new zones
    for (const [room, roomData] of Object.entries(MAP.rooms)) {
        zone_post_data.push({
        
                'name': room,
                'x-min': roomData.x_min,
                'x-max': roomData.x_max,
                'y-min': roomData.y_min,
                'y-max': roomData.y_max,
                'z-min': roomData.z_min,
                'z-max': roomData.z_max
        })       
    }
    
    await fetch(space_url('/zones'), {
        method: 'POST',
        headers: {
            'Content-type': 'application/json; charset=UTF-8' // Indicates the content 
        },
        body: JSON.stringify(zone_post_data)
    })
    .then(response => response.json())
    .then(response => {
        response.forEach(zone => {
            zone_to_id[zone['name']] = zone['id'];
        });        
    });


    // create all of the zone attenuation objects
    let za_offset = 1;
    let zone_attenuation_data = [];
    for (const [room, roomData] of Object.entries(MAP.rooms)) {
        zones = new Set();
        for (const [room, roomData] of Object.entries(MAP.rooms)) {
            zones.add(room);
        }
        for (const [zone, coefficient] of Object.entries(roomData.attenuation_coefficients)) {
            zone_attenuation_data.push({
                'source-zone-id': zone_to_id[room],
                'listener-zone-id': zone_to_id[zone],
                'za-offset': za_offset++,
                'attenuation': coefficient
            });
            zones.delete(zone);            
        }
            
        // all 'self' zones and zones not specified.
        for (const zone of zones) {
            zone_attenuation_data.push({
                'source-zone-id': zone_to_id[room],
                'listener-zone-id': zone_to_id[zone],
                'za-offset': za_offset++,
                'attenuation': (room !== zone) ? 1.0 : 0.5
            });
        }
    }

    await fetch(space_url('/zone_attenuations'), {
        method: 'POST',
        headers: {
            'Content-type': 'application/json; charset=UTF-8' // Indicates the content 
        },
        body: JSON.stringify(zone_attenuation_data)
    });
}


// Define all of the valid arguments that we can supply to this script on the command line.
const argv = yargs
    .option('map', {
        describe: 'path to the map file',
        type: 'string',
        default: '../data/map.json'
    })
    .options('c', {
        describe: 'Generate the client file',
        type: 'boolean'
    })
    .options('z', {
        describe: 'Update zones',
        type: 'boolean'
    })
    .options('d', {
        describe: 'Delete zones',
        type: 'boolean'
    })
    .options('j', {
        describe: 'JWT',
        type: 'string'
    })
    .options('stack', {
        describe: 'Stack',
        type: 'string'
    })
    .options('s', {
        describe: 'Space ID',
        type: 'string'
    })
    .options('o', {
        describe: 'Output file',
        type: 'string'
    })
    .help()
    .alias('help', 'h')
    .argv;

loadMap(argv.map);

if (argv.c) {
    generateClientFile(argv.o);
} else if (argv.z) {
    if (!argv.j && ~argv.s) {
        console.log('Must pass in jwt (j) and space id (s)');
    }
    generateZones(argv.stack, argv.j, argv.s);
} else if (argv.d) {
    if (!argv.j && ~argv.s) {
        console.log('Must pass in jwt (j) and space id (s)');
    }    
    deleteZones(argv.stack, argv.j, argv.s);
} else {
    console.log('Must pass c,z, or d');
}    

