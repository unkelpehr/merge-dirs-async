const fs = require('fs-extra');
const path = require('path');
const {test} = require('ava');
const merge = require('../../index');
const helpers = require('../helpers');

const FSObject = {
	source1: {
		'1.0.0.txt': 'i am source1-1.0.0.txt',
		'1.0.1.txt': 'i am source1-1.0.1.txt',
		'1.0.2.txt': 'i am source1-1.0.2.txt',
		'1.0.3': {
			'1.1.0.txt': 'i am source1-1.1.0.txt',
			'1.1.1.txt': 'i am source1-1.1.1.txt',
			'1.1.2.txt': 'i am source1-1.1.2.txt',
			'1.1.3': {
				'1.2.0.txt': 'i am source1-1.2.0.txt',
				'1.2.1.txt': 'i am source1-1.2.1.txt',
				'1.2.2.txt': 'i am source1-1.2.2.txt',
				'1.2.3': {
					'1.3.0.txt': 'i am source1-1.3.0.txt',
					'1.3.1.txt': 'i am source1-1.3.1.txt',
					'1.3.2.txt': 'i am source1-1.3.2.txt',
				},
				'1.2.4': {
					'1.3.0.txt': 'i am source1-1.3.0.txt',
					'1.3.1.txt': 'i am source1-1.3.1.txt',
					'1.3.2.txt': 'i am source1-1.3.2.txt',
				},
				'1.2.5': {
					'1.3.0.txt': 'i am source1-1.3.0.txt',
					'1.3.1.txt': 'i am source1-1.3.1.txt',
					'1.3.2.txt': 'i am source1-1.3.2.txt',
					'1.3.3.txt': 'i am source1-1.3.3.txt',
					'1.3.4.txt': 'i am source1-1.3.4.txt',
					'1.3.5.txt': 'i am source1-1.3.5.txt',
				}
			}
		}
	},

	source2: {
		'1.0.1.txt': 'i am source2-1.0.1.txt',
		'1.0.3': {
			'1.1.1.txt': 'i am source2-1.1.1.txt',
			'1.1.3': {
				'1.2.1.txt': 'i am source2-1.2.1.txt',
				'1.2.3': {
					'1.3.1.txt': 'i am source2-1.3.1.txt',
				},
				'1.2.4': {
					'1.3.1.txt': 'i am source2-1.3.1.txt',
				},
				'1.2.5': {
					'1.3.2.txt': 'i am source2-1.3.2.txt',
					'1.3.3.txt': 'i am source2-1.3.3.txt'
				}
			}
		}
	},

	source3: {
		'1.0.2.txt': 'i am source3-1.0.2.txt',
		'1.0.3': {
			'1.1.2.txt': 'i am source3-1.1.2.txt',
			'1.1.3': {
				'1.2.2.txt': 'i am source3-1.2.2.txt',
				'1.2.3': {
					'1.3.2.txt': 'i am source3-1.3.2.txt',
				},
				'1.2.4': {
					'1.3.2.txt': 'i am source3-1.3.2.txt',
				},
				'1.2.5': {
					'1.3.4.txt': 'i am source3-1.3.4.txt',
					'1.3.5.txt': 'i am source3-1.3.5.txt',
				}
			}
		}
	}
};

const expectation = {
	'1.0.0.txt': 'i am source1-1.0.0.txt',
	'1.0.1.txt': 'i am source2-1.0.1.txt',
	'1.0.2.txt': 'i am source3-1.0.2.txt',

	'1.0.3': {
		'1.1.0.txt': 'i am source1-1.1.0.txt',
		'1.1.1.txt': 'i am source2-1.1.1.txt',
		'1.1.2.txt': 'i am source3-1.1.2.txt',

		'1.1.3': {
			'1.2.0.txt': 'i am source1-1.2.0.txt',
			'1.2.1.txt': 'i am source2-1.2.1.txt',
			'1.2.2.txt': 'i am source3-1.2.2.txt',

			'1.2.3': {
				'1.3.0.txt': 'i am source1-1.3.0.txt',
				'1.3.1.txt': 'i am source2-1.3.1.txt',
				'1.3.2.txt': 'i am source3-1.3.2.txt',
			},

			'1.2.4': {
				'1.3.0.txt': 'i am source1-1.3.0.txt',
				'1.3.1.txt': 'i am source2-1.3.1.txt',
				'1.3.2.txt': 'i am source3-1.3.2.txt',
			},

			'1.2.5': {
				'1.3.0.txt': 'i am source1-1.3.0.txt',
				'1.3.1.txt': 'i am source1-1.3.1.txt',

				'1.3.2.txt': 'i am source2-1.3.2.txt',
				'1.3.3.txt': 'i am source2-1.3.3.txt',

				'1.3.4.txt': 'i am source3-1.3.4.txt',
				'1.3.5.txt': 'i am source3-1.3.5.txt',
			}
		}
	}
};

const inputDir = path.join(__dirname, 'inputDirs');
const outputDir = path.join(__dirname, 'outputDir');
const inputDirs = Object.keys(FSObject).map(src => path.join(inputDir, src));

test.before(async () => {
	await fs.remove(inputDir);
	await fs.remove(outputDir);

	await helpers.createFSFromObject(inputDir, FSObject);
});

test.after.always(async () => {
	await fs.remove(outputDir);
	await fs.remove(inputDir);
});

test(async assert => {
	const fileStructure = await merge(outputDir, ...inputDirs);

	const reality = await helpers.mapDir(outputDir);
	
	assert.deepEqual(reality, expectation);
});