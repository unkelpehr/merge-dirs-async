'use strict';

const path = require('path');
const debug = require('debug')('merge-dirs-async');
const createFs = require('./fs');

class FileStructure {
	constructor (outputDir, inputDirs, options) {
		this.outputDir = outputDir;
		this.inputDirs = inputDirs;

		this.fs = createFs(this);
		this.files = {};

		this.maxRetries = 10;
		this.retryStrategy = (err, tries) => tries * 100;
		this.dereferenceSymlinks = false;
		this.preserveTimestamps = false;
		this.truncateTarget = false;
		this.trackChanges = false;

		Object.assign(this, options);

		if (options.verbose !== undefined) {
			debug.enabled = options.verbose;
		}
	}

	/**
	 * Adds the file at given source `filepath` to the internal `files` object and,
	 * if the optional filter-callback allows it, copies it into the `outputDir`.
	 *
	 * If there is already a file in `outputDir` sharing the same path the file will
	 * be saved internally but not copied into `outputDir` at this time. 
	 * @param {String} filepath Filepath to file to be added.
	 */
	async add (filepath, recursive, __source) {
		var target,
			inputDir,
			relativePath;

		if (__source) {
			target = __source.target;
			filepath = __source.absolutePath;
		} else {
			target = this.resolve(filepath, true).target;
		}

		inputDir = this.inputDirs.find(dir => filepath.indexOf(dir) === 0);
		relativePath = path.relative(inputDir, filepath);

		// Create a new `target` if it didn't already exist.
		if (!target) {
			const files = this.files;
			const outputDir = this.outputDir;

			target = files[relativePath] = {
				absolutePath: path.join(outputDir, relativePath),
				relativePath,
				sources: [],
			};
		}

		// Create this `source` object.
		const source = __source || {
			absolutePath: filepath,
			relativePath: target.relativePath,
			stats: await this.fs.stat(filepath),
			target: target,
			source: inputDir
		};

		// Push this `source` into the `target` object.
		if (!__source) {
			target.sources.push(source);
		}

		//source.ignored = (filter ? await filter(srcs, dest) : true) !== false;

		const write = target.sources[0].absolutePath === source.absolutePath;

		// Handle case when the source is a regular file (not a directory).
		if (!source.stats.isDirectory()) {
			if (write) {
				await this.fs.copy(source.absolutePath, target.absolutePath, {
					overwrite: true,
					dereference: this.dereferenceSymlinks,
					preserveTimestamps: this.preserveTimestamps
				});
			}

			if (__source) {
				debug((write ? 'Copied' : 'Added backup') + ` ${path.join(path.basename(inputDir), source.relativePath)}, from a subsequent source`);
			} else {
				debug((write ? 'Copied' : 'Added backup') + ` ${path.join(path.basename(inputDir), source.relativePath)}`);
			}

			return source;
		}

		// Handle case when the source is a directory.
		if (write) {
			await this.fs.ensureDir(target.absolutePath);
			debug(`Created ${target.relativePath}`);
		}

		// Just internally by the watcher.
		// Otherwise we'd first recursively copy all files from the newly added folder,
		// and then chokidar would catch up and emit `add` on all files,
		// effectively creating duplicates for each subfiles and folder.
		if (recursive !== false) {
			const subfiles = await this.fs.readdir(source.absolutePath);
			
			for (let i = 0; i < subfiles.length; ++i) {
				await this.add(path.join(source.absolutePath, subfiles[i]));
			}
		}

		return source;
	}

	/**
	 * Removes the file associated given `filepath` from the `outputDir`
	 * directory and the internal `files` object.
	 *
	 * TODO:
	 * If the originating call is from e.g. a watcher, and a merge has
	 * not been performed, `this.resolve` will throw if a user removes
	 * a file in on of the sources. 
	 * 
	 * @param  {String} filepath Filepath to file to be removed.
	 * @return {Promise}         Resolves to `this`.
	 */
	async remove (filepath, __originatingChild) {
		const files = this.files;
		const {target, source} = this.resolve(filepath);
		const isDir = source.stats.isDirectory();
		
		// Remove the file from `outputDir`
		if (isDir) {
			target.deleted = true;

			const code = await this.fs.rmdir(target.absolutePath);

			if (code === 'ENOTEMPTY') {
				debug(`Could not remove directory "${target.relativePath}" yet, because it is not empty`);
				return this;
			} else if (code === 'ENOENT') {
				return this; // Already deleted, TODO: but is the file object removed?
			}
		} else {
			await this.fs.remove(target.absolutePath);
		}

		// Remove the file entry
		target.sources.splice(target.sources.indexOf(source), 1);

		// Delete the entry and return if there is no files left
		if (target.sources.length === 0) {
			delete files[target.relativePath];

			debug(`Removed ${isDir ? 'directory' : 'regular file'} "${source.relativePath}", no backup available`);

			const dirname = path.dirname(source.relativePath);
			const parentTarget = files[dirname];

			if (parentTarget && parentTarget.deleted) {
				//debug('plz remove parent %O', parentTarget);
				await this.remove(parentTarget.sources[0].absolutePath, target);
			}
		} else {
			debug(`Removed ${isDir ? 'directory' : 'regular file'} "${source.relativePath}", backup available`);

			// Otherwise add the next source.
			await this.add(null, null,  target.sources[0]);
		}

		return this;
	}

	/**
	 * Resolves the internal `target` and `source` objects associated with the given `filepath`.
	 * @param  {String} filepath Filepath to be resolved.
	 * @param  {Boolean} silent   If true, the function will not throw an error if the objects could not be resolved.
	 * @return {Object}          {`target`, `source`} or an empty object if `silent` is TRUE and the objects could not be resolved.
	 */
	resolve (filepath, silent) {
		const files = this.files;
		const inputDirs = this.inputDirs;

		if (files[filepath]) {
			const target = files[filepath];
			const source = target.sources[0];

			return {target, source};
		}

		const inputDir = this.inputDirs.find(dir => filepath.indexOf(dir) === 0) || '';
		const relativePath = path.relative(inputDir, filepath);
		const target = files[relativePath];

		if (!target) {
			if (!silent) {
				throw new Error(`Could not resolve target using path "${filepath}".`);
			}

			return {};
		}

		const source = target.sources.find(source => source.absolutePath === filepath);

		return {target, source};
	}

	async merge () {
		const outputDir = this.outputDir;
		const inputDirs = this.inputDirs;

		debug(`Beginning merge of:\n\t${inputDirs.slice().reverse().join(' ->\n\t')} ->\n\t\t${outputDir}`)

		if (this.truncateTarget) {
			await this.fs.remove(outputDir);
		}

		// Loop backwards - starting from the most significant source.
		// Otherwise we'd have to overwrite each file as we're iterating,
		// instead of just skipping files that has already been copied.
		for (let i = inputDirs.length - 1; i >= 0; --i) {
			await this.add(inputDirs[i]);
		}

		return this;
	}

	async startTracking () {
		const self = this;

		const chokidar = require('chokidar'); // Require on demand
		const options = {ignoreInitial: true};

		return new Promise(resolve => {
			self.watcher = chokidar
				.watch(self.inputDirs, options)
				.on('ready', resolve)
				.on('error', async err => {
					if (err.code !== 'EBUSY') {
						return debug('Tracker has encountered an unrecoverable error', err);
					}

					debug(`Tracker encountered ${err.code} while processing ${err.filename}. Trying to recover..`);

					const filename = err.filename;
					const {target, source} = self.resolve(filename, true);

					// It's probably AV that's locking up a pasted/moved folder.
					if (!target || !source) {
						self.add(filename);
					} else if (source) {
						self.remove(source.absolutePath);
					} else {
						throw err;
					}
				})
				.on('all', async (event, absolutePath) => {
					//await delay(100);
					//debug(`Watcher ${event} ${absolutePath}`);

					try {
						if (event === 'change') {
							return;
							const {target, source} = self.resolve(absolutePath);

							await this.fs.copy(source.absolutePath, target.absolutePath, {
								overwrite: true,
								dereference: self.dereferenceSymlinks,
								preserveTimestamps: self.preserveTimestamps
							});
						} else if (event === 'add' || event === 'addDir') {
							await self.add(absolutePath, false);
						} else if (event === 'unlink' || event === 'unlinkDir') {
							await self.remove(absolutePath);
						}
					} catch (err) {
						debug('Tracker has encountered an unrecoverable error', err);
					}
				});
		});
	}

	stopTracking () {
		this.watchers.forEach(watcher => {
			watcher.unwatch();
			watcher.close();
		});

		return this;
	}
}

module.exports = FileStructure;