const fs = require('fs-extra');
const path = require('path');
const {test} = require('ava');
const merge = require('../../index');
const helpers = require('../helpers');

const inputDirs = path.join(__dirname, 'inputDirs');
const outputDir = path.join(__dirname, 'outputDir');

const FSObject = {
	source1: {
		'file1.txt': 'i am file1.txt',
		'file2.txt': 'i am file2.txt',
		'file3.txt': 'i am file3.txt',
		'file4.txt': 'i am file4.txt',
		'file5.txt': 'i am file5.txt'
	}
};

test.before(async () => helpers.createFSFromObject(inputDirs, FSObject));

test.after.always(async () => {
	//await fs.remove(inputDirs);
	//await fs.remove(outputDir);
});

test('One target, one level', async assert => {
	await merge(outputDir, path.join(inputDirs, 'source1'));

	const writtenFSObject = await helpers.createObjectFromFS(outputDir);
		
	assert.deepEqual(writtenFSObject, FSObject);
});