'use strict';

const path = require('path');

const fs = require('fs-extra');
const delay = async (ms) => new Promise(resolve => setTimeout(resolve, ms));
const merge = require('../index');

(async function () {
	console.time('merge');
	const files = await merge('./target', './source1', './source2', {
		truncateTarget: true,
		verbose: true
	});
	console.timeEnd('merge');
}());

/*
const nsfw = require('nsfw');

nsfw(path.join(__dirname, 'source1'), events => {
	events.forEach(event => {
		const action = event.action;
		const filename = event.file;
		const dirname =  event.directory;

		switch (action) {
			case nsfw.actions.CREATED:
				console.log(`Created ${filename}`);
			break;

			case nsfw.actions.DELETED:
				console.log(`Deleted ${filename}`);
			break;

			case nsfw.actions.MODIFIED:
				console.log(`Modified ${filename}`);
			break;

			case nsfw.actions.RENAMED:
				const oldFile = event.oldFile;
				const newFile = event.newFile;

				console.log(`Renamed ${oldFile} to ${newFile}`);
			break;
		}
	});
}).then(watcher => watcher.start());

return;
(async function () {
	const files = await merge('./target', './source1', './source2', {
		dereferenceSymlinks: false,
		preserveTimestamps: false,
		truncateTarget: true,
		trackChanges: true,
		maxRetries: 10,
		verbose: true
	});

	return;
	//.on('error', error => {});

	const dynaFile1 = path.join(__dirname, 'source1', 'dyna-file.txt');
	const dynaFile2 = path.join(__dirname, 'source2', 'dyna-file.txt');

	await delay(500);
	await fs.writeFile(dynaFile1, '');
	await fs.writeFile(dynaFile2, '');
	await delay(500);
	await fs.writeFile(dynaFile1, 'Hello world! I am dyna-file from source1!');
	await fs.writeFile(dynaFile2, 'Hello world! I am dyna-file from source2!');
	await delay(500);
	await fs.remove(dynaFile1);
	await delay(500);
	await fs.remove(dynaFile2);
	//await delay(500);
	//debug(require('util').inspect(files, {depth: 3, colors: true}));
	// process.exit();
	//debug(res);
}())
*/