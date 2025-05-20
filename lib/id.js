const ID_LEN = 20;

/* NOTE: if you decide to add other symbols for the id geneation,
bare in mind that UPPERCASE letters would be a problem,
because the commands passed to the REPL (repl.js) are
lowercased. Therefore, would not be possible to retrive a check 
by its id. So, you either exclude the uppercase letters from the list of
the possible symbols or you modify REPL to not lowercase the input cmd. */    
const head_chars = 'abcdefghijklmnopqrstuvwxyz';
const body_chars = head_chars + '0123456789';

function generate_id() 
{
    let id = new Array(ID_LEN);

    // in HTML an id starting with a number is not valid
    id[0] = head_chars.charAt(Math.floor(Math.random() * head_chars.length));
    for (let i = 1; i < ID_LEN; i++) {
        id[i] = body_chars.charAt(Math.floor(Math.random() * body_chars.length));
    }

    return id.join('');
}

function is_valid_id(id) {
    if (!id || id.length !== ID_LEN) return false;

    let id_chars = id.split('');
    
    if (!head_chars.includes(id_chars[0])) return false;
    
    for (let i = 1; i < ID_LEN; i++) {
        if (!head_chars.includes(id_chars[i]) && !body_chars.includes(id_chars[i])) return false;
    }

    return true;
}

module.exports = {
    generate_id,
    is_valid_id,
};
