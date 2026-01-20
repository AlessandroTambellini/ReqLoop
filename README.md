![logo](assets/icons/logo.png)
# ReqLoop
Build requests (url, method, payload) and let them being executed in the background.  
You can monitor, create, edit and delete them from the web interface.  
Optionally, you can also view and filter them from the terminal (via the [REPL](#repl)).

## Run
Just run the following command from the root of the project:
```
node index.js
```
A `.data` folder is automatically created to store the checks

### Checks Starter Kit
You can copy-paste the JSON below in the `./.data/checks.json` file to have a starter kit of already created checks to play with. They are choosen to have different types of requests that produce different responses.
```JSON
{
    "eqdg2xtszijz8s89fabu": {
        "url": "https://spidermonkey.dev/blog/",
        "method": "GET"
    },
    "gl7rvw6j9gk1ybmijc84": {
        "url": "https://nodejs.org/docs/latest/api/",
        "method": "GET"
    },
    "h5he20aj0xpqp3fsvsvm": {
        "url": "https:nodejs.org/docs/latest/api/",
        "method": "GET"
    },
    "xef60dmz6ke3d3oiynv3": {
        "url": "http:fb.com",
        "method": "GET"
    },
    "rtzdr61wj7szk6m8msmh": {
        "url": "https:fb.com",
        "method": "GET"
    },
    "cvzkawzfdwspemshqfp7": {
        "url": "https://urmum.com",
        "method": "GET"
    },
    "n29nkidzklxi4pg0nwil": {
        "url": "https://www.google.com/search?q=ciao",
        "method": "GET"
    },
    "aedx7ngizhlzvw23g4kg": {
        "url": "https://nodejs.org/docs/latest/api/",
        "method": "POST",
        "payload": {
            "username": "alessandrot",
            "password": "kajdh98329kj"
        }
    },
    "uhfa9z8z1dyemb3z9gub": {
        "url": "https://nodejs.org/docs/latest/api",
        "method": "GET"
    },
    "ddr6pgq2ea624jjjzqz5": {
        "url": "https://nodejs.org/docs/latest/api/",
        "method": "PUT",
        "payload": {
            "id": "aedx7ngizhlzvw23g4kg",
            "username": "alessandrot",
            "password": "kajdh98329kj"
        }
    },
    "k03xeqa2tjakdeflah25": {
        "url": "https://nodejs.org/docs/latest/api?id=aedx7ngizhlzvw23g4kg",
        "method": "DELETE"
    }
}
```

#### For fun: Make a recursive request
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
The REPL is the alternative to the web interface to view the checks. You can enter specific commands to visualize and filter them.  
However, unlike the web interface, it does not allow to create, edit or delete checks. 
So, to manipulate them, if you don't want to use the web interface, you can use `curl` or one of its wrappers (e.g. Postman).

### Main REPL and Seconday REPL
For whatever reason (or accidentaly), you may close the repl. 
To open it again type `open repl`. How does it work? Actually, when the repl is closed (that is the main one), a secondary repl is opened that just respond to that specific command.  
The downside of this design is that **to kill the app from the terminal you have to press 2 times `Ctrl+D` (kill both the REPLs) and then `Ctrl+C` (exit the process)**.

## Why is there no database?
For a couple of reasons::
- **Size of the data**: there is a limit of 100 checks and I write to disk as little as possible.
All the changes are saved in an in memory `Map` that is copied to disk once per minute.
- **Simplicity**: I don't want any dependency in this project, including a database. Only **Node.js** is required.

### Considerations
The cool thing about this approach is that you can't really corrupt the data while the app is running,
because the data the app refers to is the one in memory. So, you can mess up with `checks.json`, but nothing bad happens.

