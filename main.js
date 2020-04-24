/* eslint-disable no-mixed-spaces-and-tabs */
'use strict';

/*
 * Created with @iobroker/create-adapter v1.23.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const { default: axios } = require('axios');
const schedule = require('cron').CronJob; // Cron Scheduler

const tabletName = [];
const ip = [];
const port = [];
const password = [];
const Screen = [];
const deviceInfo = [];
let requestTimeout = null;
const User = [];
const telegramStatus = [];
const isScreenOn = [];
const brightness = [];
const currentFragment = [];
const bat = [];
const chargeDeviceValue = [];


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

		//read Testegram user 
		const telegramUser = this.config.telegram;
		if (!telegramUser || telegramUser !== []) {
			for (const u in telegramUser) {
				User[u] = telegramUser[u].telegramUser;
				this.log.debug('read telegram user: ' + JSON.stringify(User));
			}

		}

		//telegramSendStatus set default state false for all devices
		const temp = this.config.devices;
		if (!temp || temp !== []) {
			for (const t in temp) {
				telegramStatus[t] = false;
				this.log.debug('read telegram user: ' + JSON.stringify(telegramStatus));
			}

		}
		await this.httpLink();
		await this.create_state();
		
		await this.stateRequest();
		await this.dayBri();
		await this.brightnessCron();
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

				// screenBrightness[i] = 'http://' + ip[i] + ':' + port[i] + '/?cmd=setStringSetting&key=screenBrightness&value=0&password=' + password[i];

			}

		}
		this.log.debug('Screen: ' + JSON.stringify(Screen));
		this.log.debug('deviceInfo: ' + JSON.stringify(deviceInfo));
		// this.log.debug('screenBrightness: ' + JSON.stringify(screenBrightness));
	}


	async stateRequest() {

		try {

			const requestUrl = deviceInfo;

			if (!requestUrl || requestUrl !== []) {
				let objects = [];

				const ssid = [];
				const plugged = [];
				const ipadresse = [];
				const visBattery = [];
				const deviceModel = [];
				const lastAppStart = [];

				for (const i in requestUrl) {
					const stateID = await this.replaceFunction(tabletName[i]);



					let apiResult = null;
					try {
						// Try to reach API and receive data
						apiResult = await axios.get(requestUrl[i]);
					} catch (error) {
						this.log.warn(`[stateRequest] ${tabletName[i]} Unable to contact: ${error} | ${error}`);
						continue;
					}

					const result = apiResult.data;

					objects = result;
					// this.log.debug('[result] ' + JSON.stringify(objects));

					ipadresse[i] = objects.ip4;
					this.setState(`device.${stateID}.device_ip`, { val: await ipadresse[i], ack: true });
					this.log.debug('IP: ' + ipadresse);

					plugged[i] = objects.plugged;
					this.setState(`device.${stateID}.Plugged`, { val: await plugged[i], ack: true });
					this.log.debug('plugged ' + plugged);

					bat[i] = objects.batteryLevel;
					this.setState(`device.${stateID}.battery`, { val: await bat[i], ack: true });
					this.log.debug('bat ' + bat);

					isScreenOn[i] = objects.isScreenOn;
					this.setState(`device.${stateID}.ScreenOn`, { val: await isScreenOn[i], ack: true });
					this.log.debug('isScreenOn ' + isScreenOn);

					if (!isScreenOn[i]) {
						this.screenOn();
					}

					brightness[i] = objects.screenBrightness;
					this.setState(`device.${stateID}.brightness`, { val: await brightness[i], ack: true });
					this.log.debug('bright ' + brightness);

					currentFragment[i] = objects.currentFragment;
					this.setState(`device.${stateID}.active_display`, { val: await currentFragment[i], ack: true });
					this.log.debug('currentFragment ' + currentFragment);

					deviceModel[i] = objects.deviceModel;
					this.setState(`device.${stateID}.deviceModel`, { val: await deviceModel[i], ack: true });
					this.log.debug('deviceModel ' + deviceModel);

					lastAppStart[i] = objects.lastAppStart;
					this.setState(`device.${stateID}.LastAppStart`, { val: await lastAppStart[i], ack: true });
					this.log.debug('lastAppStart ' + lastAppStart);

					ssid[i] = objects.ssid.replace(/"/gi, '');
					this.log.debug('ssid: ' + ssid);

					if (ssid[i].replace(/_/gi, ' ') == '<unknown ssid>') {
						this.setState(`device.${stateID}.ssid`, { val: 'is not supported', ack: true });
					}
					else if (ssid[i].replace(/_/gi, ' ') == '') {
						this.setState(`device.${stateID}.ssid`, { val: 'is not supported', ack: true });
					}
					else {
						this.setState(`device.${stateID}.ssid`, { val: ssid[i].replace(/_/gi, ' '), ack: true });
					}

					if (bat[i] <= 100) visBattery[i] = 10; // 100 %
					if (bat[i] <= 90) visBattery[i] = 9; 	// 90 %
					if (bat[i] <= 80) visBattery[i] = 8; 	// 80 %
					if (bat[i] <= 70) visBattery[i] = 7; 	// 70 %
					if (bat[i] <= 60) visBattery[i] = 6; 	// 60 %
					if (bat[i] <= 50) visBattery[i] = 5; 	// 50 %
					if (bat[i] <= 40) visBattery[i] = 4; 	// 40 %
					if (bat[i] <= 30) visBattery[i] = 3; 	// 30 %
					if (bat[i] <= 20) visBattery[i] = 2; 	// 20 %
					if (bat[i] <= 10) visBattery[i] = 1; 	// 10 %
					if (bat[i] <= 0) visBattery[i] = 0; 	// empty
					if (plugged[i]) visBattery[i] = 11; // Charger on

					this.log.debug(`visBattery ` + bat[i] + ' ' + visBattery[i]);
					this.setState(`device.${await stateID}.state_of_charge_vis`, { val: await visBattery[i], ack: true });

					// last Info Update
					this.setState(`device.${stateID}.lastInfoUpdate`, { val: Date.now(), ack: true });
					this.log.debug('lastInfoUpdate: ' + Date.now());

				}
			}

			this.charger();

			requestTimeout = setTimeout(async () => {

				this.stateRequest();
			}, parseInt(this.config.interval) * 1000);
		} catch (error) {
			this.log.error(`[stateRequest] : ${error.message}, stack: ${error.stack}`);
		}
	}

	async charger() {

		const loadStop = [];
		const chargerid = [];
		const loadStart = [];
		const power_mode = [];
		const chargeDevice = [];
		// const chargeDeviceValue = [];

		const charger = this.config.charger;
		const telegram_enabled = JSON.parse(this.config.telegram_enabled);

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

					if (await bat[i] <= loadStart[i] && !chargeDeviceValue[i]) {

						await this.setForeignStateAsync(await chargerid[i], true, false);
						this.log.info(`${await tabletName[i]} Loading started`);

					} else if (await bat[i] >= loadStop[i] && chargeDeviceValue[i]) {

						await this.setForeignStateAsync(await chargerid[i], false, false);
						this.log.info(`${await tabletName[i]} Charging cycle ended`);
					}

				} else {

					if (!chargeDeviceValue[i]) this.setForeignStateAsync(chargerid[i], true, false);
					if (!chargeDeviceValue[i]) this.log.info(`${await tabletName[i]} Continuous current`);
				}

				if (telegram_enabled === true) {

					if (await bat[i] <= 18 && !chargeDeviceValue[i] && !telegramStatus[i] || bat[i] <= 18 && chargeDeviceValue[i] && !telegramStatus[i]) {
						telegramStatus[i] = true;
						this.onMessage(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!`, User);
						this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + `  ${await tabletName[i]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!`);
						this.setForeignStateAsync(await chargerid[i], true, false);

					} else if (await bat[i] > 18 && chargeDeviceValue[i] && telegramStatus[i]) {
						telegramStatus[i] = false;
						this.onMessage(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet is charging the problem has been fixed.`, User);
						this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet is charging the problem has been fixed.`);
					}

				} else {

					if (await bat[i] <= 18 && !chargeDeviceValue[i] || bat[i] <= 18 && chargeDeviceValue[i]) {
						this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!`);
						this.setForeignStateAsync(await chargerid[i], true, false);

					} else if (await bat[i] > 18 && chargeDeviceValue[i]) {
						this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet is charging the problem has been fixed.`);
					}

				}


			}


		}

	}

	async nightBri() {
		const brightnessNight = [];
		const nightBrightness = [];
		const brightnessN = this.config.brightness;

		if (!brightnessN || brightnessN !== []) {
			for (const b in brightnessN) {
				brightnessNight[b] = Math.round(await this.convert_percent(brightnessN[b].nightBrightness));
				nightBrightness[b] = 'http://' + ip[b] + ':' + port[b] + '/?cmd=setStringSetting&key=screenBrightness&value=' + brightnessNight[b] + '&password=' + password[b];

				if (await brightness[b] == 0) {

					this.log.debug(`The brightness from ${await tabletName[b]} is ${await brightness[b]}  change is not necessary`);
				}
				else {
					this.sendCommand(await nightBrightness[b], `${await tabletName[b]}  nightBri()`);
				}
			}
		}
	}

	async brightnessCron() {

		const checkInterval = this.config.checkInterval;
		const dayTime = this.config.dayTime;
		const nightTime = this.config.nightTime;
		this.log.debug('checkInterval ' + checkInterval);
		this.log.debug('dayTime ' + dayTime);
		this.log.debug('nightTime ' + nightTime);

		const neightBriCron = new schedule('*/' + checkInterval + ' ' + '0' + '-' + (dayTime - 1) + ',' + nightTime +' * * *', async () => {
			this.log.debug('night [ */' + checkInterval + ' ' + '0' + '-' + (dayTime - 1) + ',' + nightTime +' * * * ]');
			this.nightBri();
		});
		const dayBriCron = new schedule('*/' + checkInterval + ' ' + dayTime + '-' + (nightTime - 1) +' * * *', async () => {
			this.log.debug('day [ */' + checkInterval + ' ' + dayTime + '-' + (nightTime - 1) +' * * * ]');
			this.dayBri();
		});
		neightBriCron.start();
		dayBriCron.start();
	}

	async dayBri() {
		const newBrightnessDay = [];
		const brightnessDayPuffer = [];
		const daytimeBrightness = [];
		const brightnessD = this.config.brightness;

		if (!brightnessD || brightnessD !== []) {
			for (const d in brightnessD) {
				if (chargeDeviceValue[d]) {
					brightnessDayPuffer[d] = Math.round(await this.convert_percent(brightnessD[d].dayBrightness - brightnessD[d].loadingLowering));
					if (brightnessDayPuffer[d] <= 0) {

						newBrightnessDay[d] = 0;
						this.log.debug(`brightness from ${await tabletName[d]} is less than 0 brightness is set to`);
					} else {
						newBrightnessDay[d] = brightnessDayPuffer[d];
						this.log.debug(`new brightness from ${await tabletName[d]}: ` + newBrightnessDay[d] + `[` + (brightnessD[d].dayBrightness - brightnessD[d].loadingLowering) + `%]`);
					}
				} else {
					newBrightnessDay[d] = Math.round(await this.convert_percent(brightnessD[d].dayBrightness));
					this.log.debug(`${await tabletName[d]} brightness set on: ` + newBrightnessDay[d] + `[` + brightnessD[d].dayBrightness + `%]`);
				}

				daytimeBrightness[d] = 'http://' + ip[d] + ':' + port[d] + '/?cmd=setStringSetting&key=screenBrightness&value=' + newBrightnessDay[d] + '&password=' + password[d];
				if (brightness[d] != newBrightnessDay[d]) {
					this.sendCommand(daytimeBrightness[d], 'dayBri()');
				}
			}
		}
	}



	async screenOn() {
		const screen_on = JSON.parse(this.config.screen_on);

		if (screen_on) {

			for (const s in isScreenOn) {

				if (isScreenOn[s] == false) {

					this.log.warn(`[ATTENTION] Screen from ${await tabletName[s]} has been switched off Screen is being switched on again`);

					this.sendCommand(Screen[s], `${await tabletName[s]} screenON()`);
				}
			}
		}

	}


	async sendCommand(link, log) {
		try {

			await require('request')(link, async (error) => {

				this.log.debug('request carried out for: ' + link);
				if (error) this.log.error('### Error request from ' + log + ': ' + error);

			});

		} catch (error) {
			this.log.error(`[sendCommand] : ${error.message}, stack: ${error.stack}`);
		}
	}

	async convert_percent(str) {
		if (Number.isNaN(str)) {
			return 0;
		}
		return str / 100 * 255;
	}


	async replaceFunction(str) {
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
					if (tablet[i].name !== '') {
						tabletName[i] = tablet[i].name;
					} else {
						tabletName[i] = tablet[i].ip;
					}
				}

			}

			this.log.debug('tabletName: ' + JSON.stringify(tabletName));


			for (const name in tabletName) {
				const stateID = await this.replaceFunction(tabletName[name]);
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

	onMessage(msg, user) {
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