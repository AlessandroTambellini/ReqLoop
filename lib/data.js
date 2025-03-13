const { readFile, writeFile, open, mkdir } = require("node:fs/promises");

const CHECKS_FILE_PATH = '.data/checks.json';
const MAX_NUMBER_OF_CHECKS = 100;
const checks_map = new Map();

async function setup_data_dir() {
    try {
        // if the folder is already present, nothing happens
        await mkdir('.data', { recursive: true });
        // if the file is already present, nothing happens
        open(CHECKS_FILE_PATH, 'a+').then((file) => {
            file.close();
        });
        return { 'Success': 'The .data directory has been set up.' };
    } catch (error) {
        return { 'Error': error.message };
    }
}

/* Read and write from/to file as little as possible */
async function store_checks_in_memory() {
    let checks_json = null;
    try {
        checks_json = await readFile(CHECKS_FILE_PATH, { encoding: 'utf8' });
        if (checks_json !== '') {
            const checks_obj = JSON.parse(checks_json);
            for (const [key, value] of Object.entries(checks_obj)) {
                checks_map.set(key, value);
            }
        }
        return { 'Success': 'Checks have been loaded in memory.' };
    } catch (error) {
        return { 'Error': error.message };
    }
}

async function write_checks_to_disk() {
    try {
        let checks_JSON = JSON.stringify(Object.fromEntries(checks_map));
        await writeFile(CHECKS_FILE_PATH, checks_JSON);
        return { 'Success': 'Checks have been written to disk.' };
    } catch (error) {
        return { 'Error': `Checks could not be written to disk: ${error.message}.` };
    }
}

function get_copy_of_checks_map() 
{
    let checks_map_copy = new Map(checks_map); // Shallow copy
    checks_map.forEach((value, key) => {
        // Create a deep copy of each check object
        checks_map_copy.set(key, JSON.parse(JSON.stringify(value)));
    });
    return checks_map_copy;
}

function get_check_by_id(check_id) {
    let check = checks_map.get(check_id);
    if (check) {
        return Object.assign({}, checks_map.get(check_id)); // return a copy
    } else {
        return { 'Error': `There is no check with id '${check_id}'.` };
    }
}

function add_new_check(check_id, check_obj) {
    if (checks_map.size < MAX_NUMBER_OF_CHECKS) {
        /* Given that in practice it never happens (for probability) that two checks_id are generated equal,
        I do not check if the passed check_id already exists in the map. */
        checks_map.set(check_id, check_obj);
        return { 'Success': `Check with id '${check_id}' successfully added.` };
    } else {
        return { 'Error': `The maximum number of checks (${MAX_NUMBER_OF_CHECKS}) has been reached.` };
    }
}

function update_check(check_id, new_check_obj) {
    if (checks_map.has(check_id)) 
    {
        checks_map.set(check_id, new_check_obj);
        return { 'Success': `Check with id '${check_id}' successfully updated.` };
    } else {
        return { 'Error': `The check with id '${check_id}' does not exist.` };
    }
}

function delete_check(check_id) {
    if (checks_map.has(check_id)) {
        checks_map.delete(check_id);
        return { 'Success': `Check with id '${check_id}' successfully deleted.` };
    } else {
        return { 'Error': `The check with id '${check_id}' does not exist.` };
    }
}

module.exports = { 
    setup_data_dir,
    store_checks_in_memory, 
    write_checks_to_disk, 
    get_copy_of_checks_map, 
    get_check_by_id,
    add_new_check, 
    update_check, 
    delete_check
};
