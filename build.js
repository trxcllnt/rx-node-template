// Make sure we have all the dependencies.
try {
	var Rx         = require('rxjs-fs'),
		_          = require('lodash'),
		browserify = require('browserify'),
		argv       = require('optimist').argv;
} catch(error) {
	console.error(error, 'Please run `npm install` first');
	process.exit(1);
}

// Enumerates the key/value pairs from a map as an Observable of Tuple<key, val>
Rx.Observable.fromMap = function(map, scheduler) {
	return Rx.Observable.defer(function() {
		
		var pairs = [];
		
		for(var key in map) {
			pairs.push({
				key: key,
				val: map[key]
			});
		}
		
		return Rx.Observable.fromArray(pairs, scheduler);
	});
}

// Transforms a function that accepts enumerated arguments into
// a function that accepts a single Array argument, applying the
// Array as the arguments list to the original function.
function fnapply(fn, context) {
	return function(arr) {
		return fn.apply(context, arr);
	}
}

// Identity
function I() {
	return arguments[0];
}

// Constant
function K(val) {
	return function() {
		return val;
	}
}

Rx.Observable.prototype.bundleTransforms = bundleTransforms;
Rx.Observable.prototype.requireModules = requireModules;
Rx.Observable.prototype.bundleModules = bundleModules;

module.exports = build;

if(argv.env) {
	build(argv.env === 'dev').subscribe()
}

function build(debug, packagePath, srcPath, binPath) {
	
	if(debug === void(0)) debug = false;
	if(packagePath === void(0)) packagePath = 'package.json';
	if(srcPath === void(0)) srcPath = './client';
	if(binPath === void(0)) binPath = 'bin/';
	
	// Read the package.json for configuration options.
	return readPackage(packagePath)
		// Add the browserify transforms to the browserify bundler.
		.bundleTransforms(debug, srcPath)
		.delay(100)
		// Expose modules by custom module names defined in package.json.
		.requireModules(debug)
		.delay(100)
		// Bundle everything together.
		.bundleModules(debug)
		.delay(100)
		// Write the bundled JS to the bin dir.
		.writeFiles(K('./' + binPath + 'client.js'))
		.delay(100);
}

function readPackage(path) {
	
	return Rx.fs.readfile(path)
		.select(function(x) {
			return JSON.parse(x.file);
		});
}

function bundleTransforms(debug, srcPath) {
	
	return this.selectMany(function(pckg) {
		
		var transforms = debug ?
				pckg.debugTransforms :
				pckg.transforms,
			
			bundler = browserify().add(srcPath);
		
		return Rx.Observable
			// Enumerate the transforms
			.fromArray(transforms)
			// Require each transform
			.select(require)
			// Build up the browserify bundler with each require'd transform,
			// emitting the final bundler to subscribers.
			.aggregate(bundler, function(bundler, transform) {
				return bundler.transform(transform);
			})
			.select(function(bundler) {
				return [pckg, bundler];
			});
	});
}

function requireModules(debug) {
	
	return this.selectMany(fnapply(function(pckg, bundler) {
		
		return Rx.Observable
			.fromMap(pckg.modules)
			.aggregate(bundler, function(bundler, module) {
				return bundler.require(module.val, { expose: module.key });
			})
			.select(function(bundler) {
				return [pckg, bundler];
			});
	}));
}

function bundleModules(debug) {
	
	return this.selectMany(fnapply(function(pckg, bundler) {
		
		return Rx.Observable.create(function(observer) {
			
			var dependencies = _.keys(pckg.dependencies);
			
			bundler.bundle({
				debug: debug,
				noparse: dependencies
			}, function(err, src) {
				
				if(err) return observer.onError(err);
				
				observer.onNext(src);
				observer.onCompleted();
			});
		});
	}));
}
