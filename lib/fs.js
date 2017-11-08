'use strict';

const path = require('path');
const fs = require('fs-extra');
const isPathInside = require('is-path-inside');
const debug = require('debug')('merge-dirs-async');

const isAllowedSystemWideAccess = {
	'stat': true,
	'readdir': true
};

const methods = {
	stat: {
		syswide: true,
		getDescription: args => `stat ${args[0]}`
	},

	readdir: {
		syswide: true,
		getDescription: args => `read directory ${args[0]}`
	},

	copy: {
		getDescription: args => `copy ${args[0]} to ${args[1]}`
	},

	ensureDir: {
		getDescription: args => `ensureDir ${args[0]}`
	},

	rmdir: {
		getDescription: args => `delete empty directory ${args[0]}`,
		ignoreCodes: ['ENOTEMPTY', 'ENOENT']
	},

	remove: {
		getDescription: args => `remove ${args[0]}`
	}
};

/**
 * Returns a promise that will be resolved with `undefined` after given `ms` milliseconds.
 * @param  {Number} ms The time, in milliseconds, the function should wait before resolving.
 * @return {Promise}
 */
function delay (ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function copyFile(source, target) {
	return new Promise((resolve, reject) => {
		  var cbCalled = false;

		  var rd = fs.createReadStream(source);
		  rd.on("error", function(err) {
		    done(err);
		  });
		  var wr = fs.createWriteStream(target);
		  wr.on("error", function(err) {
		    done(err);
		  });
		  wr.on("close", function(ex) {
		    done();
		  });
		  rd.pipe(wr);

		  function done(err) {
		    if (!cbCalled) {
		    	if (err) {
		    		reject(err);
		    	} else {
		    		resolve();
		    	}
		      cbCalled = true;
		    }
		  }
	})

}

/**
 * All commands that reads or writes to the filesystem executed via this function.
 * 
 * We do this because of two reasons:
 * 	1. Make sure that the command being executed is allowed to do so outside of the output directory.
 * 	2. Centralize recovery of commands that couldn't finish (e.g. EBUSY because of AV).
 * 	
 * @param  {String} methodName    			The fs-extra method name that will be executed.
 * @param  {FileStructure} fileStructure 	An instance of the FileStructure that is executing this command.
 * @param  {Array} args          			Array of arguments that is being passed to the fs-extra method.
 * @return {Promise}               			Resolves to the fs-extra method resolvedValue.
 */
async function execute (methodName, fileStructure, args, _curTries) {
	debug.enabled = fileStructure.verbose;

	const outputDir = fileStructure.outputDir;
	const inputPath = methodName === 'copy' ? args[1] : args[0];
	const isContained = outputDir === inputPath || isPathInside(inputPath, outputDir);
	const method = methods[methodName];

	// debug(`Executing ${methodName} on ${inputPath}`);	

	if (!isContained && !method.syswide) {
		throw new Error(`Refusing to ${method.getDescription(args)} because it is outside of the output directory "${outputDir}" `);
	}

	const maxTries = fileStructure.maxRetries;
	const curTries = (_curTries || 0) + 1;

	var result;

	try {
		if (methodName === 'copy') {
			await fs.ensureDir(path.dirname(args[1]));
			result = await copyFile(...args);
		} else {
			result = await fs[methodName](...args);
		}

		if (curTries > 1) {
			debug(`A subsequent attempt to ${method.getDescription(args)} succeeded after ${curTries} attempt(s) (${curTries * 100} ms delay)`);
		}
	} catch (err) {
		const delayMs = curTries < maxTries && fileStructure.retryStrategy(err, curTries);

		if (!delayMs) {
			throw err;
		}

		if (method.ignoreCodes && method.ignoreCodes.indexOf(err.code) !== -1) {
			return err.code;
		}

		debug(`An error (${err && err.code}) occurred while attempting to ${method.getDescription(args)}. This was attempt ${curTries} / ${maxTries}.`, delayMs ? `Trying again in ${delayMs} ms.` : ``, err);

		await delay(delayMs)
		result = await execute(methodName, fileStructure, args, curTries);
	}

	return result;
}

module.exports = (fileStructure) => {
	const exports = {};

	Object.keys(methods).forEach(methodName => {
		exports[methodName] = (...args) => execute(methodName, fileStructure, args);
	});

	return exports;
};