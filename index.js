'use strict';

const path = require('path');
const debug = require('debug')('merge-dirs-async');

const FileStructure = require('./lib/FileStructure');

async function main (outputDir, ...inputDirs) {
	const callingDir = (function () {
		const oldPrepareStackTrace = Error.prepareStackTrace;
		Error.prepareStackTrace = (err, stack) => stack;

		const stack = new Error().stack;
		Error.prepareStackTrace = oldPrepareStackTrace;

		return stack[2] ? path.dirname(stack[2].getFileName()) : undefined;
	}());

	var options = {};
	
	if (typeof inputDirs[inputDirs.length - 1] === 'object') {
		options = inputDirs.pop();
	}

	function resolve (dir) {
		if (dir[0] === '.') {
			return path.join(callingDir, dir);
		} else {
			return path.resolve(dir);
		}
	}

	outputDir = resolve(outputDir);
	inputDirs = inputDirs.map(resolve);

	const fileStructure = new FileStructure(outputDir, inputDirs, options);

	if (options.verbose) {
		debug.enabled = true;
	}

	if (!options.delayMerge) {
		await fileStructure.merge();
	}

	if (options.trackChanges) {
		await fileStructure.startTracking();
	}

	return fileStructure;
}

main.FileStructure = FileStructure;

module.exports = main;