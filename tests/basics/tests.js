const fs = require('fs-extra');
const path = require('path');
const {test} = require('ava');
const merge = require('../../index');
const outputDir = path.join(__dirname, 'outputDir');

test.after.always(async () => fs.remove(outputDir));

test('Basic expectations of what merge-dirs-async exports', assert => {
	const expect = [
		 'FileStructure'
	].sort();

	assert.is(typeof merge, 'function');
	assert.deepEqual(expect, Object.keys(merge).sort());
});