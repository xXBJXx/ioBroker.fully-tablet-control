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
const isInScreensaver = [];
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
let view_enabled = null;
let mode = null;
const time = [];
const viewName = [];
const viewNumber = [];
let visView = null;
const wishView = [];
let viewTimer = null;
let homeView = null;
const messageSend = [];
const AlertMessageSend = [];
let interval = null;
let checkInterval = null;
const enabledBrightness = [];
let reloadAllID = null;
const startApplicationID = [];
const loadURLID = [];
const textToSpeechID = [];
const setStringSettingID = [];
const commandsID = [];
const commandsStr = 'commands';
let fireTabletInterval = null;
let brightnessControlEnabled = null;

class FullyTabletControl extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {

		super({
			...options,
			name: 'fully-tablet-control',
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
		await this.checkView();
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

			// polling min 5 sec.
			interval = this.config.interval * 1000;
			if (interval < 5000) {
				interval = 5000;
			}

			// polling min 5 sec.
			checkInterval = this.config.checkInterval;
			if (checkInterval < 1) {
				checkInterval = 1;
			}

			// polling min 5 sec.
			fireTabletInterval = this.config.fireTablet * 60000;
			if (fireTabletInterval < 60000) {
				fireTabletInterval = 60000;
			}
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

						//charger message set default state false for all devices
						messageSend[t] = true;
						AlertMessageSend[t] = false;
					}
				}
			}

			//foregroundStart set default state false for all devices
			const tempStart = this.config.devices;
			if (!tempStart || tempStart !== []) {
				for (const f in tempStart) {
					if (deviceEnabled[f]) {
						foregroundStart[f] = false;
						this.log.debug(`foregroundStart: ${JSON.stringify(foregroundStart)}`);
					}
				}
			}

			brightnessControlEnabled = JSON.parse(this.config.brightness_on);
			const brightnessEnabled = this.config.brightness;
			if (brightnessControlEnabled) {
				if (!brightnessEnabled || brightnessEnabled !== []) {

					for (const b in tempStart) {

						enabledBrightness[b] = brightnessEnabled[b].enabledBrightness;

						if (enabledBrightness[b] == undefined) {
							enabledBrightness[b] = false;
						}

						if (enabledBrightness[b]) {
							await this.setStateAsync(`device.${await this.replaceFunction(tempStart[b].name)}.brightness_control_mode`, false, true);
							// this.manualStates();
						}

						console.log(enabledBrightness);
						this.log.debug(`enabledBrightness: ${enabledBrightness}`);
					}
				}
			}
			else {
				for (const b in tempStart) {
					enabledBrightness[b] = false;
					await this.setStateAsync(`device.${await this.replaceFunction(tempStart[b].name)}.brightness_control_mode`, true, false);
					console.log(`device.${await this.replaceFunction(tempStart[b].name)}.brightness_control_mode`);
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
					console.log(`no motion Sensor ID entered`);
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
							console.log(`screenSaverUrl ${screenSaverUrl}`);
							this.log.debug(`read screenSaverUrl: ${screenSaverUrl}`);

							if (screensaverMode) {

								if (screenSaverUrl == '') {
									const playlistUrl = `http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverPlaylist&value=&password=${password[s]}`;
									const wallpaperURL = `http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverWallpaperURL&value=${'fully://color black'}&password=${password[s]}`;

									try {
										await axios.get(playlistUrl);
										await axios.get(wallpaperURL);
									} catch (error) {
										this.log.error(`${await tabletName[s]} [wallpaperURL] ( screenSaver no Url ) could not be sent: ${error.message}, stack: ${error.stack}`);
										this.log.error(`${await tabletName[s]} [playlistUrl] ( playlist Url ) could not be sent: ${error.message}, stack: ${error.stack}`);
									}

									this.log.warn(`No screensaver URL was entered for ${tabletName}, a standard picture is set`);
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
									console.log('fully Url ' + playlistUrl);
									this.log.debug(`set Screensaver for ${tabletName} to YouTube Url: ${playlistUrl} entered`);

									try {
										await axios.get(playlistUrl);

									} catch (error) {
										this.log.error(`${await tabletName[s]} [playlistUrl] ( screenSaverSelect ) could not be sent: ${error.message}, stack: ${error.stack}`);

									}
								}

							} else if (!screensaverMode) {
								if (screenSaverUrl == '') {
									const playlistUrl = `http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverPlaylist&value=&password=${password[s]}`;
									const wallpaperURL = `http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverWallpaperURL&value=${'fully://color black'}&password=${password[s]}`;

									try {
										await axios.get(playlistUrl);
										await axios.get(wallpaperURL);

									} catch (error) {
										this.log.error(`${await tabletName[s]} [playlistUrl] ( playlist Url ) could not be sent: ${error.message}, stack: ${error.stack}`);
										this.log.error(`${await tabletName[s]} [wallpaperURL] ( screenSaver no Url ) could not be sent: ${error.message}, stack: ${error.stack}`);

									}

									this.log.warn(`No screensaver URL was entered for ${tabletName}, a standard picture is set`);
									this.log.debug(`set Screensaver for ${tabletName} to default picture: ${wallpaperURL} entered:`);
									console.log(`set Screensaver for ${tabletName} to default picture: ${wallpaperURL} entered`);
								}
								else {
									const playlistUrl = `http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverPlaylist&value=&password=${password[s]}`;
									const wallpaperURL = `http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverWallpaperURL&value=${screenSaverUrl}&password=${password[s]}`;

									try {
										await axios.get(playlistUrl);
										await axios.get(wallpaperURL);

									} catch (error) {
										this.log.error(`${await tabletName[s]} [playlistUrl] ( playlist Url ) could not be sent: ${error.message}, stack: ${error.stack}`);
										this.log.error(`${await tabletName[s]} [wallpaperURL] ( screenSaver no Url ) could not be sent: ${error.message}, stack: ${error.stack}`);
									}

									this.log.debug(`set Screensaver for ${tabletName} to Wallpaper URL: ${wallpaperURL} entered:`);
								}
							}
						}
					}
				}
			}

			// read visView and screenSaverSelect
			view_enabled = JSON.parse(this.config.viewChange_enabled);
			mode = JSON.parse(this.config.viewMode);
			console.log(mode);
			console.log(view_enabled);

			if (view_enabled) {
				visView = this.config.visView;
				console.log(visView);

				for (const view in visView) {
					// @ts-ignore
					const visProjekt = visView[view].visProjekt;
					// @ts-ignore
					viewName[view] = visView[view].viewName;
					// @ts-ignore
					if (visView[view].viewNumber !== '') {
						// @ts-ignore
						viewNumber[view] = JSON.parse(visView[view].viewNumber);
					}
					// @ts-ignore
					const tempTime = visView[view].time;
					homeView = `${visProjekt}/${viewName[0]}`;
					wishView[view] = `${visProjekt}/${viewName[view]}`;
					if (tempTime == '0' || tempTime == '00') {
						time[view] = 0;
					}
					else {
						// @ts-ignore
						time[view] = JSON.parse(visView[view].time);
					}
					console.log(time);
					console.log(viewNumber);
					console.log(viewName);
					console.log(visProjekt);
				}
			}
		} catch (error) {
			this.log.error(`[initialization] : ${error.message}, stack: ${error.stack}`);
		}
	}

	async stateRequest() {
		try {
			if (requestTimeout) clearTimeout(requestTimeout);
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
						if (apiResult.data.status !== 'Error') {


							const objects = apiResult.data;

							this.log.debug(`[result]: ${JSON.stringify(objects)}`);

							isInScreensaver[i] = objects.isInScreensaver;
							this.setState(`device.${stateID}.device_info.isInScreensaver`, { val: await isInScreensaver[i], ack: true });
							this.log.debug(`IP: ${isInScreensaver}`);

							const currentFragment = objects.currentFragment;
							this.setState(`device.${stateID}.device_info.currentFragment`, { val: await currentFragment, ack: true });
							this.log.debug(`currentFragment ${currentFragment}`);

							const deviceModel = objects.deviceModel;
							this.setState(`device.${stateID}.device_info.deviceModel`, { val: await deviceModel, ack: true });
							this.log.debug(`deviceModel ${deviceModel}`);

							const deviceName = objects.deviceName;
							this.setState(`device.${stateID}.device_info.deviceName`, { val: await deviceName, ack: true });
							this.log.debug(`IP: ${deviceName}`);

							const wifiSignalLevel = objects.wifiSignalLevel;
							this.setState(`device.${stateID}.device_info.wifiSignalLevel`, { val: await wifiSignalLevel, ack: true });
							this.log.debug(`IP: ${wifiSignalLevel}`);

							const kioskMode = objects.kioskMode;
							this.setState(`device.${stateID}.device_info.kioskMode`, { val: await kioskMode, ack: true });
							this.log.debug(`IP: ${kioskMode}`);

							const displayHeightPixels = objects.displayHeightPixels;
							this.setState(`device.${stateID}.device_info.displayHeightPixels`, { val: await displayHeightPixels, ack: true });
							this.log.debug(`IP: ${displayHeightPixels}`);

							const appVersionName = objects.appVersionName;
							this.setState(`device.${stateID}.device_info.appVersionName`, { val: await appVersionName, ack: true });
							this.log.debug(`IP: ${appVersionName}`);

							const maintenanceMode = objects.maintenanceMode;
							this.setState(`device.${stateID}.device_info.maintenanceMode`, { val: await maintenanceMode, ack: true });
							this.log.debug(`IP: ${maintenanceMode}`);

							const mac = objects.mac;
							this.setState(`device.${stateID}.device_info.mac`, { val: await mac, ack: true });
							this.log.debug(`IP: ${mac}`);

							const startUrl = objects.startUrl;
							this.setState(`device.${stateID}.device_info.startUrl`, { val: await startUrl, ack: true });
							this.log.debug(`IP: ${startUrl}`);

							const screenOrientation = objects.screenOrientation;
							this.setState(`device.${stateID}.device_info.screenOrientation`, { val: await screenOrientation, ack: true });
							this.log.debug(`IP: ${screenOrientation}`);

							const isInDaydream = objects.isInDaydream;
							this.setState(`device.${stateID}.device_info.isInDaydream`, { val: await isInDaydream, ack: true });
							this.log.debug(`IP: ${isInDaydream}`);

							const isLicensed = objects.isLicensed;
							this.setState(`device.${stateID}.device_info.isLicensed`, { val: await isLicensed, ack: true });
							this.log.debug(`IP: ${isLicensed}`);

							const deviceManufacturer = objects.deviceManufacturer;
							this.setState(`device.${stateID}.device_info.deviceManufacturer`, { val: await deviceManufacturer, ack: true });
							this.log.debug(`IP: ${deviceManufacturer}`);

							const keyguardLocked = objects.keyguardLocked;
							this.setState(`device.${stateID}.device_info.keyguardLocked`, { val: await keyguardLocked, ack: true });
							this.log.debug(`IP: ${keyguardLocked}`);

							const isDeviceAdmin = objects.isDeviceAdmin;
							this.setState(`device.${stateID}.device_info.isDeviceAdmin`, { val: await isDeviceAdmin, ack: true });
							this.log.debug(`IP: ${isDeviceAdmin}`);

							const kioskLocked = objects.kioskLocked;
							this.setState(`device.${stateID}.device_info.kioskLocked`, { val: await kioskLocked, ack: true });
							this.log.debug(`IP: ${kioskLocked}`);

							const isDeviceOwner = objects.isDeviceOwner;
							this.setState(`device.${stateID}.device_info.isDeviceOwner`, { val: await isDeviceOwner, ack: true });
							this.log.debug(`IP: ${isDeviceOwner}`);

							const ip6 = objects.ip6;
							this.setState(`device.${stateID}.device_info.ip6`, { val: await ip6, ack: true });
							this.log.debug(`IP: ${ip6}`);

							const displayWidthPixels = objects.displayWidthPixels;
							this.setState(`device.${stateID}.device_info.displayWidthPixels`, { val: await displayWidthPixels, ack: true });
							this.log.debug(`IP: ${displayWidthPixels}`);

							const androidVersion = objects.androidVersion;
							this.setState(`device.${stateID}.device_info.androidVersion`, { val: await androidVersion, ack: true });
							this.log.debug(`IP: ${androidVersion}`);

							const ip4 = objects.ip4;
							this.setState(`device.${stateID}.device_info.device_ip`, { val: await ip4, ack: true });
							this.log.debug(`IP: ${ip4}`);

							const plugged = objects.plugged;
							this.setState(`device.${stateID}.device_info.plugged`, { val: await plugged, ack: true });
							this.log.debug(`plugged ${plugged}`);

							bat[i] = objects.batteryLevel;
							this.setState(`device.${stateID}.battery`, { val: await bat[i], ack: true });
							this.log.debug(`bat ${bat}`);

							isScreenOn[i] = objects.isScreenOn;
							this.setState(`device.${stateID}.device_info.isScreenOn`, { val: await isScreenOn[i], ack: true });
							this.log.debug(`isScreenOn ${isScreenOn}`);

							if (!isScreenOn[i]) {
								this.screenOn();
							}

							brightness[i] = objects.screenBrightness;
							this.setState(`device.${stateID}.brightness`, { val: await brightness[i], ack: true });
							this.log.debug(`bright ${brightness}`);

							const lastAppStart = objects.lastAppStart;
							this.setState(`device.${stateID}.device_info.LastAppStart`, { val: await lastAppStart, ack: true });
							this.log.debug(`lastAppStart ${lastAppStart}`);

							const ssid = objects.ssid.replace(/"/gi, '');
							this.log.debug(`ssid: ${ssid}`);

							if (ssid.replace(/_/gi, ' ') == '<unknown ssid>') {
								this.setState(`device.${stateID}.device_info.ssid`, { val: 'is not supported', ack: true });
							}
							else if (ssid.replace(/_/gi, ' ') == '') {
								this.setState(`device.${stateID}.device_info.ssid`, { val: 'is not supported', ack: true });
							}
							else {
								this.setState(`device.${stateID}.device_info.ssid`, { val: ssid.replace(/_/gi, ' '), ack: true });
							}

							foreground[i] = objects.foregroundApp;
							this.setState(`device.${stateID}.device_info.foregroundApp`, { val: foreground[i], ack: true });
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

							const internalStorageFreeSpace = objects.internalStorageFreeSpace;
							this.setState(`device.${stateID}.device_info.memory.internalStorageFreeSpace`, { val: await this.bytesToSize(internalStorageFreeSpace), ack: true });
							this.log.debug(`internalStorageFreeSpace ${internalStorageFreeSpace}`);

							const appTotalMemory = objects.appTotalMemory;
							this.setState(`device.${stateID}.device_info.memory.appTotalMemory`, { val: await this.bytesToSize(appTotalMemory), ack: true });
							this.log.debug(`appTotalMemory ${appTotalMemory}`);

							const ramFreeMemory = objects.ramFreeMemory;
							this.setState(`device.${stateID}.device_info.memory.ramFreeMemory`, { val: await this.bytesToSize(ramFreeMemory), ack: true });
							this.log.debug(`ramFreeMemory ${ramFreeMemory}`);

							const appFreeMemory = objects.appFreeMemory;
							this.setState(`device.${stateID}.device_info.memory.appFreeMemory`, { val: await this.bytesToSize(appFreeMemory), ack: true });
							this.log.debug(`appFreeMemory ${appFreeMemory}`);

							const internalStorageTotalSpace = objects.internalStorageTotalSpace;
							this.setState(`device.${stateID}.device_info.memory.internalStorageTotalSpace`, { val: await this.bytesToSize(internalStorageTotalSpace), ack: true });
							this.log.debug(`internalStorageTotalSpace ${internalStorageTotalSpace}`);

							const ramUsedMemory = objects.ramUsedMemory;
							this.setState(`device.${stateID}.device_info.memory.ramUsedMemory`, { val: await this.bytesToSize(ramUsedMemory), ack: true });
							this.log.debug(`ramUsedMemory ${ramUsedMemory}`);

							const appUsedMemory = objects.appUsedMemory;
							this.setState(`device.${stateID}.device_info.memory.appUsedMemory`, { val: await this.bytesToSize(appUsedMemory), ack: true });
							this.log.debug(`appUsedMemory ${appUsedMemory}`);

							const ramTotalMemory = objects.ramTotalMemory;
							this.setState(`device.${stateID}.device_info.memory.ramTotalMemory`, { val: await this.bytesToSize(ramTotalMemory), ack: true });
							this.log.debug(`ramTotalMemory ${ramTotalMemory}`);

							let visBattery = null;

							if (plugged && bat[i] <= 100) visBattery = 20; 	// 100 %
							if (!plugged && bat[i] <= 100) visBattery = 19; 	// 100 %
							if (plugged && bat[i] <= 90) visBattery = 18; 	// 100 %
							if (!plugged && bat[i] <= 90) visBattery = 17; 	// 90 %
							if (plugged && bat[i] <= 80) visBattery = 16; 	// 90 %
							if (!plugged && bat[i] <= 80) visBattery = 15; 	// 80 %
							if (plugged && bat[i] <= 70) visBattery = 14; 	// 80 %
							if (!plugged && bat[i] <= 70) visBattery = 13; 	// 70 %
							if (plugged && bat[i] <= 60) visBattery = 12; 	// 70 %
							if (!plugged && bat[i] <= 60) visBattery = 11; 	// 60 %
							if (plugged && bat[i] <= 50) visBattery = 10; 	// 60 %
							if (!plugged && bat[i] <= 50) visBattery = 9; 	// 50 %
							if (plugged && bat[i] <= 40) visBattery = 8; 	// 50 %
							if (!plugged && bat[i] <= 40) visBattery = 7; 	// 40 %
							if (plugged && bat[i] <= 30) visBattery = 6; 	// 40 %
							if (!plugged && bat[i] <= 30) visBattery = 5; 	// 30 %
							if (plugged && bat[i] <= 20) visBattery = 4; 	// 30 %
							if (!plugged && bat[i] <= 20) visBattery = 3; 	// 20 %
							if (plugged && bat[i] <= 10) visBattery = 2; 	// 10 %
							if (!plugged && bat[i] <= 10) visBattery = 1; 	// 10 %
							if (bat[i] <= 0) visBattery = 0; 	// empty



							this.log.debug(`visBattery ` + bat[i] + ' ' + visBattery);
							this.setState(`device.${await stateID}.state_of_charge_vis`, { val: visBattery, ack: true });
						}
						else {
							this.log.error(`${apiResult.data.statustext}`);
						}
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
			}, interval);
		} catch (error) {
			this.log.error(`[stateRequest] : ${error.message}, stack: ${error.stack}`);
		}
	}

	async sendFullyCommand(id, state) {
		let comm;
		let dp;
		let name;
		const tmp = id.split('.');

		if (tmp.length > 4) {
			dp = tmp.pop();
			comm = tmp.pop();
			name = tmp.pop();
		} else {
			dp = tmp.pop();
		}


		if (state.ack != null) {
			if (state && !state.ack) {

				for (const s in tabletName) {

					if (deviceEnabled[s]) {
						if (dp !== 'reloadAll') {

							if (name.replace(/_/gi, ' ') == tabletName[s].toLowerCase()) {

								switch (dp) {
									case 'setStringSetting':
										let txtKey = state.val;
										if (txtKey.length > 1) {

											const textToSpeechURL = `http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=${txtKey}&password=${password[s]}`;
											try {
												await axios.get(textToSpeechURL);
											} catch (error) {
												this.log.warn(`[send textToSpeechURL] Unable to contact: ${error} | ${error}`);
											}
										}
										break;
									case 'textToSpeech':
										let txtSp = state.val;
										txtSp = encodeURIComponent(txtSp.replace(/ +/g, ' ')); // Remove multiple spaces
										if (txtSp.length > 1) {

											const textToSpeechURL = `http://${ip[s]}:${port[s]}/?cmd=textToSpeech&text=${txtSp}&password=${password[s]}`;
											try {
												await axios.get(textToSpeechURL);
											} catch (error) {
												this.log.warn(`[send textToSpeechURL] Unable to contact: ${error} | ${error}`);
											}
										}
										break;
									case 'loadURL':
										let strUrl = state.val;
										strUrl = strUrl.replace(/ /g, ''); // Remove Spaces

										const encodeUrl = encodeURIComponent(strUrl);

										if (strUrl.length > 10) {

											const loadURL = `http://${ip[s]}:${port[s]}/?cmd=loadURL&url=${encodeUrl}&password=${password[s]}`;
											try {
												await axios.get(loadURL);
											} catch (error) {
												this.log.warn(`[send loadURL] Unable to contact: ${error} | ${error}`);
											}
										}
										break;
									case 'startApplication':
										// eslint-disable-next-line no-case-declarations
										let strApp = state.val;
										strApp = strApp.replace(/ /g, ''); // Remove Spaces

										if (strApp.length > 2) {
											const startApplicationURL = `http://${ip[s]}:${port[s]}/?cmd=startApplication&package=${strApp}&password=${password[s]}`;
											try {
												await axios.get(startApplicationURL);
											} catch (error) {
												this.log.warn(`[send startApplicationURL] Unable to contact: ${error} | ${error}`);
											}

										}
										break;
									default:
										if (comm === commandsStr) {

											const commandsURL = `http://${ip[s]}:${port[s]}/?cmd=${dp}&password=${password[s]}`;
											try {
												await axios.get(commandsURL);
											} catch (error) {
												this.log.warn(`[send commandsURL] Unable to contact: ${error} | ${error}`);
											}
										}
								}
							}
						} else {
							const reloadAllURL = `http://${ip[s]}:${port[s]}/?cmd=loadStartURL&password=${password[s]}`;
							try {
								await axios.get(reloadAllURL);
							} catch (error) {
								this.log.warn(`[send reloadAll] Unable to contact: ${error} | ${error}`);
							}

						}
					}

				}
			}
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

							try {
								await axios.get(foregroundAppUrl);
							} catch (error) {
								this.log.error(`${await tabletName[app]} [foregroundApp] could not be sent: ${error.message}, stack: ${error.stack}`);
							}
						}, fireTabletInterval);
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
		if (JSON.parse(this.config.chargerON)) {
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
										messageSend[i] = false;
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
									this.setState(`device.${await tabletName[i]}.charging_warning`, { val: false, ack: true });
								}

							}
							else {
								if (await bat[i] >= 20 && !messageSend[i]) {
									messageSend[i] = false;

								}
								if (await bat[i] <= 18 && !chargeDeviceValue[i] && !AlertMessageSend[i] || bat[i] <= 18 && chargeDeviceValue[i] && !AlertMessageSend[i]) {
									AlertMessageSend[i] = true;
									messageSend[i] = false;
									this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!`);
									this.setForeignStateAsync(await chargerid[i], true, false);
									this.setState(`device.${await tabletName[i]}.charging_warning`, { val: true, ack: true });

								} else if (await bat[i] > 18 && bat[i] < 20 && chargeDeviceValue[i] && !messageSend[i]) {

									messageSend[i] = true;
									AlertMessageSend[i] = false;
									this.log.info(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${await tabletName[i]} Tablet is charging the problem has been fixed.`);
									this.setState(`device.${await tabletName[i]}.charging_warning`, { val: false, ack: true });
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
	}

	async brightnessCron() {
		if (brightnessControlEnabled) {
			for (const c in tabletName) {
				if (enabledBrightness[c]) {
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
			}
		}
	}

	async nightBri() {
		try {
			const brightnessN = this.config.brightness;
			if (!brightnessN || brightnessN !== []) {

				for (const b in ip) {

					if (deviceEnabled[b]) {
						if (enabledBrightness[b]) {

							if (brightnessN[b]) {

								const brightnessNight = Math.round(await this.convert_percent(brightnessN[b].nightBrightness));
								const nightBrightnessURL = `http://${ip[b]}:${port[b]}/?cmd=setStringSetting&key=screenBrightness&value=${brightnessNight}&password=${password[b]}`;
								const ScreensaverOnBri = `http://${ip[b]}:${port[b]}/?cmd=setStringSetting&key=screensaverBrightness&value=${brightnessNight}&password=${password[b]}`;

								if (await brightness[b] == 0) {

									this.log.debug(`The brightness from ${await tabletName[b]} is ${await brightness[b]} change is not necessary`);
								}
								else {

									try {
										await axios.get(nightBrightnessURL);
										await axios.get(ScreensaverOnBri);
									} catch (error) {
										this.log.error(`${await tabletName[b]} [nightBri] could not be sent: ${error.message}, stack: ${error.stack}`);
										this.log.error(`${await tabletName[b]} [ScreensaverOnBri] could not be sent: ${error.message}, stack: ${error.stack}`);
									}

									this.log.debug(`${await tabletName[b]} send Command: ${nightBrightnessURL}`);
									this.log.debug(`${await tabletName[b]} send Command: ${ScreensaverOnBri}`);
								}
							}
							else {
								console.log(`${await tabletName[b]} nightBri not specified`);
								this.log.warn(`${await tabletName[b]} nightBri not specified`);
							}
						}
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
			for (const name in ip) {
				if (deviceEnabled[name]) {

					// if (enabledBrightness[name]) {

					const stateID = await this.replaceFunction(tabletName[name]);
					const manual = await this.getStateAsync(`device.${stateID}.manualBrightness`);
					if (manual && manual.val) {
						manualBrightness[name] = manual.val;
						// @ts-ignore
						await this.setStateAsync(`device.${stateID}.manualBrightness`, manual.val, true);
					}
					else {
						await this.setStateAsync(`device.${stateID}.manualBrightness`, 0, true);
						manualBrightness[name] = 0;
					}

					const manualMode = await this.getStateAsync(`device.${stateID}.brightness_control_mode`);
					if (manualMode && (manualMode.val || !manualMode.val)) {
						manualBrightnessMode[name] = manualMode.val;
						// @ts-ignore
						await this.setStateAsync(`device.${stateID}.brightness_control_mode`, manualMode.val, true);
					}
					else {
						await this.setStateAsync(`device.${stateID}.brightness_control_mode`, false, true);
						manualBrightnessMode[name] = false;
					}

					// if (manualMode && (manualMode.val || !manualMode.val)) {
					// 	manualBrightnessMode[name] = manualMode.val;
					// 	// @ts-ignore
					// 	await this.setStateAsync(`device.${stateID}.brightness_control_mode`, manualMode.val, true);
					// }
					// else {
					// 	await this.setStateAsync(`device.${stateID}.brightness_control_mode`, false, true);
					// 	manualBrightnessMode[name] = false;
					// }

					this.log.debug(`[manualBrightness] name: ${tabletName[name]} val: ${await manualBrightness[name]}`);
					this.log.debug(`[manualBrightnessMode] name: ${tabletName[name]} val: ${await manualBrightnessMode[name]}`);
					this.dayBri();
				}

				// }

			}
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
						if (brightnessControlEnabled) {
							if (enabledBrightness[d]) {

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

										try {
											await axios.get(daytimeBrightnessURL);
											await axios.get(ScreensaverOnBri);
										} catch (error) {
											this.log.error(`${await tabletName[d]} [dayBri] could not be sent: ${error.message}, stack: ${error.stack}`);
											this.log.error(`${await tabletName[d]} [ScreensaverOnBri] could not be sent: ${error.message}, stack: ${error.stack}`);
										}
										this.log.debug(`${await tabletName[d]} send Command: ${daytimeBrightnessURL}`);
										this.log.debug(`${await tabletName[d]} send Command: ${ScreensaverOnBri}`);
									}
								}
								else {
									console.log(`${await tabletName[d]} dayBri not specified`);
									this.log.warn(`${await tabletName[d]} dayBri not specified`);
								}

							}
							else {

								let daytimeBrightnessURL = null;
								let ScreensaverOnBri = null;
								let newBrightnessDay = 0;

								if (await manualBrightnessMode[d]) {
									newBrightnessDay = Math.round(await this.convert_percent(await manualBrightness[d]));
									this.log.debug(`${await tabletName[d]} brightness set on: ` + newBrightnessDay + `[` + manualBrightness[d] + `%]`);
								}
								else {
									newBrightnessDay = Math.round(await this.convert_percent(brightnessD[d].dayBrightness));
									this.log.debug(`${await tabletName[d]} brightness set on: ` + newBrightnessDay + `[` + brightnessD[d].dayBrightness + `%]`);
								}

								daytimeBrightnessURL = `http://${ip[d]}:${port[d]}/?cmd=setStringSetting&key=screenBrightness&value=${newBrightnessDay}&password=${password[d]}`;
								ScreensaverOnBri = `http://${ip[d]}:${port[d]}/?cmd=setStringSetting&key=screensaverBrightness&value=${newBrightnessDay}&password=${password[d]}`;
								if (await brightness[d] !== newBrightnessDay) {

									try {
										await axios.get(daytimeBrightnessURL);
										await axios.get(ScreensaverOnBri);
										await this.stateRequest();
									} catch (error) {
										this.log.error(`${await tabletName[d]} [dayBri] could not be sent: ${error.message}, stack: ${error.stack}`);
										this.log.error(`${await tabletName[d]} [ScreensaverOnBri] could not be sent: ${error.message}, stack: ${error.stack}`);
									}
									this.log.debug(`${await tabletName[d]} send Command: ${daytimeBrightnessURL}`);
									this.log.debug(`${await tabletName[d]} send Command: ${ScreensaverOnBri}`);
								}

							}
						}
						else {

							let daytimeBrightnessURL = null;
							let ScreensaverOnBri = null;
							let newBrightnessDay = 0;
							if (deviceEnabled) {
								if (await manualBrightnessMode[d]) {
									newBrightnessDay = Math.round(await this.convert_percent(await manualBrightness[d]));
									this.log.debug(`${await tabletName[d]} brightness set on: ` + newBrightnessDay + `[` + manualBrightness[d] + `%]`);
								}
								else {
									newBrightnessDay = Math.round(await this.convert_percent(brightnessD[d].dayBrightness));
									this.log.debug(`${await tabletName[d]} brightness set on: ` + newBrightnessDay + `[` + brightnessD[d].dayBrightness + `%]`);
								}

								daytimeBrightnessURL = `http://${ip[d]}:${port[d]}/?cmd=setStringSetting&key=screenBrightness&value=${newBrightnessDay}&password=${password[d]}`;
								ScreensaverOnBri = `http://${ip[d]}:${port[d]}/?cmd=setStringSetting&key=screensaverBrightness&value=${newBrightnessDay}&password=${password[d]}`;
								if (await brightness[d] !== newBrightnessDay) {

									try {
										await axios.get(daytimeBrightnessURL);
										await axios.get(ScreensaverOnBri);
										await this.stateRequest();
									} catch (error) {
										this.log.error(`${await tabletName[d]} [dayBri] could not be sent: ${error.message}, stack: ${error.stack}`);
										this.log.error(`${await tabletName[d]} [ScreensaverOnBri] could not be sent: ${error.message}, stack: ${error.stack}`);
									}
									this.log.debug(`${await tabletName[d]} send Command: ${daytimeBrightnessURL}`);
									this.log.debug(`${await tabletName[d]} send Command: ${ScreensaverOnBri}`);
								}
							}
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
									if (!isInScreensaver[on]) {
										const ScreensaverOnURL = `http://${ip[on]}:${port[on]}/?cmd=startScreensaver&password=${password[on]}`;

										this.log.debug(`${await tabletName[on]} Screensaver starts in ${await screenSaverTimer[on]} ms`);
										console.log(`isInScreensaver: ${isInScreensaver[on]}`);

										ScreensaverTimer[on] = setTimeout(async () => {

											try {
												await axios.get(ScreensaverOnURL);
											} catch (error) {
												this.log.error(`${await tabletName[on]} [screenSaver On] could not be sent: ${error.message}, stack: ${error.stack}`);
											}

											this.log.debug(`${await tabletName[on]} send Command: screenSaver On ${ScreensaverOnURL}`);
											console.log(`send Command: screenSaver On ${ScreensaverOnURL}`);
											this.stateRequest();
										}, screenSaverTimer[on]);

										console.log(`screenSaverTimer[on] ${await screenSaverTimer[on]}`);
									} else if (isInScreensaver[on]) {
										this.log.debug(`${await tabletName[on]} Screensaver already on`);
										console.log(`isInScreensaver': ${isInScreensaver[on]}`);
									}
								} else {
									console.log(`motionVal == true: ${motionVal[on]}`);
									this.log.debug(`${await tabletName[on]} Movement was detected. Screen saver is switched off`);
									const ScreensaverOffURL = `http://${ip[on]}:${port[on]}/?cmd=stopScreensaver&password=${password[on]}`;
									if (!isInScreensaver[on]) {
										console.log(`isInScreensaver: ${isInScreensaver[on]}`);
										this.log.debug('no screensaver switched on');
									} else if (isInScreensaver[on]) {
										console.log(`isInScreensaver: ${isInScreensaver[on]}`);

										try {
											await axios.get(ScreensaverOffURL);
										} catch (error) {
											this.log.error(`${await tabletName[on]} [screenSaver Off] could not be sent: ${error.message}, stack: ${error.stack}`);
										}

										this.log.debug(`${await tabletName[on]} send Command: screenSaver Off ${ScreensaverOffURL} `);
									}
								}
							} else {
								const ScreensaverOn = `http://${ip[on]}:${port[on]}/?cmd=startScreensaver&password=${password[on]}`;
								console.log(`motionSensor_enabled Off: ${motionSensor_enabled}`);
								if (!isInScreensaver[on]) {
									this.log.debug(`${await tabletName[on]} Screensaver starts in ${await screenSaverTimer[on]} ms`);
									console.log(`isInScreensaver[on]: ${isInScreensaver[on]}`);

									ScreensaverTimer[on] = setTimeout(async () => {
										if (ScreensaverReturn) clearTimeout(ScreensaverReturn);
										console.log(`[screenSaver On] ${await tabletName[on]}`);

										try {
											await axios.get(ScreensaverOn);
										} catch (error) {
											this.log.error(`${await tabletName[on]} [screenSaver On] could not be sent: ${error.message}, stack: ${error.stack}`);
										}

										this.log.debug(`${await tabletName[on]} send Command: screenSaver On ${ScreensaverOn}`);
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
						try {
							await axios.get(Screen[s]);
						} catch (error) {
							this.log.warn(`${await tabletName[s]} [screenON] could not be sent: ${error.message}, stack: ${error.stack}`);
						}

					}
				}
			}
		}
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
		const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
		return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
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

	/*
	Vis function
	*/
	async switchToHomeView() {
		try {
			if (view_enabled) {

				if (!mode) {

					const visCmd = '{"instance": "FFFFFFFF", "command": "changeView", "data": "' + homeView + '"}';

					viewTimer = setTimeout(async () => {

						let timer = await this.getStateAsync(`vis_View.Timer_View_Switch`);
						if (timer && timer.val) {

							timer = parseInt(timer.val);
							if (timer > 1) {

								await this.setStateChangedAsync(`vis_View.Timer_View_Switch`, timer - 1, true);
								this.switchToHomeView();
							}
							else {

								if (viewTimer) clearTimeout(viewTimer);
								await this.setStateAsync(`vis_View.Timer_View_Switch`, 0, true);
								await this.setForeignStateAsync('vis.0.control.command', visCmd);
								console.log(visCmd);
							}
						}
					}, 1000);
				}
				else {
					viewTimer = setTimeout(async () => {
						let timer = await this.getStateAsync(`vis_View.Timer_View_Switch`);
						if (timer && timer.val) {

							timer = parseInt(timer.val);

							if (timer > 1) {

								await this.setStateChangedAsync(`vis_View.Timer_View_Switch`, timer - 1, true);
								this.switchToHomeView();
							}
							else {

								if (viewTimer) clearTimeout(viewTimer);
								await this.setStateAsync(`vis_View.Timer_View_Switch`, 0, true);
								await this.setStateAsync('vis_View.widget_8_view', 0, true);

							}
						}
					}, 1000);
				}
			}
		} catch (error) {
			this.log.error(`[switchToHomeView] : ${error.message}, stack: ${error.stack}`);
		}
	}

	async checkView() {
		try {
			if (view_enabled) {
				if (!mode) {
					const currentView = await this.getForeignStateAsync(`vis.0.control.data`);

					for (let i = 0; i < Object.keys(visView).length; i++) {

						if (currentView && currentView.val) {

							if (wishView[i] == currentView.val) {

								if (viewTimer) clearTimeout(viewTimer);
								this.setState(`vis_View.Timer_View_Switch`, 0, true);

								if (visView[i].time !== 0) {

									this.setState(`vis_View.Timer_View_Switch`, time[i]);
									this.switchToHomeView();
									break;
								}
							}
						}
					}
				}
				else {

					const currentView = await this.getStateAsync(`vis_View.widget_8_view`);


					if (currentView == null || currentView == null && currentView.val == 0) {
						this.setState(`vis_View.Timer_View_Switch`, 0, true);
					}
					for (let i = -1; i <= Object.keys(visView).length; i++) {
						// for (const i in visView) {
						if (currentView) {

							if (viewNumber[i] == currentView.val) {

								if (viewTimer) clearTimeout(viewTimer);
								this.setState(`vis_View.Timer_View_Switch`, 0, true);

								if (visView[i].time !== 0) {

									this.setState(`vis_View.Timer_View_Switch`, time[i]);
									this.switchToHomeView();
									break;
								}
							}
						}
					}
				}
			}
		} catch (error) {
			this.log.error(`[checkView] : ${error.message}, stack: ${error.stack}`);
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
				const boolenArray = ['isInScreensaver', 'isScreenOn', 'kioskMode', 'maintenanceMode', 'isInDaydream', 'isLicensed', 'plugged', 'keyguardLocked', 'isDeviceAdmin',
					'kioskLocked', 'isDeviceOwner'];

				const memoryArray = ['internalStorageFreeSpace', 'appTotalMemory', 'ramFreeMemory', 'appFreeMemory',
					'internalStorageTotalSpace', 'ramUsedMemory', 'appUsedMemory', 'ramTotalMemory'];

				const commandArray = ['loadStartURL', 'clearCache', 'clearWebstorage', 'clearCookies', 'restartApp', 'exitApp', 'screenOn', 'screenOff', 'forceSleep', 'triggerMotion', 'startScreensaver',
					'stopScreensaver', 'startDaydream', 'stopDaydream', 'toForeground', 'popFragment', 'enableLockedMode', 'disableLockedMode'];


				for (const d in boolenArray) {
					await this.extendObjectAsync(`device.${stateID}.device_info.${boolenArray[d]}`, {
						type: 'state',
						common: {
							name: `${stateName} ${boolenArray[d]}`,
							type: 'boolean',
							role: 'indicator',
							def: false,
							read: true,
							write: false
						},
						native: {},
					});
				}

				for (const m in memoryArray) {
					await this.extendObjectAsync(`device.${stateID}.device_info.memory.${memoryArray[m]}`, {
						type: 'state',
						common: {
							name: `${stateName} ${memoryArray[m]}`,
							type: 'string',
							role: 'state',
							def: '0',
							read: true,
							write: false
						},
						native: {},
					});
				}

				for (const c in commandArray) {
					await this.extendObjectAsync(`device.${stateID}.commands.${commandArray[c]}`, {
						type: 'state',
						common: {
							name: `${stateName} ${commandArray[c]}`,
							type: 'boolean',
							role: 'button',
							def: true,
							read: true,
							write: true
						},
						native: {},
					});

					this.subscribeStates(`device.${stateID}.commands.${commandArray[c]}`);
					commandsID.push(`.device.${stateID}.commands.${commandArray[c]}`);
				}

				await this.extendObjectAsync(`device.reloadAll`, {
					type: 'state',
					common: {
						name: `reload All Tablet view`,
						type: 'boolean',
						role: 'button',
						def: true,
						read: true,
						write: true
					},
					native: {},
				});


				await this.extendObjectAsync(`device.${stateID}.device_info.device_ip`, {
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

				await this.extendObjectAsync(`device.${stateID}.device_info.deviceModel`, {
					type: 'state',
					common: {
						name: `${stateName} device Model`,
						type: 'string',
						role: 'text',
						def: '',
						read: true,
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.device_info.ssid`, {
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

				await this.extendObjectAsync(`device.${stateID}.device_info.currentFragment`, {
					type: 'state',
					common: {
						name: `${stateName} currentFragment`,
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

				await this.extendObjectAsync(`device.${stateID}.device_info.LastAppStart`, {
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
							2: 'charge 10 %',
							3: '20 %',
							4: 'charge 20 %',
							5: '30 %',
							6: 'charge 30 %',
							7: '40 %',
							8: 'charge 40 %',
							9: '50 %',
							10: 'charge 50 %',
							11: '60 %',
							12: 'charge 60 %',
							13: '70 %',
							14: 'charge 70 %',
							15: '80 %',
							16: 'charge 80 %',
							17: '90 %',
							18: 'charge 90 %',
							19: '100 %',
							20: 'charge 100 %'
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
				await this.extendObjectAsync(`vis_View.Timer_View_Switch`, {
					type: 'state',
					common: {
						name: `Timer View Switch`,
						type: 'number',
						role: 'value',
						read: true,
						write: false

					},
					native: {},
				});

				await this.extendObjectAsync(`vis_View.widget_8_view`, {
					type: 'state',
					common: {
						name: `widget 8 view`,
						type: 'number',
						role: 'value',
						read: true,
						write: true

					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.device_info.wifiSignalLevel`, {
					type: 'state',
					common: {
						name: `${stateName} wifiSignalLevel`,
						type: 'number',
						role: 'value',
						def: 0,
						read: true,
						write: true

					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.device_info.deviceName`, {
					type: 'state',
					common: {
						name: `${stateName} deviceName`,
						type: 'string',
						role: 'info.name',
						def: '',
						read: true,
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.device_info.displayHeightPixels`, {
					type: 'state',
					common: {
						name: `${stateName} displayHeightPixels`,
						type: 'string',
						role: 'info.display',
						def: '',
						unit: 'px',
						read: true,
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.device_info.displayWidthPixels`, {
					type: 'state',
					common: {
						name: `${stateName} displayWidthPixels`,
						type: 'string',
						role: 'info.display',
						def: '',
						unit: 'px',
						read: true,
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.device_info.screenOrientation`, {
					type: 'state',
					common: {
						name: `${stateName} screenOrientation`,
						type: 'number',
						role: 'info.display',
						def: 0,
						read: true,
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.device_info.ip6`, {
					type: 'state',
					common: {
						name: `${stateName} ip6`,
						type: 'string',
						role: 'info.ip',
						def: '',
						read: true,
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.device_info.mac`, {
					type: 'state',
					common: {
						name: `${stateName} mac`,
						type: 'string',
						role: 'info.mac',
						def: '',
						read: true,
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.device_info.appVersionName`, {
					type: 'state',
					common: {
						name: `${stateName} appVersionName`,
						type: 'string',
						role: 'text',
						def: '',
						read: true,
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.device_info.startUrl`, {
					type: 'state',
					common: {
						name: `${stateName} startUrl`,
						type: 'string',
						role: 'url',
						def: '',
						read: true,
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.device_info.deviceManufacturer`, {
					type: 'state',
					common: {
						name: `${stateName} deviceManufacturer`,
						type: 'string',
						role: 'text',
						def: '',
						read: true,
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.device_info.androidVersion`, {
					type: 'state',
					common: {
						name: `${stateName} androidVersion`,
						type: 'string',
						role: 'text',
						def: '',
						read: true,
						write: false
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.device_info.foregroundApp`, {
					type: 'state',
					common: {
						name: `${stateName} foregroundApp`,
						type: 'string',
						role: 'text',
						def: '',
						read: true,
						write: false
					},
					native: {},
				});


				await this.extendObjectAsync(`device.${stateID}.commands.startApplication`, {
					type: 'state',
					common: {
						name: `${stateName} startApplication`,
						type: 'string',
						role: 'text',
						def: '',
						read: true,
						write: true
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.commands.loadURL`, {
					type: 'state',
					common: {
						name: `${stateName} loadURL`,
						type: 'string',
						role: 'text',
						def: '',
						read: true,
						write: true
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.commands.textToSpeech`, {
					type: 'state',
					common: {
						name: `${stateName} textToSpeech`,
						type: 'string',
						role: 'text',
						def: '',
						read: true,
						write: true
					},
					native: {},
				});

				await this.extendObjectAsync(`device.${stateID}.commands.setStringSetting`, {
					type: 'state',
					common: {
						name: `${stateName} setStringSetting`,
						type: 'string',
						role: 'text',
						def: '',
						read: true,
						write: true
					},
					native: {},
				});


				this.subscribeStates(`vis_View.widget_8_view`);
				this.subscribeForeignStates(`vis.0.control.data`);
				this.subscribeStates(`device.${stateID}.manualBrightness`);
				this.subscribeStates(`device.${stateID}.brightness_control_mode`);
				this.subscribeStates(`device.${stateID}.commands.setStringSetting`);
				this.subscribeStates(`device.${stateID}.commands.textToSpeech`);
				this.subscribeStates(`device.${stateID}.commands.loadURL`);
				this.subscribeStates(`device.${stateID}.commands.startApplication`);
				this.subscribeStates(`device.reloadAll`);

				manualBrightnessID[name] = `.device.${stateID}.manualBrightness`;
				brightnessControlModeID[name] = `.device.${stateID}.brightness_control_mode`;
				reloadAllID = `.device.reloadAll`;
				startApplicationID[name] = `.device.${stateID}.commands.startApplication`;
				loadURLID[name] = `.device.${stateID}.commands.loadURL`;
				textToSpeechID[name] = `.device.${stateID}.commands.textToSpeech`;
				setStringSettingID[name] = `.device.${stateID}.commands.setStringSetting`;

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
			if (viewTimer) clearTimeout(viewTimer);
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
					if (deviceEnabled[change]) {
						if (!state.ack) {
							// console.log(id == `${this.namespace}${brightnessControlModeID[change]}` || id == `${this.namespace}${manualBrightnessID[change]}`);
							if (id == `${this.namespace}${brightnessControlModeID[change]}` || id == `${this.namespace}${manualBrightnessID[change]}` && state.from !== `system.adapter.${this.namespace}`) {
								this.log.debug(`state ${id} changed: ${state.val} from: ${this.namespace}`);
								this.manualStates();
								console.log(`onStateChange: ${id} val: ${state.val}`);
								break;
							}
						}
					}
				}

				for (const change in tabletName) {
					if (deviceEnabled[change]) {
						if (!state.ack) {
							// console.log(id == `${this.namespace}${brightnessControlModeID[change]}` || id == `${this.namespace}${manualBrightnessID[change]}`);
							if (id == `${this.namespace}${startApplicationID[change]}` || id == `${this.namespace}${loadURLID[change]}` || id == `${this.namespace}${textToSpeechID[change]}` || id == `${this.namespace}${setStringSettingID[change]}`) {
								this.log.debug(`state ${id} changed: ${state.val} from: ${this.namespace}`);
								this.sendFullyCommand(id, state);
								console.log(`onStateChange: ${id} val: ${state.val}`);
								break;
							}
						}
					}
				}

				for (const change in tabletName) {
					if (deviceEnabled[change]) {
						if (!state.ack) {
							// console.log(id == `${this.namespace}${brightnessControlModeID[change]}` || id == `${this.namespace}${manualBrightnessID[change]}`);
							for (const b in commandsID) {
								if (id == `${this.namespace}${commandsID[b]}`) {
									this.log.debug(`state ${id} changed: ${state.val} from: ${this.namespace}`);
									this.sendFullyCommand(id, state);
									console.log(`onStateChange: ${id} val: ${state.val}`);
									break;
								}
							}
						}
					}
				}

				for (const change in tabletName) {
					if (deviceEnabled[change]) {
						if (!state.ack) {

							if (id == `${this.namespace}${reloadAllID}`) {
								this.log.debug(`state ${id} changed: ${state.val} from: ${this.namespace}`);
								this.sendFullyCommand(id, state);
								console.log(`onStateChange: ${id} val: ${state.val}`);
							}
						}
					}
				}


				// Motion Sensor State Change
				for (const change in motionID) {
					// console.log(id == `${motionID[change]}`);
					if (id == `${motionID[change]}`) {
						this.log.debug(`state ${id} changed: ${state.val}`);
						this.motionSensor();
						console.log(`onStateChange: ${id} val: ${state.val}`);
					}

				}
				if (view_enabled) {
					if (!mode) {
						if (id == `vis.0.control.data`) {
							this.log.debug(`state ${id} changed: ${state.val}`);
							this.checkView();
							console.log(`onStateChange: ${id} val: ${state.val}`);
						}
					}
					else {
						if (!state.ack) {
							if (id == `${this.namespace}.vis_View.widget_8_view`) {
								this.log.debug(`state ${id} changed: ${state.val}`);
								this.checkView();
								console.log(`onStateChange: ${id} val: ${state.val}`);
							}
						}
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
	module.exports = (options) => new FullyTabletControl(options);
} else {
	// otherwise start the instance directly
	new FullyTabletControl();
}