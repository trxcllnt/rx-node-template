// Make sure we have all the dependencies.
try {
	var argv     = require('optimist')
					.default({
						'env': 'prod'
					})
					.argv,
	build        = require('./build'),
	Rx           = require('rx') && require('rxjs-fs'),
	RxHttpServer = require("rx-http-server"),
	router       = require('rx-router'),
	
	// Route handlers.
	fourOhFour   = require('./server/routes/404'),
	root         = require('./server/routes/root'),
	staticFiles  = require('./server/routes/static-files');
	
} catch(e) {
	console.error(error, 'Please run `npm install` first');
	process.exit(1);
}

// Configuration values
var debugMode   = argv.env === 'dev',
	// Instantiate a server that exposes HTTP events as Observable sequences.
	server      = new RxHttpServer(),
	// Build a function that routes requests to handler functions.
	routes      = router(fourOhFour, {
			'GET': [
				
				// Serve index.html. If we're in debug mode,
				// recompile the client JS/CSS/HTML each time
				// the root is hit.
				[ '/', root(debugMode) ],
				
				// Serve up static files from the bin and image
				// directories.
				[ (/\/bin\//i), staticFiles ],
				[ (/\/images\//i), staticFiles ]
			]
		});

// Map requests through the route handler.
// Request handlers are potentially asynchronous, so they
// return Observables. FlatMap the handler values and
// respond as they as they flow in.
server.requests
	.flatMap(function(data) {
		return routes(data).do(
			write(data.response),
			error(data.response),
			close(data.response)
		);
	})
	.publish()
	.connect();

// Start our li'l server
server.listen(process.env.PORT || 5000);

function write(response) {
	
	var first = true;
	
	return function(data) {
		
		if(first) {
			data.response.writeHead(200, {
				"Content-Type": data.contentType
			});
			first = false;
		}
		
		response.write(data.result, data.encoding || 'utf-8');
	}
}

function error(response) {
	return function(e) {
		response.end(e.toString());
	}
}

function close(response) {
	return function() {
		response.end();
	}
}