'use strict';

const path = require('path');
const fs = require('fs-extra');
const fn = {};

module.exports = fn;

fn.createFSFromObject = async (outputDir, structure) => {
	await fs.ensureDir(outputDir);

	await (async function walk (subdir, substructure) {
		subdir = subdir || '';
		substructure = substructure || structure;

		for (let filename in substructure) {
			const filepath = path.join(outputDir, subdir, filename);
			const contents = substructure[filename];

			if (typeof contents === 'string') {
				await fs.writeFile(filepath, contents);
			} else if (contents && typeof contents === 'object') {
				await fs.ensureDir(filepath);
				await walk(path.join(subdir, filename), contents);
			}
		}
	}());
};

fn.createObjectFromFS = async (dir) => {
	const result = {};

	await (async function walk (dir, obj) {
		const files = await fs.readdir(dir);

		for (let i = 0; i < files.length; ++i) {
			const filename = files[i];
			const filepath = path.join(dir, filename);
			const isDirectory = (await fs.stat(filepath)).isDirectory();

			if (!isDirectory) {
				obj[filename] = (await fs.readFile(filepath)).toString();
			} else {
				await walk(filepath, (obj[filename] = {}));
			}
		}
	}(dir, result));

	return result;
};