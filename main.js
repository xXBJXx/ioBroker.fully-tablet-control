'use strict';

/*
 * Created with @iobroker/create-adapter v1.23.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
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
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here
		// Reset the connection indicator during startup
		this.setState('info.connection', true, true);

		await this.test();
		// await this.getAllRooms();
		//await this.tests();
		
		
	}

	// The adapters config (in the instance object everything under the attribute "native") is accessible via
	// this.config:
	//this.log.info('config option1: ' + this.config.option1);
	//this.log.info('config option2: ' + this.config.option2);

	/*
	For every state in the system there has to be also an object of type state
	Here a simple template for a boolean variable named "testVariable"
	Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
	*/
	// async tests() {

	// 	const raum = await this.getAllRooms();

	// 	//this.log.info('2 ' + raum);
		
	// 	for (const o in raum) {

	// 		//this.log.info('3 ' + raum);
	// 	}


	// }

		
	
	async test() {
		const rooms = [];
		const chargerid = [];
		const power_mode = [];
		const loadStart = [];
		const loadStop = [];


		const brightness = this.config.brightness;
		const charger = this.config.charger;
		this.log.info('JSON.stringify(charger): ' + JSON.stringify(charger));
		this.log.info('JSON.stringify(charger): ' + JSON.stringify(brightness));
		if (!charger || charger !== []){
			for (const i in charger) {
				console.log(charger[i]);
				
				chargerid[i] = charger[i].chargerid;
				power_mode[i] = charger[i].power_mode;
				loadStart[i] = charger[i].loadStart;
				loadStop[i] = charger[i].loadStop;
				rooms[i] = charger[i].room.replace(/enum.rooms./gi, '');
			}
			this.log.info(JSON.stringify('rooms ' + rooms));
			this.log.info(JSON.stringify('chargerid ' + chargerid));
			this.log.info(JSON.stringify('powerMode ' + power_mode));
			this.log.info(JSON.stringify('loadStart ' + loadStart));
			this.log.info(JSON.stringify('loadStop ' + loadStop));
		}
		
	}

	// async getAllRooms() {


	// const allRooms = {};
	// const rooms = await this.getEnumAsync('rooms');
	// if (!rooms) {

	// 	this.log.info(`Cannot get room data`);
	// } else {
	// 	//this.log.info('romms ' + rooms);
	// 	const raeume = rooms.result;
	// 	let arrayIndex = 0;
	// 	for (const room in raeume) {
	// 		//this.log.info('loop raeme ' + room );
	// 		//this.log.info('loop raeme ' + raeume[room].common.name);
	// 		allRooms[arrayIndex] = raeume[room].common.name;
	// 		arrayIndex = arrayIndex + 1;

	// 		this.log.info('romms1 ' + JSON.stringify(raeume[room].common.name));
	// 		this.log.info('romms2 ' + JSON.stringify(allRooms));
	// 	}

	// }

	// return allRooms;
	// }

	// async statesCreate() {
	// 	await this.setObjectAsync('testVariable', {
	// 		type: 'state',
	// 		common: {
	// 			name: 'testVariable',
	// 			type: 'boolean',
	// 			role: 'indicator',
	// 			read: true,
	// 			write: true,
	// 		},
	// 		native: {},
	// 	});

	// 	// in this template all states changes inside the adapters namespace are subscribed
	// 	this.subscribeStates('*');

	// 	/*
	// 	setState examples
	// 	you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
	// 	*/
	// 	// the variable testVariable is set to true as command (ack=false)
	// 	await this.setStateAsync('testVariable', true);

	// 	// same thing, but the value is flagged "ack"
	// 	// ack should be always set to true if the value is received from or acknowledged from the target system
	// 	await this.setStateAsync('testVariable', { val: true, ack: true });

	// 	// same thing, but the state is deleted after 30s (getState will return null afterwards)
	// 	await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

	// 	// examples for the checkPassword/checkGroup functions
	// 	let result = await this.checkPasswordAsync('admin', 'iobroker');
	// 	this.log.info('check user admin pw iobroker: ' + result);

	// 	result = await this.checkGroupAsync('admin', 'admin');
	// 	this.log.info('check group user admin group admin: ' + result);
	// }

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			this.log.info('cleaned everything up...');
			this.setState('info.connection', false, true);
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

	onMessage(obj,allRooms) {
		this.log.info('send command');
		if (typeof obj === 'object' && obj.message) {
			if (obj.command === 'send') {
				// e.g. send email or pushover or whatever
				this.log.info('send command');
				const raum = allRooms;
				// Send response in callback if required
				if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);

				switch (obj.command) {
					case 'enums':
						if (obj.callback) {
							this.log.info('Request enums');
							
							this.sendTo(obj.from, obj.command, raum, obj.callback);
								
						}
						break;
					default:
						this.log.warn('Unknown command: ' + obj.command);
						break;
				}
			}
		}
	}

	// onMessage(obj) {
	// 	if (obj) {
	// 		switch (obj.command) {

	// 			case 'enums':
	// 				if (obj.callback) {
	// 					this.log.info('Request enums');
	// 					//alexaSH2 && alexaSH2.updateDevices(() => {

	// 					this.sendTo(obj.from, obj.command, alexaSH2.getEnums(), obj.callback);
	// 					//this.setState('smart.updates', false, true);
	// 					this.log.warn('Enums: ' + alexaSH2);
	// 					//});
	// 				}
	// 				break;

	// 			default:
	// 				this.log.warn('Unknown command: ' + obj.command);
	// 				break;
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