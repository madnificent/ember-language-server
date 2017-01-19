/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { basename, dirname } from 'path';

import {
	IPCMessageReader, IPCMessageWriter,
	createConnection, IConnection,
	TextDocuments, InitializeResult,
} from 'vscode-languageserver';

const klaw = require('klaw');

// Create a connection for the server. The connection uses Node's IPC as a transport
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites. 
let workspaceRoot: string;
connection.onInitialize((params): InitializeResult => {
	workspaceRoot = params.rootPath;

	findProjectRoots(workspaceRoot);

	return {
		capabilities: {
			// Tell the client that the server works in FULL text document sync mode
			textDocumentSync: documents.syncKind,
		}
	}
});

const ignoredFolders: string[] = [
	'.git',
	'bower_components',
	'node_modules',
	'tmp',
];

function findProjectRoots(workspaceRoot: string) {
	let filter = it => ignoredFolders.indexOf(basename(it)) === -1;

	klaw(workspaceRoot, { filter }).on('data', item => {
		if (basename(item.path) === 'ember-cli-build.js') {
			console.log(`Ember CLI project found at ${dirname(item.path)}`);
		}
	});
}

documents.onDidChangeContent((change) => {
	// here be dragons
});

connection.onDidChangeWatchedFiles((change) => {
	// here be dragons
});

// Listen on the connection
connection.listen();