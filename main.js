/* eslint-disable no-mixed-spaces-and-tabs */
'use strict';

/*
 * Created with @iobroker/create-adapter v1.23.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
// const request = require('request');
const tabletName = [];
const ip = [];
const port = [];
const password = [];
const Screen = [];
const deviceInfo = [];
const screenBrightness = [];
const bat = [];
const isScreenOn = [];
const bright = [];
const currentFragment = [];
let requestTimeout = null;
let telegramSend = false;
const User = [];

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
		this.setState('info.connection', false, true);
	
		await this.create_state();
		await this.httpLink();
		await this.stateRequest();

		const telegramUser = this.config.telegram;
		if (!telegramUser || telegramUser !== []) {
			for (const u in telegramUser) {

				User[u] = telegramUser[u].telegramUser;
				this.log.debug('read telegram user: ' +  JSON.stringify(User));
			}
			
		}
	}

	async httpLink() {
		// this.log.debug('build http Link');

		const login = this.config.devices;
		if (!login || login !== []) {
			for (const i in login) {

				ip[i] = login[i].ip;
				port[i] = login[i].port;
				password[i] = login[i].password;

				Screen[i] = 'http://' + ip[i] + ':' + port[i] + '/?cmd=screenOn&password=' + password[i];

				deviceInfo[i] = 'http://' + ip[i] + ':' + port[i] + '/?cmd=deviceInfo&type=json&password=' + password[i];

				screenBrightness[i] = 'http://' + ip[i] + ':' + port[i] + '/?cmd=setStringSetting&key=screenBrightness&value=0&password=' + password[i];

			}

		}
		this.log.debug('Screen: ' + JSON.stringify(Screen));
		this.log.debug('deviceInfo: ' + JSON.stringify(deviceInfo));
		this.log.debug('screenBrightness: ' + JSON.stringify(screenBrightness));
	}

	async stateRequest() {
		
		try {
			const deviceModel = [];
			const lastAppStart = [];
			const ipadresse = [];
			const ssid = [];
			const plugged = [];
			const appTotalMemory = [];
			const appUsedMemory = [];
			const appFreeMemory = [];
			const ramTotalMemory = [];
			const ramUsedMemory = [];
			const ramFreeMemory = [];
			const visBattery = [];

			requestTimeout = setTimeout(async () => {
				const requestUrl = deviceInfo;
				
				if (!requestUrl || requestUrl !== []) {
					let objects = [];


					for (const i in requestUrl) {
						const stateID = await this.replace(tabletName[i]);

						require('request')(requestUrl[i], async (error, response, result) => {

							// this.log.debug('Update ' + result);
							objects = JSON.parse(result);
							this.log.debug('[result] ' + JSON.stringify(objects));

							ipadresse[i] = objects.ip4;
							await this.setStateChangedAsync(`device.${stateID}.device_ip`, { val: ipadresse[i], ack: true });
							this.log.debug('IP: ' + ipadresse);

							plugged[i] = objects.plugged;
							await this.setStateChangedAsync(`device.${stateID}.Plugged`, { val: plugged[i], ack: true });
							this.log.debug('plugged ' + plugged);

							bat[i] = objects.batteryLevel;
							await this.setStateChangedAsync(`device.${stateID}.battery`, { val: bat[i], ack: true });
							this.log.debug('bat ' + bat);

							isScreenOn[i] = objects.isScreenOn;
							await this.setStateChangedAsync(`device.${stateID}.ScreenOn`, { val: isScreenOn[i], ack: true });
							this.log.debug('isScreenOn ' + isScreenOn);

							if (!isScreenOn[i]) {
								this.screenOn();
							}

							bright[i] = objects.screenBrightness;
							await this.setStateChangedAsync(`device.${stateID}.brightness`, { val: bright[i], ack: true });
							this.log.debug('bright ' + bright);

							currentFragment[i] = objects.currentFragment;
							await this.setStateChangedAsync(`device.${stateID}.active_display`, { val: currentFragment[i], ack: true });
							this.log.debug('currentFragment ' + currentFragment);

							deviceModel[i] = objects.deviceModel;
							await this.setStateChangedAsync(`device.${stateID}.deviceModel`, { val: deviceModel[i], ack: true });
							this.log.debug('deviceModel ' + deviceModel);

							lastAppStart[i] = objects.lastAppStart;
							await this.setStateChangedAsync(`device.${stateID}.LastAppStart`, { val: lastAppStart[i], ack: true });
							this.log.debug('lastAppStart ' + lastAppStart);

							appTotalMemory[i] = objects.appTotalMemory;
							await this.setStateChangedAsync(`device.${stateID}.memory_info.appTotalMemory`, { val: await this.bytesToSize(await appTotalMemory[i]), ack: true });
							this.log.debug('appTotalMemory ' + appTotalMemory);

							appUsedMemory[i] = objects.appUsedMemory;
							await this.setStateChangedAsync(`device.${stateID}.memory_info.appUsedMemory`, { val: await this.bytesToSize(await appUsedMemory[i]), ack: true });
							this.log.debug('appUsedMemory ' + appUsedMemory);

							appFreeMemory[i] = objects.appFreeMemory;
							await this.setStateChangedAsync(`device.${stateID}.memory_info.appFreeMemory`, { val: await this.bytesToSize(await appFreeMemory[i]), ack: true });
							this.log.debug('appFreeMemory ' + appFreeMemory);

							ramTotalMemory[i] = objects.ramTotalMemory;
							await this.setStateChangedAsync(`device.${stateID}.memory_info.ramTotalMemory`, { val: await this.bytesToSize(await ramTotalMemory[i]), ack: true });
							this.log.debug('ramTotalMemory ' + ramTotalMemory);

							ramUsedMemory[i] = objects.ramUsedMemory;
							await this.setStateChangedAsync(`device.${stateID}.memory_info.ramUsedMemory`, { val: await this.bytesToSize(await ramUsedMemory[i]), ack: true });
							this.log.debug('ramUsedMemory ' + ramUsedMemory);

							ramFreeMemory[i] = objects.ramFreeMemory;
							await this.setStateChangedAsync(`device.${stateID}.memory_info.ramFreeMemory`, { val: await this.bytesToSize(await ramFreeMemory[i]), ack: true });
							this.log.debug('ramFreeMemory ' + ramFreeMemory);

							ssid[i] = objects.ssid.replace(/"/gi, '');
							this.log.debug('ssid: ' + ssid);

							if (ssid[i].replace(/_/gi, ' ') == '<unknown ssid>') {
								await this.setStateChangedAsync(`device.${stateID}.ssid`, { val: 'is not supported', ack: true });
							}
							else if (ssid[i].replace(/_/gi, ' ') == '') {
								await this.setStateChangedAsync(`device.${stateID}.ssid`, { val: 'is not supported', ack: true });
							}
							else {
								await this.setStateChangedAsync(`device.${stateID}.ssid`, { val: ssid[i].replace(/_/gi, ' '), ack: true });
							}

							
							if (bat[i] <= 100) 	visBattery[i] = 10; // 100 %
							if (bat[i] <= 90) 	visBattery[i] = 9; 	// 90 %
							if (bat[i] <= 80) 	visBattery[i] = 8; 	// 80 %
							if (bat[i] <= 70) 	visBattery[i] = 7; 	// 70 %
							if (bat[i] <= 60) 	visBattery[i] = 6; 	// 60 %
							if (bat[i] <= 50) 	visBattery[i] = 5; 	// 50 %
							if (bat[i] <= 40) 	visBattery[i] = 4; 	// 40 %
							if (bat[i] <= 30)	visBattery[i] = 3; 	// 30 %
							if (bat[i] <= 20) 	visBattery[i] = 2; 	// 20 %
							if (bat[i] <= 10) 	visBattery[i] = 1; 	// 10 %
							if (bat[i] <= 0) 	visBattery[i] = 0; 	// empty
							if (plugged[i]) 	visBattery[i] = 11; // Charger on
							

							this.log.debug(`${stateID} visBattery ` + bat[i] + ' ' + visBattery[i]);
							await this.setStateChangedAsync(`device.${await stateID}.state_of_charge_vis`, { val: await visBattery[i], ack: true });


							// last Info Update
							await this.setStateChangedAsync(`device.${stateID}.lastInfoUpdate`, { val: Date.now(), ack: true });




						}).on('error', (e) => {
							this.log.error('request device Info error: ' + e);
							this.setStateChangedAsync('info.connection', false, true);

						});
					}
				}
				
				this.charger();
				this.stateRequest();
			}, parseInt(this.config.interval) * 1000);
		} catch (error) {
			this.log.error(`[stateRequest] : ${error.message}, stack: ${error.stack}`);
		}
	}


	async charger() {
		try{
			const loadStop = [];
			const chargerid = [];
			const loadStart = [];
			const power_mode = [];
			const chargeDevice = [];
			const chargeDeviceValue = [];
			
			
			const charger = this.config.charger;
			const telegram_enabled =  JSON.parse(this.config.telegram_enabled);
	
			if (!charger || charger !== []) {
				for (const i in charger) {

					chargerid[i] = charger[i].chargerid;
					power_mode[i] = JSON.parse(charger[i].power_mode);
					loadStart[i] = JSON.parse(charger[i].loadStart);
					loadStop[i] = JSON.parse(charger[i].loadStop);
					

					chargeDevice[i] = await this.getForeignStateAsync(chargerid[i]);
				 	chargeDeviceValue[i] = chargeDevice[i].val;
					
					this.log.debug(`chargerid: ` + JSON.stringify(chargerid[i]) + ` val: ` + chargeDeviceValue[i]);
				
					if (await power_mode[i] == true) {

						if (bat[i] <= loadStart[i] && !chargeDeviceValue[i]) await this.setForeignStateAsync(await chargerid[i], true, false);

						if (bat[i] <= loadStart[i] && !chargeDeviceValue[i]) this.log.info(`${await tabletName[i]} Loading started`);

						if (bat[i] >= loadStop[i] && chargeDeviceValue[i]) await this.setForeignStateAsync(await chargerid[i], false, false);

						if (bat[i] >= loadStop[i] && chargeDeviceValue[i]) this.log.info(`${await tabletName[i]} Charging cycle ended`);

					} else {

						if (!chargeDeviceValue[i]) 	this.setForeignStateAsync(chargerid[i], true, false);
						if (!chargeDeviceValue[i]) 	this.log.info(`${await tabletName[i]} Continuous current`);
					}

					
					if (telegram_enabled === true) {
						
						if (bat[i] <= 18 && !telegramSend  && !chargeDeviceValue[i]) {
							telegramSend = true;
							this.onMessage(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!`, User);
							this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + `  ${await tabletName[i]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!` );
							this.setForeignStateAsync(await chargerid[i], true, false);

						} else if (bat[i] > 18 && telegramSend  && chargeDeviceValue[i])  {
							telegramSend = false;
							this.onMessage(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet is charging the problem has been fixed.`, User);
							this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet is charging the problem has been fixed.` );
						}
						
					} else {

						if (bat[i] <= 18 && !chargeDeviceValue[i]) {
							telegramSend = true;
							this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!` );
							this.setForeignStateAsync(await chargerid[i], true, false);

						} else if (bat[i] > 18 && chargeDeviceValue[i])  {
							telegramSend = false;
							this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet is charging the problem has been fixed.` );
						}

					}


				}


			}
		} catch (error) {
			this.log.error(`[charger] : ${error.message}, stack: ${error.stack}`);
		}
	}


	async screenOn() {
		try {
			const screen_on = JSON.parse(this.config.screen_on);

			if (screen_on) {

				for (const s in isScreenOn) {

					if (isScreenOn[s] == false) {

						this.log.warn(`[ATTENTION] Screen from ${await tabletName[s]} has been switched off Screen is being switched on again`);

						this.sendCommand(Screen[s], `${await tabletName[s]} screenON()`);
					}
				}
			}
		} catch (error) {
			this.log.error(`[screenOn] : ${error.message}, stack: ${error.stack}`);
		}
	}


	async sendCommand(link, log) {
		require('request')(link, async (error) => {

			this.log.debug('request carried out for: ' + link);
			if (error) this.log.error('### Error request from ' + log + ': ' + error);
	
		});
	}

	async convert_percent(str) {
		if (Number.isNaN(str)) {
			return 0;
		}
		return str / 100 * 255;
	}

	async bytesToSize(bytes) {
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		if (bytes == 0) return '0 Byte';
		// @ts-ignore
		const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
		// @ts-ignore
		return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
	}


	async replace(str) {
		if (str) {
			str = str.replace(/ü/g, 'ue');
			str = str.replace(/Ü/g, 'Ue');
			str = str.replace(/ö/g, 'oe');
			str = str.replace(/Ö/g, 'Oe');
			str = str.replace(/Ä/g, 'Ae');
			str = str.replace(/ä/g, 'ae');
			str = str.replace(/\.*\./gi, '_');
			str = str.replace(/ /gi, '_');
			str = str.toLowerCase();
			return str;
		}
	}


	async create_state() {

		try {

			this.log.debug(`create_state start`);
			// const tablet = this.config.screen;
			const tablet = this.config.devices;
			if (!tablet || tablet !== []) {
				for (const i in tablet) {

					tabletName[i] = tablet[i].name;
				}

			}

			this.log.debug('tabletName: ' + JSON.stringify(tabletName));


			for (const name in tabletName) {
				//this.log.info(name);
				const stateID = await this.replace(tabletName[name]);
				const stateName = await tabletName[name];

				await this.extendObjectAsync(`device.${stateID}.device_ip`, {
					type: 'state',
					common: {
						name: `${stateName} device ip`,
						type: 'string',
						def: '',
						role: 'info.ip',
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.deviceModel`, {
					type: 'state',
					common: {
						name: `${stateName} device Model`,
						type: 'string',
						role: 'info.name',
						def: '',
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.ssid`, {
					type: 'state',
					common: {
						name: `${stateName} Wlan ssid`,
						type: 'string',
						def: '',
						role: 'info',
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.Plugged`, {
					type: 'state',
					common: {
						name: `${stateName} power plugged`,
						type: 'boolean',
						role: 'switch',
						def: false,
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.battery`, {
					type: 'state',
					common: {
						name: `${stateName} battery in percent`,
						type: 'number',
						role: 'battery.percent',
						max: 100,
						min: 0,
						def: 0,
						unit: '%',
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.ScreenOn`, {
					type: 'state',
					common: {
						name: `${stateName} is screen on`,
						type: 'boolean',
						role: 'switch',
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.brightness`, {
					type: 'state',
					common: {
						name: `${stateName} brightness`,
						type: 'number',
						role: 'level.dimmer',
						max: 255,
						min: 0,
						def: 0,
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.active_display`, {
					type: 'state',
					common: {
						name: `${stateName} active display`,
						type: 'string',
						role: 'info',
						def: '',
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.lastInfoUpdate`, {
					type: 'state',
					common: {
						name: `${stateName} Date/Time of last information update from Fully Browser`,
						type: 'number',
						role: 'value.time',
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.LastAppStart`, {
					type: 'state',
					common: {
						name: `${stateName} Last App Start`,
						type: 'string',
						role: 'info',
						def: '',
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.manualBrightness`, {
					type: 'state',
					common: {
						name: `${stateName} manual Brightness in percent`,
						type: 'number',
						role: 'level.dimmer',
						unit: '%',
						max: 100,
						min: 0,
						def: 0,
						write: true
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.state_of_charge_vis`, {
					type: 'state',
					common: {
						name: `${stateName} State of charge for the Vis`,
						type: 'number',
						role: 'value.battery',
						max: 100,
						min: 0,
						def: 0,
						write: false,
						states: {
							0: 'leer',
							1: '10 %',
							2: '20 %',
							3: '30 %',
							4: '40 %',
							5: '50 %',
							6: '60 %',
							7: '70 %',
							8: '80 %',
							9: '90 %',
							10: '100 %',
							11: 'Lade'
						}
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.memory_info.appTotalMemory`, {
					type: 'state',
					common: {
						name: `${stateName} app Total Memory`,
						type: 'string',
						role: 'info',
						def: '',
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.memory_info.appUsedMemory`, {
					type: 'state',
					common: {
						name: `${stateName} app Used Memory`,
						type: 'string',
						role: 'info',
						def: '',
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.memory_info.appFreeMemory`, {
					type: 'state',
					common: {
						name: `${stateName} app Free Memory`,
						type: 'string',
						role: 'info',
						def: '',
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.memory_info.ramTotalMemory`, {
					type: 'state',
					common: {
						name: `${stateName} ram Total Memory`,
						type: 'string',
						role: 'info',
						def: '',
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.memory_info.ramUsedMemory`, {
					type: 'state',
					common: {
						name: `${stateName} ram Used Memory`,
						type: 'string',
						role: 'info',
						def: '',
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.memory_info.ramFreeMemory`, {
					type: 'state',
					common: {
						name: `${stateName} ram Free Memory`,
						type: 'string',
						role: 'info',
						def: '',
						write: false
					},
					native: {},
				});

				this.subscribeStates(`tablet-control.0.device.${stateID}.manualBrightness`);

			}

			this.setState('info.connection', true, true);

		} catch (error) {
			this.log.error(`[create_state] : ${error.message}, stack: ${error.stack}`);

		}

	}


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
	// this.subscribeStates('*');

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

			if (requestTimeout) clearTimeout(requestTimeout);

			this.log.info('Adapter stopped...');
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
			this.log.debug(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.debug(`object ${id} deleted`);
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
			this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);

		} else {
			// The state was deleted
			this.log.debug(`state ${id} deleted`);
		}
	}

	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.message" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */

	onMessage(msg,user) {
		// e.g. send email or pushover or whatever
		this.log.debug('send command');

		this.sendTo('telegram.0', 'send', {
			text: msg,
			user: user
		});
	}
}

// 	onMessage(obj,msg,telegramUser) {
// 		this.log.info('send command');
// 		if (typeof obj === 'object' && obj.message) {
// 			if (obj.command === 'send') {
// 				// e.g. send email or pushover or whatever
// 				this.log.info('send command');

// 				// Send response in callback if required
// 				// if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
// 		
// 			}
// 		}
// 	}
// }

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