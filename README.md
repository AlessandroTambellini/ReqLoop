## Run
```
node index.js
```
A `.data` folder is automatically created to store the checks

### For fun: Make a recursive request
Make a request to `http://localhost:8000/api/check`
with the method `POST` and with the following payload:
```
{
    "url": "http://localhost:8000",
    "method": "get"
}
```
The `checks.json` file will grow with new checks and then reach the limit of `MAX_NUMBER_OF_CHECKS`.

## REPL
The REPL is the alternative to the web interface.  
You can enter specific commands to visualize and filter the checks.  
However, unlike the web interface, it does not allow to create or edit checks. So, 
if you don't want to use the web interface, you have to use `curl` or
one of its wrappers (e.g. Postman).
