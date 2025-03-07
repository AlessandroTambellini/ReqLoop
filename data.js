const { readFile, writeFile, open, mkdir } = require("node:fs/promises");
const { join } = require("node:path");

const DATA_PATH = join(__dirname, '.data');
const CHECKS_FILE_PATH = join(DATA_PATH, 'checks.json');
const MAX_NUMBER_OF_CHECKS = 100;
const checks_map = new Map();

async function setup_data_dir() {
    try {
        // if the folder is already present, nothing happens
        await mkdir(DATA_PATH, { recursive: true });
        // if the file is already present, nothing happens
        open(CHECKS_FILE_PATH, 'a+').then((file) => {
            file.close();
        });
        console.log('.data directory has been set up.');
        return true;
    } catch (error) {
        console.error(error);
        return false;
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
        console.log('Checks have been loaded in memory.');
        return true;
    } catch (error) {
        console.error(error.message);
        return false;
    }
}

async function write_checks_to_disk() {
    try {
        let checks_JSON = JSON.stringify(Object.fromEntries(checks_map));
        await writeFile(CHECKS_FILE_PATH, checks_JSON);
        return { 'Success': 'Checks have been written to disk.' };
    } catch (error) {
        return { 'Error': `Checks could not be written to disk with the following error message: ${error.message}.` };
    }
}

function get_copy_of_checks_map() {
    return new Map(checks_map);
}

function add_new_check(check_id, check_obj) {
    if (checks_map.size < MAX_NUMBER_OF_CHECKS) {
        /* Given that in practice it never happens,
        I do not check if the passed check_id already exists in the map. */
        checks_map.set(check_id, check_obj);
        return { 'Success': 'Check successfully added.' };
    } else {
        return { 'Error': `The maximum number of checks (${MAX_NUMBER_OF_CHECKS}) has been reached.` };
    }
}

function update_check(check_id, new_check_obj) {
    if (checks_map.has(check_id)) 
    {
        checks_map.set(check_id, new_check_obj);
        return { 'Success': 'Check successfully updated.' };
    } else {
        /* This function is used by both the background workers and 
        the JSON API handler. So, in the fist case, I just want to log the error,
        while in the second one, I want to return it to the caller. */
        console.error(`The check with id '${check_id}' does not exist.`);
        return { 'Error': `The check with id '${check_id}' does not exist.` };
    }
}

function delete_check(check_id) {
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
    get_copy_of_checks_map, 
    add_new_check, 
    update_check, 
    delete_check,
    setup_data_dir,
};
