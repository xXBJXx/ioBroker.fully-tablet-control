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

// let SentryIntegrations;
const manualBrightnessID = [];
const brightnessControlModeID = [];
const tabletName = [];
const ip = [];
const port = [];
const password = [];
const Screen = [];
const deviceInfo = [];
let requestTimeout = null;
const ScreensaverTimer = [];
const User = [];
const telegramStatus = [];
const isScreenOn = [];
const brightness = [];
const currentFragment = [];
const bat = [];
const chargeDeviceValue = [];
const manualBrightness = [];
const manualBrightnessMode = [];
const motionID = [];
const motionVal = [];
const screenSaverTimer = [];
const foregroundAppTimer = [];
const foreground = [];
const foregroundStart = [];
const deviceEnabled = [];
let ScreensaverReturn = null;

class TabletControl extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
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

		await this.initialization();
		await this.create_state();
		await this.stateRequest();
		if (!JSON.parse(this.config.motionSensor_enabled)) {
			await this.screenSaver();
		}
		await this.brightnessCron();
		await this.motionSensor();
	}

	async initialization() {
		try {
			//read devices and created httpLink 
			const login = this.config.devices;
			if (!login || login !== []) {
				for (const i in login) {

					ip[i] = login[i].ip;
					port[i] = login[i].port;
					password[i] = login[i].password;
					deviceEnabled[i] = login[i].enabled;

					Screen[i] = `http://${ip[i]}:${port[i]}/?cmd=screenOn&password=${password[i]}`;

					deviceInfo[i] = `http://${ip[i]}:${port[i]}/?cmd=deviceInfo&type=json&password=${password[i]}`;
				}

			}
			this.log.debug(`Screen: ${JSON.stringify(Screen)}`);
			this.log.debug(`deviceInfo: ${JSON.stringify(deviceInfo)}`);

			//read Testegram user 
			const telegramOn = this.config.telegram_enabled;
			const telegramUser = this.config.telegram;
			if (telegramOn) {
				if (!telegramUser || telegramUser !== []) {
					for (const u in telegramUser) {
						User[u] = telegramUser[u].telegramUser;
						this.log.debug(`read telegram user: ${JSON.stringify(User)}`);
					}
				}
			}

			//telegramSendStatus set default state false for all devices
			const temp = this.config.devices;
			if (!temp || temp !== []) {
				for (const t in temp) {
					if (deviceEnabled[t]) {
						telegramStatus[t] = false;
						this.log.debug(`telegramSendStatus: ${JSON.stringify(telegramStatus)}`);
					}
				}
			}

			//telegramSendStatus set default state false for all devices
			const tempStart = this.config.devices;
			if (!tempStart || tempStart !== []) {
				for (const f in tempStart) {
					if (deviceEnabled[f]) {
						foregroundStart[f] = false;
						this.log.debug(`foregroundStart: ${JSON.stringify(foregroundStart)}`);
					}
				}
			}

			//read motion ID from Admin and subscribe
			const motion = this.config.motion;
			for (const sensor in motion) {
				if (motion[sensor].enabled && motion[sensor].motionid !== '') {
					motionID[sensor] = await motion[sensor].motionid;
					this.subscribeForeignStates(motionID[sensor]);
				} else {
					this.log.warn(`no motion Sensor ID entered`);
					// console.log(`no motion Sensor ID entered`);
				}
			}

			// read screenSaverTimer and screenSaverSelect
			const screenSaverON = JSON.parse(this.config.screenSaverON);
			const screenSaverObj = this.config.screenSaver;
			const tablets = this.config.devices;
			if (screenSaverON) {
				if (!screenSaverObj || screenSaverObj !== []) {
					for (const s in tablets) {
						if (deviceEnabled[s]) {
							const tabletName = tablets[s].name;
							screenSaverTimer[s] = JSON.parse(screenSaverObj[s].minute) * 60000;
							this.log.debug(`read telegram user: ${JSON.stringify(User)}`);
							const screenSaverUrl = screenSaverObj[s].url;
							const screensaverMode = JSON.parse(screenSaverObj[s].screensaverMode);
							// console.log(`screenSaverUrl ${screenSaverUrl}`);
							this.log.debug(`read screenSaverUrl: ${screenSaverUrl}`);

							if (screensaverMode) {

								if (screenSaverUrl == '') {
									const playlistUrl = `http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverPlaylist&value=&password=${password[s]}`;
									this.sendCommand(playlistUrl, `playlist Url  ${await tabletName}`);
									this.log.warn(`No screensaver URL was entered for ${tabletName}, a standard picture is set`);
									const wallpaperURL = `http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverWallpaperURL&value=${'fully://color black'}&password=${password[s]}`;
									this.sendCommand(wallpaperURL, `screenSaver no Url  ${await tabletName}`);

								}
								else {
									const screenUrl = [
										{
											'type': 4,
											'url': screenSaverUrl,
											'loopItem': true,
											'loopFile': false,
											'fileOrder': 0,
											'nextItemOnTouch': false,
											'nextFileOnTouch': false,
											'nextItemTimer': 0,
											'nextFileTimer': 0
										}
									];
									const playlistUrl = `http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverPlaylist&value=${JSON.stringify(screenUrl)}&password=${password[s]}`;
									// console.log('fully Url ' + playlistUrl);
									this.log.debug(`set Screensaver for ${tabletName} to YouTube Url: ${playlistUrl} entered`);
									this.sendCommand(playlistUrl, `screenSaverSelect ${await tabletName}`);
								}

							} else if (!screensaverMode) {
								if (screenSaverUrl == '') {
									const playlistUrl = `http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverPlaylist&value=&password=${password[s]}`;
									this.sendCommand(playlistUrl, `playlist Url  ${await tabletName}`);
									this.log.warn(`No screensaver URL was entered for ${tabletName}, a standard picture is set`);
									const wallpaperURL = `http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverWallpaperURL&value=${'fully://color black'}&password=${password[s]}`;
									this.sendCommand(wallpaperURL, `screenSaver no Url  ${await tabletName}`);
									this.log.debug(`set Screensaver for ${tabletName} to default picture: ${wallpaperURL} entered:`);
									// console.log(`set Screensaver for ${tabletName} to default picture: ${wallpaperURL} entered`);
								}
								else {
									const playlistUrl = `http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverPlaylist&value=&password=${password[s]}`;
									this.sendCommand(playlistUrl, `playlist Url  ${await tabletName}`);
									const wallpaperURL = `http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverWallpaperURL&value=${screenSaverUrl}&password=${password[s]}`;
									this.sendCommand(wallpaperURL, `screenSaver no Url  ${await tabletName}`);
									this.log.debug(`set Screensaver for ${tabletName} to Wallpaper URL: ${wallpaperURL} entered:`);
								}
							}
						}
					}
				}
			}
		} catch (error) {
			this.log.error(`[initialization] : ${error.message}, stack: ${error.stack}`);
		}
	}

	async stateRequest() {
		try {
			if (!deviceInfo || deviceInfo !== []) {

				for (const i in deviceInfo) {
					if (deviceEnabled[i]) {
						console.log(`device: ${tabletName[i]} enabled`);
						const stateID = await this.replaceFunction(tabletName[i]);

						let apiResult = null;
						try {
							// Try to reach API and receive data
							apiResult = await axios.get(deviceInfo[i]);
							this.setState(`device.${stateID}.isFullyAlive`, { val: true, ack: true });
						} catch (error) {
							this.log.warn(`[Request] ${tabletName[i]} Unable to contact: ${error} | ${error}`);
							this.setState(`device.${stateID}.isFullyAlive`, { val: false, ack: true });
							continue;
						}

						const objects = apiResult.data;

						this.log.debug(`[result]: ${JSON.stringify(objects)}`);

						const ipadresse = objects.ip4;
						this.setState(`device.${stateID}.device_ip`, { val: await ipadresse, ack: true });
						this.log.debug(`IP: ${ipadresse}`);

						const plugged = objects.plugged;
						this.setState(`device.${stateID}.Plugged`, { val: await plugged, ack: true });
						this.log.debug(`plugged ${plugged}`);

						bat[i] = objects.batteryLevel;
						this.setState(`device.${stateID}.battery`, { val: await bat[i], ack: true });
						this.log.debug(`bat ${bat}`);

						isScreenOn[i] = objects.isScreenOn;
						this.setState(`device.${stateID}.ScreenOn`, { val: await isScreenOn[i], ack: true });
						this.log.debug(`isScreenOn ${isScreenOn}`);

						if (!isScreenOn[i]) {
							this.screenOn();
						}

						brightness[i] = objects.screenBrightness;
						this.setState(`device.${stateID}.brightness`, { val: await brightness[i], ack: true });
						this.log.debug(`bright ${brightness}`);

						currentFragment[i] = objects.currentFragment;
						this.setState(`device.${stateID}.active_display`, { val: await currentFragment[i], ack: true });
						this.log.debug(`currentFragment ${currentFragment}`);

						const deviceModel = objects.deviceModel;
						this.setState(`device.${stateID}.deviceModel`, { val: await deviceModel, ack: true });
						this.log.debug(`deviceModel ${deviceModel}`);

						const lastAppStart = objects.lastAppStart;
						this.setState(`device.${stateID}.LastAppStart`, { val: await lastAppStart, ack: true });
						this.log.debug(`lastAppStart ${lastAppStart}`);

						const ssid = objects.ssid.replace(/"/gi, '');
						this.log.debug(`ssid: ${ssid}`);

						foreground[i] = objects.foregroundApp;
						this.log.debug(`foregroundApp ${foreground}`);
						if (await foreground[i] !== 'de.ozerov.fully' && await foregroundStart[i] == false) {
							foregroundStart[i] = true;
							this.foregroundApp();
							console.log(`${await tabletName[i]} foregroundStart true: ${await foregroundStart[i]}`);
							this.log.debug(`${await tabletName[i]} foregroundStart true: ${await foreground[i]}`);
						}
						else {
							foregroundStart[i] = false;
							console.log(`${await tabletName[i]} foreground is Fully: ${await foreground[i]}`);
							this.log.debug(`${await tabletName[i]} foreground is Fully: ${await foreground[i]}`);
						}

						if (ssid.replace(/_/gi, ' ') == '<unknown ssid>') {
							this.setState(`device.${stateID}.ssid`, { val: 'is not supported', ack: true });
						}
						else if (ssid.replace(/_/gi, ' ') == '') {
							this.setState(`device.${stateID}.ssid`, { val: 'is not supported', ack: true });
						}
						else {
							this.setState(`device.${stateID}.ssid`, { val: ssid.replace(/_/gi, ' '), ack: true });
						}
						let visBattery = null;
						if (bat[i] <= 100) visBattery = 10; 	// 100 %
						if (bat[i] <= 90) visBattery = 9; 	// 90 %
						if (bat[i] <= 80) visBattery = 8; 	// 80 %
						if (bat[i] <= 70) visBattery = 7; 	// 70 %
						if (bat[i] <= 60) visBattery = 6; 	// 60 %
						if (bat[i] <= 50) visBattery = 5; 	// 50 %
						if (bat[i] <= 40) visBattery = 4; 	// 40 %
						if (bat[i] <= 30) visBattery = 3; 	// 30 %
						if (bat[i] <= 20) visBattery = 2; 	// 20 %
						if (bat[i] <= 10) visBattery = 1; 	// 10 %
						if (bat[i] <= 0) visBattery = 0; 	// empty
						if (plugged) visBattery = 11; 	// Charger on

						this.log.debug(`visBattery ` + bat[i] + ' ' + visBattery);
						this.setState(`device.${await stateID}.state_of_charge_vis`, { val: visBattery, ack: true });

						// last Info Update
						this.setState(`device.${await stateID}.lastInfoUpdate`, { val: Date.now(), ack: true });
						this.log.debug(`lastInfoUpdate: ${Date.now()}`);
					}
					else {
						console.log(`device ${tabletName[i]} deactivated`);
						this.log.debug(`device ${tabletName[i]} deactivated`);
					}
				}
			}
			this.charger();

			requestTimeout = setTimeout(async () => {

				this.stateRequest();
			}, this.config.interval * 1000);
		} catch (error) {
			this.log.error(`[stateRequest] : ${error.message}, stack: ${error.stack}`);
		}
	}

	async foregroundApp() {
		try {
			for (const c in ip) {
				if (deviceEnabled[c]) {
					for (const app in foreground) {
						if (foregroundAppTimer[app]) clearTimeout(foregroundAppTimer[app]);
						console.log(`${await tabletName[app]} foreground: ${await foreground[app]}`);
						this.log.debug(`${await tabletName[app]} foreground: ${await foreground[app]}`);

						const foregroundAppUrl = `http://${await ip[app]}:${await port[app]}/?cmd=toForeground&password=${await password[app]}`;
						console.log(`${await tabletName[app]} foreground: ${foregroundAppUrl}`);
						foregroundAppTimer[app] = setTimeout(async () => {
							this.sendCommand(foregroundAppUrl, `foregroundApp ${await tabletName[app]}`);
						}, this.config.fireTablet * 60000);
					}
				}
			}
		} catch (error) {
			this.log.error(`[foregroundApp] : ${error.message}, stack: ${error.stack}`);
		}
	}

	async charger() {

		const charger = this.config.charger;
		const telegram_enabled = JSON.parse(this.config.telegram_enabled);

		if (!charger || charger !== []) {
			for (const i in ip) {
				if (deviceEnabled[i]) {
					if (charger[i]) {

						const chargerid = charger[i].chargerid;
						const power_mode = JSON.parse(charger[i].power_mode);
						const loadStart = JSON.parse(charger[i].loadStart);
						const loadStop = JSON.parse(charger[i].loadStop);

						if (chargerid) {

							const chargeDevice = await this.getForeignStateAsync(chargerid);

							chargeDeviceValue[i] = chargeDevice == null ? false : chargeDevice.val;

							this.log.debug(`chargerid: ` + chargerid + ` val: ` + chargeDeviceValue[i]);

							if (await power_mode == true) {

								if (await bat[i] <= loadStart && !chargeDeviceValue[i]) {

									await this.setForeignStateAsync(await chargerid, true, false);
									this.log.info(`${await tabletName[i]} Loading started`);
									this.manualStates();

								}
								else if (await bat[i] >= loadStop && chargeDeviceValue[i]) {

									await this.setForeignStateAsync(await chargerid, false, false);
									this.log.info(`${await tabletName[i]} Charging cycle ended`);

								}

							}
							else {

								if (!chargeDeviceValue[i]) this.setForeignStateAsync(chargerid[i], true, false);
								if (!chargeDeviceValue[i]) this.log.debug(`${await tabletName[i]} Continuous current`);
							}

						}
						else {
							console.log(`${await tabletName[i]} Charger ID not specified`);
							this.log.warn(`${await tabletName[i]} Charger ID not specified`);
						}

						if (telegram_enabled === true) {

							if (await bat[i] <= 18 && !chargeDeviceValue[i] && !telegramStatus[i] || bat[i] <= 18 && chargeDeviceValue[i] && !telegramStatus[i]) {
								telegramStatus[i] = true;
								this.onMessage(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!`, User);
								this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + `  ${await tabletName[i]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!`);
								this.setForeignStateAsync(await chargerid[i], true, false);
								this.setState(`device.${await tabletName[i]}.charging_warning`, { val: true, ack: true });

							}
							else if (await bat[i] > 18 && chargeDeviceValue[i] && telegramStatus[i]) {
								telegramStatus[i] = false;
								this.onMessage(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet is charging the problem has been fixed.`, User);
								this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet is charging the problem has been fixed.`);
								this.setState(`device.${await tabletName[i]}.active_display`, { val: false, ack: true });
							}

						}
						else {

							if (await bat[i] <= 18 && !chargeDeviceValue[i] || bat[i] <= 18 && chargeDeviceValue[i]) {
								this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!`);
								this.setForeignStateAsync(await chargerid[i], true, false);
								this.setState(`device.${await tabletName[i]}.charging_warning`, { val: true, ack: true });

							} else if (await bat[i] > 18 && chargeDeviceValue[i]) {
								this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet is charging the problem has been fixed.`);
								this.setState(`device.${await tabletName[i]}.active_display`, { val: false, ack: true });
							}
						}
					}
					else {
						console.log(`${await tabletName[i]} charger not specified`);
						this.log.warn(`${await tabletName[i]} charger not specified`);
					}
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

		const neightBriCron = new schedule('*/' + checkInterval + ' ' + '0' + '-' + (dayTime - 1) + ',' + nightTime + ' * * *', async () => {
			this.log.debug('night [ */' + checkInterval + ' ' + '0' + '-' + (dayTime - 1) + ',' + nightTime + ' * * * ]');
			this.nightBri();
		});

		const dayBriCron = new schedule('*/' + checkInterval + ' ' + dayTime + '-' + (nightTime - 1) + ' * * *', async () => {
			this.log.debug('day [ */' + checkInterval + ' ' + dayTime + '-' + (nightTime - 1) + ' * * * ]');
			this.dayBri();
		});

		neightBriCron.start();
		dayBriCron.start();
	}

	async nightBri() {
		try {
			const brightnessN = this.config.brightness;
			if (!brightnessN || brightnessN !== []) {
				for (const i in ip) {

					if (brightnessN[i] && deviceEnabled[i]) {
						for (const b in brightnessN) {

							const brightnessNight = Math.round(await this.convert_percent(brightnessN[b].nightBrightness));
							const nightBrightnessURL = `http://${ip[b]}:${port[b]}/?cmd=setStringSetting&key=screenBrightness&value=${brightnessNight}&password=${password[b]}`;
							const ScreensaverOnBri = `http://${ip[b]}:${port[b]}/?cmd=setStringSetting&key=screensaverBrightness&value=${brightnessNight}&password=${password[b]}`;

							if (await brightness[b] == 0) {

								this.log.debug(`The brightness from ${await tabletName[b]} is ${await brightness[b]} change is not necessary`);
							}
							else {
								this.sendCommand(nightBrightnessURL, `nightBri ${await tabletName[b]}`);
								this.sendCommand(ScreensaverOnBri, `ScreensaverOnBri ${await tabletName[b]}`);
								this.log.debug(`${await tabletName[b]} sendCommand: ${nightBrightnessURL}`);
								this.log.debug(`${await tabletName[b]} sendCommand: ${ScreensaverOnBri}`);
							}
						}
					}
					else {
						console.log(`${await tabletName[i]} nightBri not specified`);
						this.log.warn(`${await tabletName[i]} nightBri not specified`);
					}
				}
			}
		} catch (error) {
			this.log.error(`[nightBri] : ${error.message}, stack: ${error.stack}`);
		}
	}

	//read manualStates
	async manualStates() {
		try {
			for (const name in tabletName) {

				const stateID = await this.replaceFunction(tabletName[name]);
				const manual = await this.getStateAsync(`device.${stateID}.manualBrightness`);
				if (manual && manual.val) {
					manualBrightness[name] = manual.val;
				}
				else {
					await this.setStateAsync(`device.${stateID}.manualBrightness`, 0, true);
					manualBrightness[name] = 0;
				}

				const manualMode = await this.getStateAsync(`device.${stateID}.brightness_control_mode`);
				if (manualMode && (manualMode.val || !manualMode.val)) {
					manualBrightnessMode[name] = manualMode.val;

				}
				else {
					await this.setStateAsync(`device.${stateID}.brightness_control_mode`, false, true);
					manualBrightnessMode[name] = false;
				}

				this.log.debug(`[manualBrightness] name: ${tabletName[name]} val: ${await manualBrightness[name]}`);
				this.log.debug(`[manualBrightnessMode] name: ${tabletName[name]} val: ${await manualBrightnessMode[name]}`);
			}
			this.dayBri();
		} catch (error) {
			this.log.error(`[manualStates] : ${error.message}, stack: ${error.stack}`);
		}
	}


	async dayBri() {
		try {
			const brightnessD = this.config.brightness;
			if (!brightnessD || brightnessD !== []) {

				for (const d in ip) {
					if (deviceEnabled[d]) {
						if (brightnessD[d]) {
							let daytimeBrightnessURL = null;
							let ScreensaverOnBri = null;
							let newBrightnessDay = 0;
							if (chargeDeviceValue[d]) {

								let brightnessDayPuffer;
								if (await manualBrightnessMode[d]) {
									brightnessDayPuffer = Math.round(await this.convert_percent(await manualBrightness[d] - brightnessD[d].loadingLowering));
								}
								else {
									brightnessDayPuffer = Math.round(await this.convert_percent(brightnessD[d].dayBrightness - brightnessD[d].loadingLowering));
								}
								if (brightnessDayPuffer <= 0) {
									newBrightnessDay = 0;
									this.log.debug(`brightness from ${await tabletName[d]} is less than 0 brightness is set to`);
								} else {
									newBrightnessDay = brightnessDayPuffer;
									this.log.debug(`new brightness from ${await tabletName[d]}: ` + newBrightnessDay + `[` + (brightnessD[d].dayBrightness - brightnessD[d].loadingLowering) + `%]`);
								}
							} else {
								if (await manualBrightnessMode[d]) {
									newBrightnessDay = Math.round(await this.convert_percent(await manualBrightness[d]));
									this.log.debug(`${await tabletName[d]} brightness set on: ` + newBrightnessDay + `[` + manualBrightness[d] + `%]`);
								}
								else {
									newBrightnessDay = Math.round(await this.convert_percent(brightnessD[d].dayBrightness));
									this.log.debug(`${await tabletName[d]} brightness set on: ` + newBrightnessDay + `[` + brightnessD[d].dayBrightness + `%]`);
								}
							}
							daytimeBrightnessURL = `http://${ip[d]}:${port[d]}/?cmd=setStringSetting&key=screenBrightness&value=${newBrightnessDay}&password=${password[d]}`;
							ScreensaverOnBri = `http://${ip[d]}:${port[d]}/?cmd=setStringSetting&key=screensaverBrightness&value=${newBrightnessDay}&password=${password[d]}`;
							if (await brightness[d] != newBrightnessDay) {
								await this.sendCommand(daytimeBrightnessURL, `dayBri`);
								await this.sendCommand(ScreensaverOnBri, `[ScreensaverOnBri] ${await tabletName[d]}`);
								this.log.debug(`${await tabletName[d]} sendCommand: ${daytimeBrightnessURL}`);
								this.log.debug(`${await tabletName[d]} sendCommand: ${ScreensaverOnBri}`);
							}
						}
						else {
							console.log(`${await tabletName[d]} dayBri not specified`);
							this.log.warn(`${await tabletName[d]} dayBri not specified`);
						}

					}
				}




			}
		} catch (error) {
			this.log.error(`[dayBri] : ${error.message}, stack: ${error.stack}`);
		}
	}


	async motionSensor() {
		try {
			const motion = this.config.motion;
			const motionSensor_enabled = JSON.parse(this.config.motionSensor_enabled);
			this.log.debug(`motion obj val: ${motion}`);
			this.log.debug(`motionSensor_enabled val: ${motionSensor_enabled}`);

			if (motionSensor_enabled && motion.length !== 0) {
				if (!motion || motion !== []) {
					for (const sensor in motion) {
						console.log(`motion Sensor val: ${motion[sensor].enabled}`);
						if (motion[sensor].enabled && motionID[sensor] !== '') {
							console.log(`motion Sensor ID: ${motionID[sensor]}`);
							const motionObj = await this.getForeignStateAsync(motionID[sensor]);
							if (motionID.length < 2) {
								for (const one in tabletName) {
									if (motionObj && (motionObj.val || !motionObj.val)) {
										motionVal[one] = motionObj.val;
										console.log(`motionVal val: ${motionVal}`);
										this.log.debug(`motionVal val: ${motionVal}`);
									}
									else {
										motionVal[one] = false;
									}
								}
							}
							else {
								if (motionObj && (motionObj.val || !motionObj.val)) {
									motionVal[sensor] = motionObj.val;
									console.log(`motionVal val: ${motionVal}`);
									this.log.debug(`motionVal val: ${motionVal}`);
								}
								else {
									motionVal[sensor] = false;
								}
							}
						}
						else {
							this.log.warn(`no motion Sensor ID entered`);
							console.log(`no motion Sensor ID entered`);
						}
					}
					this.screenSaver();
				}
			}
			else {
				this.log.debug(`Deactivate motion sensors `);
				console.log(`Deactivate motion sensors `);
			}
		} catch (error) {
			this.log.error(`[motionSensor] : ${error.message}, stack: ${error.stack}`);
		}
	}

	async screenSaver() {
		try {
			const motionSensor_enabled = JSON.parse(this.config.motionSensor_enabled);
			const screenSaverOn = JSON.parse(this.config.screenSaverON);
			console.log(`screenSaverOn val: ${screenSaverOn}`);
			if (screenSaverOn) {
				if (!tabletName || tabletName !== []) {
					for (const on in ip) {
						if (ScreensaverTimer[on]) clearTimeout(ScreensaverTimer[on]);
						if (deviceEnabled[on]) {
							if (motionSensor_enabled) {
								this.log.debug(`Motion Sensor is On`);
								console.log(`Motion Sensor is On: ${motionSensor_enabled}`);
								if (!motionVal[on]) {

									console.log(`motionVal == false: ${motionVal[on]}`);
									if (currentFragment[on] == 'main') {
										const ScreensaverOnURL = `http://${ip[on]}:${port[on]}/?cmd=startScreensaver&password=${password[on]}`;

										this.log.debug(`${await tabletName[on]} Screensaver starts in ${await screenSaverTimer[on]} ms`);
										console.log(`currentFragment == main: ${currentFragment[on]}`);

										ScreensaverTimer[on] = setTimeout(async () => {
											await this.sendCommand(ScreensaverOnURL, `[screenSaver On] ${await tabletName[on]}`);
											this.log.info(`${await tabletName[on]} sendCommand: screenSaver On ${ScreensaverOnURL}`);
											console.log(`sendCommand: screenSaver On ${ScreensaverOnURL}`);
											this.stateRequest();
										}, screenSaverTimer[on]);

										console.log(`screenSaverTimer[on] ${await screenSaverTimer[on]}`);
									} else if (currentFragment[on] == 'screensaver') {
										this.log.debug(`${await tabletName[on]} Screensaver already on`);
										console.log(`currentFragment[on] == 'screensaver': ${currentFragment[on]}`);
									}
								} else {
									console.log(`motionVal == true: ${motionVal[on]}`);
									this.log.debug(`${await tabletName[on]} Movement was detected. Screen saver is switched off`);
									const ScreensaverOffURL = `http://${ip[on]}:${port[on]}/?cmd=stopScreensaver&password=${password[on]}`;
									if (currentFragment[on] == 'main') {
										console.log(`currentFragment[on] == 'main': ${currentFragment[on]}`);
										this.log.debug('no screensaver switched on');
									} else if (currentFragment[on] == 'screensaver') {
										console.log(`currentFragment[on] == 'screensaver': ${currentFragment[on]}`);
										this.sendCommand(ScreensaverOffURL, `[screenSaver Off] ${await tabletName[on]}`);
										this.log.info(`${await tabletName[on]} sendCommand: screenSaver Off ${ScreensaverOffURL} `);
									}
								}
							} else {
								const ScreensaverOn = `http://${ip[on]}:${port[on]}/?cmd=startScreensaver&password=${password[on]}`;
								console.log(`motionSensor_enabled Off: ${motionSensor_enabled}`);
								if (currentFragment[on] == 'main') {
									this.log.debug(`${await tabletName[on]} Screensaver starts in ${await screenSaverTimer[on]} ms`);
									console.log(`currentFragment[on] == 'main': ${motionSensor_enabled}`);

									ScreensaverTimer[on] = setTimeout(async () => {
										if (ScreensaverReturn) clearTimeout(ScreensaverReturn);
										console.log(`[screenSaver On] ${await tabletName[on]}`);
										this.sendCommand(ScreensaverOn, `[screenSaver On] ${await tabletName[on]}`);
										this.log.debug(`${await tabletName[on]} sendCommand: screenSaver On ${ScreensaverOn}`);
										ScreensaverReturn = setTimeout(async () => {
											this.screenSaver();
											console.log(`[screenSaver restart]`);
										}, 500);
									}, screenSaverTimer[on]);

									console.log(`screenSaverTimer[on] ${await screenSaverTimer[on]}`);
								}

							}
						}
					}
				}
			}
		} catch (error) {
			this.log.error(`[screenSaver] : ${error.message}, stack: ${error.stack}`);
		}
	}

	async screenOn() {
		const screen_on = JSON.parse(this.config.screen_on);

		if (screen_on) {

			for (const s in isScreenOn) {
				if (deviceEnabled[s]) {
					if (isScreenOn[s] == false) {

						this.log.warn(`[ATTENTION] Screen from ${await tabletName[s]} has been switched off Screen is being switched on again`);

						this.sendCommand(Screen[s], `[screenON()] ${await tabletName[s]}`);
					}
				}
			}
		}
	}


	async sendCommand(link, log) {
		try {
			await axios.get(link);
		} catch (error) {
			this.log.warn(`[${log}] Unable to contact: ${error} | ${error}`);
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
						read: true,
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
						read: true,
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
						read: true,
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
						read: true,
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
						read: true,
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
						read: true,
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
						read: true,
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
						read: true,
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
						read: true,
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
						read: true,
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
						read: true,
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
						read: true,
						write: true
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.brightness_control_mode`, {
					type: 'state',
					common: {
						name: `${stateName} brightness control mode`,
						type: 'boolean',
						role: 'switch',
						def: false,
						read: true,
						write: true,
						states: {
							false: 'Admin',
							true: 'User'
						}
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.charging_warning`, {
					type: 'state',
					common: {
						name: `${stateName} charging warning`,
						type: 'boolean',
						role: 'info',
						def: false,
						read: true,
						write: false

					},
					native: {},
				});
				await this.extendObjectAsync(`device.${stateID}.isFullyAlive`, {
					type: 'state',
					common: {
						name: `${stateName} Is Fully Browser Alive?`,
						type: 'boolean',
						role: 'info',
						def: false,
						read: true,
						write: false

					},
					native: {},
				});

				this.subscribeStates(`device.${stateID}.manualBrightness`);
				this.subscribeStates(`device.${stateID}.brightness_control_mode`);
				manualBrightnessID[name] = `.device.${stateID}.manualBrightness`;
				brightnessControlModeID[name] = `.device.${stateID}.brightness_control_mode`;

				if (!deviceEnabled[name]) {
					this.setState(`device.${tabletName[name]}.isFullyAlive`, { val: false, ack: true });
				}

			}
			this.manualStates();
			this.setState('info.connection', true, true);

		} catch (error) {
			this.log.error(`[create_state] : ${error.message}, stack: ${error.stack}`);

		}

	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			if (requestTimeout) clearTimeout(requestTimeout);
			if (ScreensaverReturn) clearTimeout(ScreensaverReturn);
			for (const Unl in tabletName) {
				if (ScreensaverTimer[Unl]) clearTimeout(ScreensaverTimer[Unl]);
				if (foregroundAppTimer[Unl]) clearTimeout(foregroundAppTimer[Unl]);
				
			}
			this.log.info('Adapter Tablet Constrol stopped...');
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
		try {
			if (state) {
				// The state was changed
				this.log.debug(`stateID ${id} changed: ${state.val} (ack = ${state.ack})`);

				// manual brightness States change
				for (const change in tabletName) {
					console.log(id == `${this.namespace}${brightnessControlModeID[change]}` || id == `${this.namespace}${manualBrightnessID[change]}`);
					if (id == `${this.namespace}${brightnessControlModeID[change]}` || id == `${this.namespace}${manualBrightnessID[change]}` && state.from !== `system.adapter.${this.namespace}`) {
						this.log.debug(`state ${id} changed: ${state.val} from: ${this.namespace}`);
						this.manualStates();
					}
				}

				// Motion Sensor State Change
				for (const change in motionID) {
					console.log(id == `${motionID[change]}`);
					if (id == `${motionID[change]}`) {
						this.log.debug(`state ${id} changed: ${state.val}`);
						this.motionSensor();
					}
				}

			}
		} catch (error) {
			this.log.error(`[onStateChane ${id}] error: ${error.message}, stack: ${error.stack}`);
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

// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new TabletControl(options);
} else {
	// otherwise start the instance directly
	new TabletControl();
}