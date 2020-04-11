'use strict';

/*
 * Created with @iobroker/create-adapter v1.23.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const request = require('request');
// Load your modules here, e.g.:
// const fs = require("fs");

class TabletControl extends utils.Adapter {

	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'tablet-control',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('objectChange', this.onObjectChange.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here

		const telegram = this.config.user;
		const telegramUser = [];
		if (!telegram || telegram !== []) {
			for (const i in telegram) {
				console.log(telegram[i]);
				telegramUser.push(telegram[i].name);
			}

		}

		const devicesTemp = this.config.devices;

		const name = [];
		const ip = [];
		const port = [];
		const psw = [];
		const mt = [];
		const charge = [];

		if (!devicesTemp || devicesTemp !== []) {
			for (const i in devicesTemp) {
				name.push(devicesTemp[i].name);
				ip.push(devicesTemp[i].ip);
				port.push(devicesTemp[i].port);
				psw.push(devicesTemp[i].psw);
				mt.push(devicesTemp[i].mt);
				charge.push(devicesTemp[i].charge);
			}

		},

		this.log.warn('name: ' + name);
		this.log.warn('ip: ' + ip);
		this.log.warn('port: ' + port);
		this.log.warn('psw: ' + psw);
		this.log.warn('mt: ' + mt);
		this.log.warn('charge: ' + charge);
		this.log.warn('telegram: ' + telegram);
		this.log.warn('config interval: ' + this.config.interval);
		this.log.warn('config active: ' + this.config.active);
		this.log.warn('config motionsensor: ' + this.config.motionsensor);

		var statusURL = 'http://' + ip[0] + ':' + port[0] + '/?cmd=deviceInfo&type=json&password=' + psw[0];

		this.log.info(JSON.stringify(statusURL));

		var thisOptions = {
			uri: statusURL,
			method: "GET",
			timeout: 2000,
			followRedirect: false,
			maxRedirects: 0
		};

		request(thisOptions, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				let fullyInfoObject = JSON.parse(body);

				this.log.info('fullyInfoObject: ' + fullyInfoObject);

				//for (let lpEntry in fullyInfoObject) {
				//	let lpType = typeof fullyInfoObject[lpEntry]; // get Type of variable as String, like string/number/boolean

				//	vari = adapter.namespace + '.' + id + '.' + infoStr + '.' + lpEntry;
				//	if (fullyInfoObject[lpEntry] !== undefined
				//		&& fullyInfoObject[lpEntry] !== null) {
				//		adapter.setState(vari, fullyInfoObject[lpEntry], true);
				//		adapter.log.debug(vari + ' ' + fullyInfoObject[lpEntry]);
				//	}
				// }
				//vari = adapter.namespace + '.' + id + '.isFullyAlive';
				this.setState('info.connection', true, true);
			} else {
				vari = adapter.namespace + '.' + id + '.isFullyAlive';
				adapter.setState(vari, false, true);
			}
		});

		// Reset the connection indicator during startup
		// this.setState('info.connection', true, true);

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:

		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
		//await this.setObjectAsync('testVariable', {
		//	type: 'state',
		//	common: {
		//		name: 'testVariable',
		//		type: 'boolean',
		//		role: 'indicator',
		//		read: true,
		//		write: true,
		//	},
		//	native: {},
		//});

		//// in this template all states changes inside the adapters namespace are subscribed
		//this.subscribeStates('*');

		///*
		//setState examples
		//you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		//*/
		//// the variable testVariable is set to true as command (ack=false)
		//await this.setStateAsync('testVariable', true);

		//// same thing, but the value is flagged "ack"
		//// ack should be always set to true if the value is received from or acknowledged from the target system
		//await this.setStateAsync('testVariable', { val: true, ack: true });

		//// same thing, but the state is deleted after 30s (getState will return null afterwards)
		//await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

		//// examples for the checkPassword/checkGroup functions
		//let result = await this.checkPasswordAsync('admin', 'iobroker');
		//this.log.info('check user admin pw iobroker: ' + result);

		//result = await this.checkGroupAsync('admin', 'admin');
		//this.log.info('check group user admin group admin: ' + result);
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			this.log.info('cleaned everything up...');
			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed object changes
	 * @param {string} id
	 * @param {ioBroker.Object | null | undefined} obj
	 */
	onObjectChange(id, obj) {
		if (obj) {
			// The object was changed
			this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.info(`object ${id} deleted`);
		}
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.message" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === 'object' && obj.message) {
	// 		if (obj.command === 'send') {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info('send command');

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
	// 		}
	// 	}
	// }

}

// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new TabletControl(options);
} else {
	// otherwise start the instance directly
	new TabletControl();
}