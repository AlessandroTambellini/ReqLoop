const { readFile, writeFile, open, mkdir } = require("node:fs/promises");
const { is_valid_id } = require("./id");

const CHECKS_FILE_PATH = '.data/checks.json';
const MAX_NUMBER_OF_CHECKS = 100;
const checks_map = new Map();

const data = {};

data.setup_dir = async function() {
    try {
        // if the folder is already present, nothing happens
        await mkdir('.data', { recursive: true });
        // if the file is already present, nothing happens
        open(CHECKS_FILE_PATH, 'a+').then((file) => {
            file.close();
        });
        return { 'Success': 'The .data directory has been set up.' };
    } catch (error) {
        return { 'Error': `${error.message}.` };
    }
};

data.store_checks_in_memory = async function() {

    const is_valid_check_obj = (id, check_obj) => {
        let valid_props = ['url', 'method', 'req_time', 'status_code', 'res_time', 'err_code', 'payload'];
        for (const [prop, value] of Object.entries(check_obj)) {
            if (!valid_props.includes(prop)) {
                console.error('[ERROR]', `The check with id '${id}' has an invalid property. Found '${prop}'.`);
                return false;
            }
        }
        return true;
    }

    let checks_json = null;
    try {
        checks_json = await readFile(CHECKS_FILE_PATH, { encoding: 'utf8' });
        if (checks_json !== '') {
            const checks_obj = JSON.parse(checks_json);
            for (const [id, check_obj] of Object.entries(checks_obj)) 
            {
                if (!is_valid_id(id)) {
                    console.error('[ERROR]', `The check id '${key}' is invalid.`);
                    continue;
                }

                if (!is_valid_check_obj(id, check_obj)) continue;

                checks_map.set(id, check_obj);
            }
        }
        if (checks_map.size > MAX_NUMBER_OF_CHECKS) {
            return { 'Error': 'The checks file contains a number of checks exceeding 100. Remove some of them.' };
        }
        return { 'Success': 'Checks have been loaded in memory.' };
    } catch (error) {
        return { 'Error': `${error.message}.` };
    }
};

data.write_checks_to_disk = async function() {
    try {
        let checks_JSON = JSON.stringify(Object.fromEntries(checks_map));
        await writeFile(CHECKS_FILE_PATH, checks_JSON);
        return { 'Success': 'Checks have been written to disk.' };
    } catch (error) {
        return { 'Error': `Checks could not be written to disk: ${error.message}.` };
    }
};

data.get_copy_of_checks_map = function() {
    let checks_map_copy = new Map(checks_map); // Shallow copy
    checks_map.forEach((value, key) => {
        // Create a deep copy of each check object
        checks_map_copy.set(key, JSON.parse(JSON.stringify(value)));
    });
    return checks_map_copy;
};

data.get_check_by_id = function(check_id) {
    let check = checks_map.get(check_id);
    if (check) {
        return Object.assign({}, checks_map.get(check_id)); // return a copy
    } else {
        return { 'Error': `There is no check with id '${check_id}'.` };
    }
};

data.add_new_check = function(check_id, check_obj) {
    if (checks_map.size < MAX_NUMBER_OF_CHECKS) {
        /* Given that in practice it never happens (for probability) that two checks_id are generated equal,
        I do not check if the passed check_id already exists in the map. */
        checks_map.set(check_id, check_obj);
        return { 'Success': `Check with id '${check_id}' successfully added.` };
    } else {
        return { 'Error': `The maximum number of checks (${MAX_NUMBER_OF_CHECKS}) has been reached.` };
    }
};

data.update_check = function(check_id, new_check_obj) {
    if (checks_map.has(check_id)) {
        checks_map.set(check_id, new_check_obj);
        return { 'Success': `Check with id '${check_id}' successfully updated.` };
    } else {
        return { 'Error': `The check with id '${check_id}' does not exist.` };
    }
};

data.delete_check = function(check_id) {
    if (checks_map.has(check_id)) {
        checks_map.delete(check_id);
        return { 'Success': `Check with id '${check_id}' successfully deleted.` };
    } else {
        return { 'Error': `The check with id '${check_id}' does not exist.` };
    }
};

module.exports = data;
