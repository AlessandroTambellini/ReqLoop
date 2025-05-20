const { readFile, writeFile, open, mkdir, appendFile, readdir, truncate } = require("node:fs/promises");
const { gzip } = require("node:zlib");

const LOGS_DIR = '.logs';

const logs = {};

logs.setup_dir = async function() {
    try {
        // if the folder is already present, nothing happens
        await mkdir(LOGS_DIR, { recursive: true });
        return { 'Success': 'The .logs directory has been set up.' };
    } catch (error) {
        return { 'Error': `${error.message}.` };
    }
};

logs.append = async function(check_id, check_obj) {
    let file;
    let err_msg = null;
    try {
        file = await open(`${LOGS_DIR}/${check_id}.log`, 'a');
        await appendFile(file, JSON.stringify(check_obj) + '\n');
    } catch (error) {
        err_msg = error.message;
    } finally {
        file?.close();
        if (err_msg) {
            return { 'Error': `${err_msg}.` };
        } else {
            return { 'Success': `Check successfully appended to '${check_id}.log'.` }
        }
    }
};

logs.gather_filenames = async function() {
    try {
        let data = await readdir(LOGS_DIR);
        let filenames = [];
        data.forEach(filename => {
            if (filename.includes('.log')) {
                filenames.push(filename.split('.log')[0]);
            }
        });

        return filenames;

    } catch (error) {
        console.error(`Unable to list log files: ${error.message}.`);
        return [];
    }
};

logs.compress = async function(log_name, compressed_log_name) {
    let fd;
    let err_msg;
    try {
        let content = await readFile(`${LOGS_DIR}/${log_name}.log`, { encoding: 'utf8' });
        if (content) 
        {
            let buffer = await async_gzip(content);
            fd = await open(`${LOGS_DIR}/${compressed_log_name}.gz.b64`, 'wx');
            await writeFile(fd, buffer.toString('base64'));
        }

    } catch (error) {
        return { 'Error': `Something went wrong while trying to compress a log: ${error.message}.` };
    } finally {
        fd?.close();
        if (err_msg) {
            return { 'Error': `Something went wrong while trying to compress a log: ${error.message}.` };
        } else {
            return { 'Success': 'Log compressed.' };
        }
    }
};

logs.truncate = async function(log_name){
    try {
        await truncate(`${LOGS_DIR}/${log_name}.log`, 0);
        return { 'Success': `Log file '${log_name}.log' truncated successfully.` };
    } catch (error) {
        return { 'Error': `Unable to truncate '${log_name}.log': ${error.message}.` };
    }
};

// logs.decompress ?

async function async_gzip(content) {
    return new Promise((resolve, reject) => {
        gzip(content, (err, buffer) => {
            if (!err && buffer) {
                resolve(buffer);
            } else {
                reject(err);
            }
        });
    });
}

module.exports = logs;
