var Rx     = require('rx') && require('rxjs-fs'),
	build  = require('../../build'),
	closed = require('./http/request-closed'),
	// Read the index HTML file into memory once so we
	// don't hit the file system on every request.
	indexSource = Rx.fs
		.readfile('./bin/index.html')
		.replay(null);
	
	indexSource.connect();

module.exports = function(debugMode) {
	
	var isDebugMode = K(debugMode);
	
	return function(data) {
		
		return indexSource
			// Assign the index html to each request's 'result'.
			.select(function(x) {
				data.result = x.file.toString();
				data.contentType = 'text/html';
				return data;
			})
			.flatMap(function(data) {
				
				var building = build(debugMode),
					noop = Rx.Observable.empty();
				
				// If in debug mode, build the JS source.
				// Otherwise, immediately complete.
				return Rx.Observable
					.if(isDebugMode, building, noop)
					// Ignore the compilation result.
					.ignoreElements()
					// When the compile/noop is complete,
					// emit the data value.
					.concat(Rx.Observable.returnValue(data))
			})
			// Complete after a single value is emitted to avoid memory leaks.
			.take(1)
			// Stop compiling and close the stream if the
			// request is closed before compiling finishes.
			.takeUntil(closed(data));
	}
}

// Constant
function K(value) {
	return function() {
		return value;
	}
}
