const { readFile, writeFile } = require("node:fs/promises");
const { resolve } = require("node:path");

/* Read and write from/to file as little as possible */

const CHECKS_FILE_PATH = resolve('./checks.json');
const MAX_NUMBER_OF_CHECKS = 100;
const checks_map = new Map();

async function store_checks_in_memory() {
    try {
        const checks_json = await readFile(CHECKS_FILE_PATH, { encoding: 'utf8' });
        if (checks_json !== '') {
            const checks_obj = JSON.parse(checks_json);
            for (const [key, value] of Object.entries(checks_obj)) {
                checks_map.set(key, value);
            }
        }
        console.log('Checks have been loaded in memory.');
    } catch (error) {
        console.error(CHECKS_FILE_PATH + ' has malformed content.');
        console.error(error.message);
    }
}

async function write_checks_to_disk() {
    try {
        let checks_JSON = JSON.stringify(Object.fromEntries(checks_map));
        // Indent each check on a separete line
        checks_JSON = checks_JSON.replaceAll('},', '},\n');
        await writeFile(CHECKS_FILE_PATH, checks_JSON);
        return { 'Success': 'Checks have been written to disk.' };
    } catch (error) {
        return { 'Error': `Checks could not be written to disk with the following error message: ${error.message}.` };
    }
}

function get_all_checks() {
    return new Map(checks_map); // I don't know if it's necessary to clone the checks map
}

async function add_new_check(check_id, check_obj) {
    if (checks_map.size < MAX_NUMBER_OF_CHECKS) {
        checks_map.set(check_id, check_obj);
        return { 'Success': 'Check successfully added.' };
    } else {
        return { 'Error': `The maximum number of checks (${MAX_NUMBER_OF_CHECKS}) has been reached.` };
    }
}

async function update_check(check_id, check_obj) {
    if (checks_map.has(check_id)) {
        checks_map.set(check_id, check_obj);
        return { 'Success': 'Check successfully updated.' };
    } else {
        return { 'Error': `The check with id '${check_id}' does not exist.` };
    }
}

async function delete_check(check_id) {
    if (checks_map.has(check_id)) {
        checks_map.delete(check_id);
        return { 'Success': 'Check successfully deleted.' };
    } else {
        return { 'Error': `The check with id '${check_id}' does not exist.` };
    }
}

module.exports = { 
    store_checks_in_memory, 
    write_checks_to_disk, 
    get_all_checks, 
    add_new_check, 
    update_check, 
    delete_check 
};
