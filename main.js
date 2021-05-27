'use strict';

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const {default: axios} = require('axios');
const schedule = require('cron').CronJob; // Cron Scheduler
const SunCalc = require('suncalc2');
const object = require('./lib/object_definition');
const device_Folder_Object = object['object_device_Folder_definitions'];
const main_Object = object['object_main_definitions'];
const command_Object = object['object_commands_definitions'];
const device_info_Object = object['object_device_info_definitions'];
const memory_Object = object['object_memory_definitions'];
const kiosk_Object = object['object_kiosk_definitions'];
const vis_View_object = object['object_vis_View_definitions'];


//Timeout init
let requestTimeout = null;
let automatic_briTimeout = null;
let viewTimer = null;
let ScreensaverReturn = null;
const foregroundAppTimer = [];
const logMessageTimer = [];
const kioskPinTimeout = [];
let BriRequestTimeout = null
let captureTimeout = []

//global variables
const ip = [];
const User = [];
const port = [];
const password = [];
const deviceInfo = [];
const tabletName = [];
let day_Time = null;
const deviceEnabled = [];
let fireTabletInterval = null;
let interval = null;
let imageTimeout = null;
let checkInterval = null;
let brightnessControlEnabled = null;
const telegramStatus = [];
const foregroundStart = [];
const messageSend = [];
const AlertMessageSend = [];
const logMessage = [];
const messageCharging = [];
const enabledBrightness = [];
const screensaverTimer = [];
const screenSaverTime = [];
const enableScreenSaverBrightness = [];
const viewNumber = [];
let timeMode = null;
const chargeDeviceValue = [];
let homeView = null;
let imageNr = [];
let loop = [];
const wishView = [];
const time = [];
const channelFolder = ['device_info', 'commands'];
const manualBrightnessMode = [];
const motionID = []
const motionVal = [];
const commandsID = [];
const brightness = [];
const isInScreensaver = [];
const foreground = [];
const versionCheck = [];
const screensaverOnURL = [];
const screensaverOffURL = [];
let motionDetectorStatus = [];
let imageObj = {};
let shareObj = {}
let manuel_screenSaver = [false];


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
        await this.stateRequest();
        await this.astroTime();
        await this.automatic_bri();
        // @ts-ignore
        // await this.checkView();


    }

    async initialization() {
        try {


            // let hostname = this.host
            // console.log(hostname)


            this.log.debug(`prepare adapter for initialization`);
            this.log.debug(`Adapter config is read out`);

            // Interval init
            try {
                // polling min 5 sec.
                interval = this.config.interval * 1000;
                if (interval < 10000) {
                    this.log.warn(`the request interval time falls below the permitted limit of 10 sec ==> ${interval} ms => ${interval / 1000} sec`);
                    interval = 10000;

                }
                this.log.debug(`Adapter config for request interval readout --> ${interval} ms`);


                // polling min 1 min.
                checkInterval = this.config['checkInterval'] * 60000;
                if (checkInterval < 60000) {
                    this.log.warn(`the brightness interval time falls below the permitted limit of 1 min ==> ${checkInterval} ms => ${checkInterval / 60000} min`);
                    checkInterval = 60000;

                }
                this.log.debug(`Adapter config for brightness interval readout --> ${checkInterval} ms`);


                // polling min 1 min.
                fireTabletInterval = this.config['fireTablet'] * 60000;
                if (fireTabletInterval < 60000) {
                    this.log.warn(`the fire Tablet Interval time falls below the permitted limit of 1 min ==> ${fireTabletInterval} ms => ${fireTabletInterval / 60000} min`);
                    fireTabletInterval = 60000;

                }
                this.log.debug(`Adapter config for request interval readout --> ${interval} ms`);

                // polling min 1 sec / max 5 sec.
                imageTimeout = this.config['imageTimeout'] * 1000;
                if (imageTimeout < 1000) {
                    this.log.warn(`the image Timeout time falls below the permitted limit of 1 sec ==> ${imageTimeout} ms => ${imageTimeout / 1000} sec`);
                    imageTimeout = 1000;

                }
                if (imageTimeout > 5000) {
                    this.log.warn(`the image timeout time is greater than 5 sec ==> ${imageTimeout} ms => ${imageTimeout / 1000} sec. is reset to 5 sec.`);
                    imageTimeout = 5000;

                }
                this.log.debug(`Adapter config for image timeout readout --> ${imageTimeout} ms`);

                this.log.debug(`Interval initialization has been fully initialized`);
            }
            catch (error) {
                this.log.error(`Interval initialization funktion has a problem: ${error.message}, stack: ${error.stack}`);
            }


            // Login init
            try {
                //read devices and created httpLink
                const login = this.config.devices;

                if (!login && login['length'] !== 0 || login !== [] && login['length'] !== 0) {
                    for (const i in login) {

                        ip[i] = login[i].ip;
                        port[i] = login[i].port;
                        password[i] = encodeURIComponent(login[i].password);
                        deviceEnabled[i] = login[i].enabled;
                        tabletName[i] = login[i].name;

                        deviceInfo[i] = `http://${ip[i]}:${port[i]}/?cmd=deviceInfo&type=json&password=${password[i]}`;

                        this.log.debug(`the initialization Ip for ${tabletName[i]} was Successfully: ${ip[i]}`);
                        this.log.debug(`the initialization port for ${tabletName[i]} was Successfully: ${port[i]}`);
                        this.log.debug(`the initialization password for ${tabletName[i]} was Successfully: ${password[i]}`);
                        this.log.debug(`the initialization deviceInfoUrl for ${tabletName[i]} was Successfully: ${deviceInfo[i]}`);
                        this.log.debug(`Check whether the IP address is available for the ${tabletName[i]}`);

                        deviceEnabled[i] = ip[i] !== '' && deviceEnabled[i];
                        if (ip[i] === '') this.log.warn(`${tabletName[i]} has no ip address device is not queried`);

                        if (deviceEnabled[i]) this.log.debug(`the initialization for ${tabletName[i]} was Successfully`);


                        this.log.debug(`it is checked whether the name of the device is entered`);
                        // Prepare tablet name
                        if (tabletName[i] !== '') {

                            this.log.debug(`the name of the device is entered and is used --> ${tabletName[i]}`);
                            tabletName[i] = await this.replaceFunction(tabletName[i]);

                        }
                        else if (deviceEnabled[i]) {

                            this.log.debug(`The name of the device is not entered; the IP address is used for the name --> ${ip[i]}`);
                            tabletName[i] = await this.replaceFunction(ip[i]);

                        }
                        this.log.debug(`Tablet name is being prepared: ${tabletName[i]}`);
                        this.log.debug(`${tabletName[i]} login has been fully initialized`);
                    }

                }
                else {
                    deviceEnabled[1] = false;
                }

            }
            catch (error) {
                this.log.error(`login initialization funktion has a problem: ${error.message}, stack: ${error.stack}`);
            }

            // Telegram User init
            try {
                //read telegram user
                this.log.debug(`read out the adapter config for Telegram users`);

                const telegramOn = this.config['telegram_enabled'];
                const telegramUser = this.config.telegram;

                if (telegramOn) {

                    // @ts-ignore
                    if (!telegramUser && telegramUser.length !== 0 || telegramUser !== [] && telegramUser.length !== 0) {
                        for (const u in telegramUser) {

                            User[u] = telegramUser[u].telegramUser;

                        }
                        this.log.debug(`Telegram users were read out ==> ${JSON.stringify(User)}`);
                    }
                    if (telegramOn) this.log.debug(`Telegram messages are switched on`);
                    if (!telegramOn) this.log.debug(`Telegram messages are switched off`);
                }
                this.log.debug(`TelegramUser initialization has been fully initialized`);
            }
            catch (error) {
                this.log.error(`Telegram initialization funktion has a problem: ${error.message}, stack: ${error.stack}`);
            }

            //image_funktion init
            try {
                this.log.debug(`image_funktion is now set to default value 1 for all devices`);

                for (const s in deviceEnabled) {
                    imageNr[s] = 1;
                    loop[s] = 1;
                }

                // set a CronJob that resets the variable with the number of stored images to the start value at midnight
                const imageSafeCron = new schedule(`1 0 * * * `, async () => {
                    for (const s in deviceEnabled) {
                        imageNr[s] = 1;
                    }
                    this.log.debug(`imageSafeCron resets the number of stored images. ${new Date}`);
                });
                imageSafeCron.start();

                this.log.debug(`image_funktion initialization has been fully initialized`);
            }
            catch (error) {
                this.log.error(`image_funktion has a problem: ${error.message}, stack: ${error.stack}`);
            }

            //SendStatus init
            try {
                this.log.debug(`send status is now set to false for all devices`);

                for (const s in deviceEnabled) {

                    telegramStatus[s] = false;
                    this.log.debug(`telegramSendStatus set for ${tabletName[s]} to: ${telegramStatus[s]}`);

                    messageSend[s] = true;
                    this.log.debug(`message Send status set for ${tabletName[s]} to: ${messageSend[s]}`);

                    AlertMessageSend[s] = false;
                    this.log.debug(`AlertMessage Send status set for ${tabletName[s]} to: ${AlertMessageSend[s]}`);

                    logMessage[s] = false;
                    this.log.debug(`logMessage status set for ${tabletName[s]} to: ${logMessage[s]}`);

                    messageCharging[s] = false;
                    this.log.debug(`messageCharging status set for ${tabletName[s]} to: ${messageCharging[s]}`);

                    versionCheck[s] = false;
                    this.log.debug(`versionCheck status set for ${tabletName[s]} to: ${versionCheck[s]}`);

                }
                this.log.debug(`SendStatus initialization has been fully initialized`);
            }
            catch (error) {
                this.log.error(`SendStatus funktion has a problem: ${error.message}, stack: ${error.stack}`);
            }

            // foregroundStatus init
            try {
                this.log.debug(`foregroundStatus is now set to false for all devices`);

                for (const f in deviceEnabled) {
                    if (deviceEnabled[f]) {

                        foregroundStart[f] = false;
                        this.log.debug(`foregroundStart status set for ${tabletName[f]} to: ${JSON.stringify(telegramStatus)}`);

                    }
                }
                this.log.debug(`foregroundStatus initialization has been fully initialized`);
            }
            catch (error) {
                this.log.error(`foregroundStatus funktion has a problem: ${error.message}, stack: ${error.stack}`);
            }

            // BrightnessControl init
            try {
                this.log.debug(`Check whether the brightness control is activated`);
                brightnessControlEnabled = JSON.parse(this.config['brightness_on']);

                const brightnessObject = this.config.brightness;

                if (brightnessControlEnabled) {

                    // @ts-ignore
                    if (!brightnessObject && brightnessObject.length !== 0 || brightnessObject !== [] && brightnessObject.length !== 0) {

                        for (const b in deviceEnabled) {

                            this.log.debug(`Check whether the brightness control is activated for ${tabletName[b]}`);
                            if (brightnessObject[b] !== undefined) {
                                enabledBrightness[b] = brightnessObject[b]['enabledBrightness']
                            }
                            else {
                                this.log.warn(`Attention the brightness control of ${tabletName[b]} is not activated correctly ==> undefined`);
                                enabledBrightness[b] = false;
                                this.log.warn(`it is switched off temporarily, please deactivate it or activate it correctly`);
                            }

                            manualBrightnessMode[b] = await this.getStateAsync(`device.${tabletName[b]}.brightness_control_mode`)

                            if (manualBrightnessMode[b] === null) {
                                manualBrightnessMode[b] = false
                            }
                            else {
                                manualBrightnessMode[b] = manualBrightnessMode[b].val
                            }

                        }
                    }
                    else {
                        for (const b in deviceEnabled) {
                            this.log.debug(`The brightness settings for the devices are not defined. The manual mode is now switched on`);
                            enabledBrightness[b] = false;
                            // await this.setStateAsync(`device.${await this.replaceFunction(tabletName[b])}.brightness_control_mode`, true, true);
                        }
                    }
                }
                else {
                    for (const b in deviceEnabled) {
                        this.log.debug(`automatic brightness control for ${tabletName[b]} is switched off the manual control is now switched on`);
                        enabledBrightness[b] = false;
                    }
                }
                this.log.debug(`BrightnessControl initialization has been fully initialized`);
            }
            catch (error) {
                this.log.error(`BrightnessControl init funktion has a problem: ${error.message}, stack: ${error.stack}`);
            }

            // motion Detector ID
            try {

                this.log.debug(`motion detector ID is read from the config and subscribed to`);
                //read motion ID from Admin and subscribe
                const motion = this.config.motion;
                const motionSensor_enabled = JSON.parse(this.config.motionSensor_enabled)
                if (motionSensor_enabled) {
                    // @ts-ignore
                    if (!motion && motion.length !== 0 || motion !== [] && motion.length !== 0) {
                        for (const sensor in motion) {

                            this.log.debug(`Check if the sensor is activated`);
                            if (motion[sensor]['enabled']) {

                                this.log.debug(`Check whether the sensor has an ID entry`);
                                if (motion[sensor]['motionid'] !== '') {

                                    this.log.debug(`read out all Motion ID's on the config`);

                                    motionID[sensor] = motion[sensor]['motionid'];
                                    motionVal[sensor] = false
                                    this.log.debug(`subscribe all Motion ID's`);
                                    this.subscribeForeignStates(motion[sensor]['motionid']);

                                }
                                else {
                                    this.log.warn(`Attention there is no motion detector ID entered`);
                                }
                            }
                            else {
                                this.log.debug(`the motion detector with the id: ${motion[sensor]['motionid']} is deactivated !!`);
                            }
                        }
                        this.log.debug(`motion Detector ID initialization has been fully initialized`);
                    }
                    else {
                        this.log.warn(`Motion detector is not defined, please define at least one or switch off the motion detector control!`);
                    }
                }
            }
            catch (error) {
                this.log.error(`motionDetectorID funktion has a problem: ${error.message}, stack: ${error.stack}`);
            }

            // Screensaver init
            try {
                // read screensaverTimer and screenSaverSelect
                this.log.debug(`The screensaver config is now read out`);
                const screenSaverON = JSON.parse(this.config['screenSaverON']);
                const screenSaverObj = this.config['screenSaver'];
                const screenSaverDeletion = JSON.parse(this.config['screenSaverDeletion']);

                this.log.debug(`It is checked whether the screensaver control is switched on`);
                if (screenSaverON) {
                    this.log.debug(`Screensaver control is switched on`);

                    // @ts-ignore
                    if (!screenSaverObj && screenSaverObj.length !== 0 || screenSaverObj !== [] && screenSaverObj.length !== 0) {
                        for (const s in deviceEnabled) {
                            if (deviceEnabled[s]) {
                                if (screenSaverObj[s] !== undefined) {
                                    manuel_screenSaver[s] = false
                                    this.log.debug(`Screensaver time is now read out`);
                                    screenSaverTime[s] = JSON.parse(screenSaverObj[s]['minute']) * 60000;
                                    this.log.debug(`Screensaver time was successfully read out for ${tabletName[s]} ==> ${screenSaverTime[s]}`);

                                    screensaverOnURL[s] = `http://${ip[s]}:${port[s]}/?cmd=startScreensaver&password=${password[s]}`;
                                    screensaverOffURL[s] = `http://${ip[s]}:${port[s]}/?cmd=stopScreensaver&password=${password[s]}`;
                                    // manuel_screenSaver[s] = false;
                                    this.log.debug(`the screensaver mode is read from the config`);
                                    const screensaverMode = JSON.parse(screenSaverObj[s]['screensaverMode']);
                                    this.log.debug(`the screensaver mode was successfully read from the config`);

                                    this.log.debug(`Url for the screensaver is now requested for ${tabletName[s]} from the config`);
                                    const screenSaverUrl = screenSaverObj[s].url;
                                    this.log.debug(`Url for ${tabletName[s]} was successfully obtained from the config`);

                                    this.log.debug(`It is now checked whether the screensaver brightness synchronization is switched on for the ${tabletName[s]}`);
                                    enableScreenSaverBrightness[s] = screenSaverObj[s]['enabled'];
                                    this.log.debug(`For the ${tabletName[s]} the screensaver brightness synchronization switched on`);

                                    this.log.debug(`Check for ${tabletName[s]} whether the screensaver brightness synchronization has been correctly initialized`);
                                    if (enableScreenSaverBrightness[s] === undefined) {
                                        enableScreenSaverBrightness[s] = false;
                                        this.log.error(`[ATTENTION] the brightness synchronization for ${tabletName[s]} was not initialized, please check the box and save it.`);
                                    }
                                    else {
                                        enableScreenSaverBrightness[s] = screenSaverObj[s]['enabled'];
                                        this.log.debug(`the screensaver brightness synchronization for ${tabletName[s]} was correctly initialized`);
                                    }

                                    if (screensaverMode) {

                                        if (screenSaverUrl === '') {
                                            const playlistUrl = [];
                                            playlistUrl.push(`http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverPlaylist&value=&password=${password[s]}`);
                                            playlistUrl.push(`http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverWallpaperURL&value=fully://color black&password=${password[s]}`);

                                            this.log.debug(`The screensaver url for ${tabletName[s]} is not set the screensaver is set to a black image`);
                                            for (const playlistUrlKey in playlistUrl) {
                                                await axios.get(playlistUrl[playlistUrlKey])
                                                    .then(async result => {

                                                        this.log.debug(`${tabletName[s]} send status for playlistUrl = status Code: ${result.status} => status Message: ${result.statusText}`);

                                                    }).catch(async error => {

                                                        this.log.error(`${tabletName[s]} send status for playlistUrl has a problem => ${error.message}, stack: ${error.stack}`);

                                                    });
                                            }
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

                                            this.log.debug(`YouTube Screensaver Url => ${screenSaverUrl} is set for ${tabletName[s]}`);


                                            await axios.get(playlistUrl)
                                                .then(async result => {

                                                    this.log.debug(`${tabletName[s]} send status for playlistUrl = status Code: ${result.status} => status Message: ${result.statusText}`);

                                                }).catch(async error => {

                                                    this.log.error(`${tabletName[s]} send status for playlistUrl  could not be sent => ${error.message}, stack: ${error.stack}`);

                                                });
                                        }

                                    }
                                    else if (!screensaverMode) {
                                        if (screenSaverUrl === '') {
                                            const playlistUrl = [];
                                            playlistUrl.push(`http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverPlaylist&value=&password=${password[s]}`);
                                            playlistUrl.push(`http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverWallpaperURL&value=fully://color black&password=${password[s]}`);

                                            this.log.debug(`The screensaver url for ${tabletName[s]} is not set the screensaver is set to a black image`);
                                            for (const playlistUrlKey in playlistUrl) {
                                                await axios.get(playlistUrl[playlistUrlKey])
                                                    .then(async result => {

                                                        this.log.debug(`${tabletName[s]} send status for playlistUrl = status Code: ${result.status} => status Message: ${result.statusText}`);

                                                    }).catch(async error => {

                                                        this.log.error(`${tabletName[s]} send status for playlistUrl has a problem => ${error.message}, stack: ${error.stack}`);

                                                    });
                                            }
                                        }
                                        else {
                                            const playlistUrl = [];
                                            playlistUrl.push(`http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverPlaylist&value=&password=${password[s]}`);
                                            playlistUrl.push(`http://${ip[s]}:${port[s]}/?cmd=setStringSetting&key=screensaverWallpaperURL&value=${screenSaverUrl}&password=${password[s]}`);

                                            this.log.debug(`${tabletName[s]} screensaver is switched on for wallpaper the playlist is now deleted and WallpaperUrl is set`);
                                            this.log.debug(`Wallpaper Screensaver Url => ${screenSaverUrl} is set for ${tabletName[s]}`);
                                            for (const playlistUrlKey in playlistUrl) {
                                                await axios.get(playlistUrl[playlistUrlKey])
                                                    .then(async result => {

                                                        this.log.debug(`${tabletName[s]} send status for playlistUrl = status Code: ${result.status} => status Message: ${result.statusText}`);

                                                    }).catch(async error => {

                                                        this.log.error(`${tabletName[s]} send status for playlistUrl has a problem => ${error.message}, stack: ${error.stack}`);

                                                    });
                                            }
                                        }
                                    }
                                }
                                else {
                                    manuel_screenSaver[s] = true
                                    this.log.warn(`There is no screensaver config set for ${tabletName[s]}`);
                                    this.log.warn(`Please add a screensaver configuration or switch off the screensaver control.`);
                                }
                            }
                            else {
                                manuel_screenSaver[s] = true
                            }
                        }
                    }
                }
                else {
                    if (screenSaverDeletion) {
                        for (const deviceEnabledkey in deviceEnabled) {
                            const playlistUrl = []
                            if (deviceEnabled[deviceEnabledkey]) {
                                playlistUrl.push(`http://${ip[deviceEnabledkey]}:${port[deviceEnabledkey]}/?cmd=setStringSetting&key=timeToScreensaverV2&value=0&password=${password[deviceEnabledkey]}`)
                                playlistUrl.push(`http://${ip[deviceEnabledkey]}:${port[deviceEnabledkey]}/?cmd=setStringSetting&key=screensaverPlaylist&value=&password=${password[deviceEnabledkey]}`)
                                playlistUrl.push(`http://${ip[deviceEnabledkey]}:${port[deviceEnabledkey]}/?cmd=setStringSetting&key=screensaverWallpaperURL&value=fully://color black&password=${password[deviceEnabledkey]}`)
                            }
                            for (const playlistUrlKey in playlistUrl) {
                                await axios.get(playlistUrl[playlistUrlKey])
                                    .then(async result => {
                                        this.log.debug(`${tabletName[deviceEnabledkey]} send status for playlistUrl = status Code: ${result.status} => status Message: ${result.statusText}`);
                                    }).catch(async error => {
                                        this.log.error(`${tabletName[deviceEnabledkey]} send status for playlistUrl has a problem => ${error.message}, stack: ${error.stack}`);
                                    });
                            }
                        }
                    }
                }
                this.log.debug(`Screensaver initialization has been fully initialized`);
            }
            catch (error) {
                this.log.error(`Screensaver init funktion has a problem: ${error.message}, stack: ${error.stack}`);
            }

            // visView init
            try {
                this.log.debug(`Vis View control is now initialized`);
                const viewName = [];
                this.log.debug(`Check whether the visView control is switched on`);
                const view_enabled = JSON.parse(this.config['viewChange_enabled']);
                if (view_enabled) {
                    this.log.debug(`the visView control is switched on `);

                    this.log.debug(`visView config is now read out`);
                    const visView = this.config.visView;
                    this.log.debug(`the visView config was read out successfully`);

                    this.log.debug(`now visProjekt / viewName / view Number the homeView / wishView and the time are read out from the config and chamfered together`);
                    for (const view in visView) {

                        const visProjekt = visView[view]['visProjekt'];

                        viewName[view] = visView[view]['viewName'];

                        if (visView[view]['viewNumber'] !== '') {

                            viewNumber[view] = JSON.parse(visView[view]['viewNumber']);
                        }

                        const tempTime = visView[view].time;
                        homeView = `${visProjekt}/${viewName[0]}`;
                        wishView[view] = `${visProjekt}/${viewName[view]}`;
                        if (tempTime === '0' || tempTime === '00') {
                            time[view] = 0;
                        }
                        else {

                            time[view] = JSON.parse(visView[view].time);
                        }

                    }
                    this.log.debug(`the homeView was created successfully => ${homeView}`);
                    this.log.debug(`the wishView was created successfully => ${wishView}`);
                    this.log.debug(`the viewNumber was created successfully => ${viewNumber}`);
                    this.log.debug(`the viewTime was created successfully => ${time}`);

                }
                this.log.debug(`visView initialization has been fully initialized`);
            }
            catch (error) {
                this.log.error(`Screensaver init funktion has a problem: ${error.message}, stack: ${error.stack}`);
            }

            // AstroTime restart
            try {

                const astroTimeCron = new schedule(`0 2 * * * `, async () => {
                    await this.astroTime();
                });

                astroTimeCron.start();
                this.log.debug(`AstroTime restart is set to 2 o'clock in the morning`);

            }
            catch (error) {
                this.log.error(`AstroTime restart init funktion has a problem: ${error.message}, stack: ${error.stack}`);
            }
        }
        catch (error) {
            this.log.error(`[initialization] funktion : ${error.message}, stack: ${error.stack}`);
        }
    }

    async stateRequest() {
        try {

            if (requestTimeout) clearTimeout(requestTimeout);
            if (deviceInfo.length !== 0) {

                for (const i in deviceInfo) {
                    if (deviceEnabled[i]) {

                        this.log.debug(`device: ${tabletName[i]} enabled`);

                        const deviceID = await this.replaceFunction(tabletName[i]);

                        this.log.debug(`API request started ...`);

                        await axios.get(deviceInfo[i])
                            .then(async apiResult => {
                                if (apiResult['status'] === 200) {

                                    if (apiResult['data']['status'] !== 'Error') {
                                        this.log.debug(`API request ended successfully --> result from api Request: ${JSON.stringify(apiResult['data'])}`);

                                        this.log.debug(`State Create is now running ...`);
                                        await this.create_state(i);
                                        this.log.debug(`State Create was carried out`);

                                        this.log.debug(`check if battery level is> = 0 if yes then restart app`)

                                        this.log.debug(`States are now written`);
                                        await this.state_write(apiResult, i, deviceID);

                                        //set is Wallpanel Alive to true if the request was successful
                                        this.setState(`device.${deviceID}.isFullyAlive`, {val: true, ack: true});
                                        this.log.debug(`states were written`);

                                        // clear log message timer
                                        if (logMessageTimer[i]) clearTimeout(logMessageTimer[i]);
                                        this.log.debug(`logMessageTimer for ${tabletName[i]} will be deleted`);

                                        logMessage[i] = false;

                                        this.log.debug(`logMessage set to ${logMessage[i]} for ${tabletName[i]}`);

                                        // await this.charger();

                                    }
                                    else {
                                        this.log.error(`${apiResult['data']['statustext']}`);
                                    }
                                }

                            })
                            .catch(async error => {

                                if (!logMessage[i]) {

                                    logMessage[i] = true;
                                    this.log.debug(`logMessage set to ${logMessage[i]} for ${tabletName[i]}`);

                                    this.log.error(`[Request] ${tabletName[i]} Unable to contact: ${error} | ${error}`);
                                }
                                else if (!logMessageTimer[i]) {

                                    if (logMessageTimer[i]) clearTimeout(logMessageTimer[i]);
                                    this.log.debug(`logMessageTimer for ${tabletName[i]} will be deleted`);

                                    this.log.debug(`set logMessageTimer for ${tabletName[i]} to ${3600000 / 60000} min`);
                                    logMessageTimer[i] = setTimeout(async () => {

                                        logMessage[i] = false;
                                        this.log.debug(`logMessage set to ${logMessage[i]} for ${tabletName[i]}`);

                                    }, 3600000);
                                }

                                this.setState(`device.${deviceID}.isFullyAlive`, {val: false, ack: true});
                                this.log.debug(`set isFullyAlive to false for ${tabletName[i]}`);
                            });
                    }
                }
            }
            requestTimeout = setTimeout(async () => {

                this.log.debug(`start devices to query for new values`);
                await this.stateRequest();
            }, interval);
        }
        catch (error) {
            this.log.error(`Request function has a problem : ${error.message}, stack: ${error.stack}`);
        }
    }

    /**
     * Check on number.
     * @param {Object} apiResult
     * @param {string|number} index
     * @param {string} deviceID
     */
    async state_write(apiResult, index, deviceID) {
        try {

            this.log.debug(`prepare state write`);
            const objects = apiResult['data'];
            this.log.debug(`[result]: ${JSON.stringify(objects)}`);

            for (const obj in objects) {

                switch (obj) {
                    case 'isInScreensaver':

                        isInScreensaver[index] = objects['isInScreensaver'];
                        this.setState(`device.${deviceID}.device_info.isInScreensaver`, {val: isInScreensaver[index], ack: true});
                        this.log.debug(`IP state for ${deviceID} : ${isInScreensaver[index]}`);

                        if (!JSON.parse(this.config['motionSensor_enabled']) && !isInScreensaver[index] && !manuel_screenSaver[index]) {
                            const screenSaverObj = this.config.screenSaver;
                            // @ts-ignore
                            if (!screenSaverObj && screenSaverObj.length !== 0 || screenSaverObj !== [] && screenSaverObj.length !== 0) {
                                manuel_screenSaver[index] = true;
                                await this.screensaverManuel(index);
                            }
                        }
                        break;

                    case 'currentFragment':

                        const currentFragment = objects['currentFragment'];
                        this.setState(`device.${deviceID}.device_info.currentFragment`, {val: currentFragment, ack: true});
                        this.log.debug(`currentFragment state for ${deviceID} :  ${currentFragment}`);

                        break;

                    case 'topFragmentTag':
                        // new form App Version 1.40.3
                        const topFragmentTag = objects['topFragmentTag'];
                        this.setState(`device.${deviceID}.device_info.currentFragment`, {val: topFragmentTag, ack: true});
                        this.log.debug(`currentFragment state for ${deviceID} :  ${topFragmentTag}`);

                        break;

                    case 'deviceModel':

                        const deviceModel = objects['deviceModel'];
                        this.setState(`device.${deviceID}.device_info.deviceModel`, {val: deviceModel, ack: true});
                        this.log.debug(`deviceModel state for ${deviceID} :  ${deviceModel}`);

                        break;

                    case 'deviceName':

                        const deviceName = objects['deviceName'];
                        this.setState(`device.${deviceID}.device_info.deviceName`, {val: deviceName, ack: true});
                        this.log.debug(`deviceName state for ${deviceID} : ${deviceName}`);


                        break;

                    case 'wifiSignalLevel':

                        const wifiSignalLevel = objects['wifiSignalLevel'];
                        this.setState(`device.${deviceID}.device_info.wifiSignalLevel`, {val: wifiSignalLevel, ack: true});
                        this.log.debug(`wifiSignalLevel state for ${deviceID} : ${wifiSignalLevel}`);

                        break;

                    case 'kioskMode':

                        const kioskMode = objects['kioskMode'];
                        this.setState(`device.${deviceID}.device_info.kioskMode`, {val: kioskMode, ack: true});
                        this.log.debug(`kioskMode state for ${deviceID} : ${kioskMode}`);

                        break;

                    case 'displayHeightPixels':

                        const displayHeightPixels = objects['displayHeightPixels'];
                        this.setState(`device.${deviceID}.device_info.displayHeightPixels`, {val: displayHeightPixels, ack: true});
                        this.log.debug(`displayHeightPixels state for ${deviceID} : ${displayHeightPixels}`);

                        break;

                    case 'appVersionName':

                        const appVersionName = objects['appVersionName'];
                        this.setState(`device.${deviceID}.device_info.appVersionName`, {val: appVersionName, ack: true});
                        this.log.debug(`appVersionName state for ${deviceID} : ${appVersionName}`);

                        break;

                    case 'maintenanceMode':

                        const maintenanceMode = objects['maintenanceMode'];
                        this.setState(`device.${deviceID}.device_info.maintenanceMode`, {val: maintenanceMode, ack: true});
                        this.log.debug(`maintenanceMode state for ${deviceID} : ${maintenanceMode}`);


                        break;

                    case 'mac':

                        const mac = objects.mac;
                        this.setState(`device.${deviceID}.device_info.mac`, {val: mac, ack: true});
                        this.log.debug(`mac state for ${deviceID} : ${mac}`);

                        break;

                    case 'Mac':
                        // new form App Version 1.40.3
                        const Mac = objects[`Mac`];
                        this.setState(`device.${deviceID}.device_info.mac`, {val: Mac, ack: true});
                        this.log.debug(`mac state for ${deviceID} : ${Mac}`);

                        break;

                    case 'startUrl':

                        const startUrl = objects['startUrl'];
                        this.setState(`device.${deviceID}.device_info.startUrl`, {val: startUrl, ack: true});
                        this.log.debug(`startUrl state for ${deviceID} : ${startUrl}`);


                        break;

                    case 'currentPage':

                        const currentPage = objects['currentPage'];
                        this.setState(`device.${deviceID}.device_info.currentPage`, {val: currentPage, ack: true});
                        this.log.debug(`currentPage state for ${deviceID} : ${currentPage}`);


                        break;

                    case 'screenOrientation':

                        const screenOrientation = objects['screenOrientation'];
                        this.setState(`device.${deviceID}.device_info.screenOrientation`, {val: screenOrientation, ack: true});
                        this.log.debug(`screenOrientation state for ${deviceID} : ${screenOrientation}`);

                        break;

                    case 'isInDaydream':

                        const isInDaydream = objects['isInDaydream'];
                        this.setState(`device.${deviceID}.device_info.isInDaydream`, {val: isInDaydream, ack: true});
                        this.log.debug(`isInDaydream state for ${deviceID} : ${isInDaydream}`);


                        break;

                    case 'isLicensed':

                        const isLicensed = objects['isLicensed'];
                        this.setState(`device.${deviceID}.device_info.isLicensed`, {val: isLicensed, ack: true});
                        this.log.debug(`isLicensed state for ${deviceID} : ${isLicensed}`);

                        break;

                    case 'deviceManufacturer':

                        const deviceManufacturer = objects['deviceManufacturer'];
                        this.setState(`device.${deviceID}.device_info.deviceManufacturer`, {val: deviceManufacturer, ack: true});
                        this.log.debug(`deviceManufacturer state for ${deviceID} : ${deviceManufacturer}`);

                        break;

                    case 'keyguardLocked':

                        const keyguardLocked = objects['keyguardLocked'];
                        this.setState(`device.${deviceID}.device_info.keyguardLocked`, {val: keyguardLocked, ack: true});
                        this.log.debug(`keyguardLocked state for ${deviceID} : ${keyguardLocked}`);

                        break;

                    case 'isDeviceAdmin':

                        const isDeviceAdmin = objects['isDeviceAdmin'];
                        this.setState(`device.${deviceID}.device_info.isDeviceAdmin`, {val: isDeviceAdmin, ack: true});
                        this.log.debug(`isDeviceAdmin state for ${deviceID} : ${isDeviceAdmin}`);

                        break;

                    case 'kioskLocked':

                        const kioskLocked = objects['kioskLocked'];
                        this.setState(`device.${deviceID}.device_info.kioskLocked`, {val: kioskLocked, ack: true});
                        this.log.debug(`kioskLocked state for ${deviceID} : ${kioskLocked}`);

                        break;

                    case 'isDeviceOwner':

                        const isDeviceOwner = objects['isDeviceOwner'];
                        this.setState(`device.${deviceID}.device_info.isDeviceOwner`, {val: isDeviceOwner, ack: true});
                        this.log.debug(`isDeviceOwner state for ${deviceID} : ${isDeviceOwner}`);

                        break;

                    case 'ip6':

                        const ip6 = objects['ip6'];
                        this.setState(`device.${deviceID}.device_info.ip6`, {val: ip6, ack: true});
                        this.log.debug(`ip6 state for ${deviceID} : ${ip6}`);

                        break;

                    case 'displayWidthPixels':

                        const displayWidthPixels = objects['displayWidthPixels'];
                        this.setState(`device.${deviceID}.device_info.displayWidthPixels`, {val: displayWidthPixels, ack: true});
                        this.log.debug(`displayWidthPixels state for ${deviceID} : ${displayWidthPixels}`);

                        break;

                    case 'androidVersion':

                        const androidVersion = objects['androidVersion'];
                        this.setState(`device.${deviceID}.device_info.androidVersion`, {val: androidVersion, ack: true});
                        this.log.debug(`androidVersion state for ${deviceID} : ${androidVersion}`);

                        break;

                    case 'ip4': {

                        const ip4 = objects['ip4'];
                        this.setState(`device.${deviceID}.device_info.device_ip`, {val: ip4, ack: true});
                        this.log.debug(`ip4 state for ${deviceID} : ${ip4}`);

                        break;
                    }

                    case 'plugged':

                        const plugged = objects['plugged'];
                        this.setState(`device.${deviceID}.device_info.plugged`, {val: plugged, ack: true});
                        this.log.debug(`plugged state for ${deviceID} : ${plugged}`);

                        break;

                    case 'isPlugged':
                        // new form App Version 1.40.3
                        const isPlugged = objects['isPlugged'];
                        this.setState(`device.${deviceID}.device_info.plugged`, {val: isPlugged, ack: true});
                        this.log.debug(`plugged state for ${deviceID} : ${isPlugged}`);

                        break;

                    case 'batteryLevel': {

                        let bat = objects['batteryLevel'];
                        let plugged = objects['plugged'] ? objects['plugged'] : objects['isPlugged'];

                        this.setState(`device.${deviceID}.battery`, {val: bat, ack: true});
                        this.log.debug(`batteryLevel state for ${deviceID} : ${bat}`);


                        this.log.debug(`The battery level is now determined for ${deviceID} `);
                        let visBattery = null;

                        if (plugged && bat <= 100) visBattery = 20; 	// 100 %
                        if (!plugged && bat <= 100) visBattery = 19; // 100 %
                        if (plugged && bat <= 90) visBattery = 18; 	// 100 %
                        if (!plugged && bat <= 90) visBattery = 17; 	// 90 %
                        if (plugged && bat <= 80) visBattery = 16; 	// 90 %
                        if (!plugged && bat <= 80) visBattery = 15; 	// 80 %
                        if (plugged && bat <= 70) visBattery = 14; 	// 80 %
                        if (!plugged && bat <= 70) visBattery = 13; 	// 70 %
                        if (plugged && bat <= 60) visBattery = 12; 	// 70 %
                        if (!plugged && bat <= 60) visBattery = 11; 	// 60 %
                        if (plugged && bat <= 50) visBattery = 10; 	// 60 %
                        if (!plugged && bat <= 50) visBattery = 9; 	// 50 %
                        if (plugged && bat <= 40) visBattery = 8; 	// 50 %
                        if (!plugged && bat <= 40) visBattery = 7; 	// 40 %
                        if (plugged && bat <= 30) visBattery = 6; 	// 40 %
                        if (!plugged && bat <= 30) visBattery = 5; 	// 30 %
                        if (plugged && bat <= 20) visBattery = 4; 	// 30 %
                        if (!plugged && bat <= 20) visBattery = 3; 	// 20 %
                        if (plugged && bat <= 10) visBattery = 2; 	// 10 %
                        if (!plugged && bat <= 10) visBattery = 1; 	// 10 %
                        if (bat <= 0) visBattery = 0; 	// empty

                        this.log.debug(`Battery level has been determined is now written for ${deviceID} `);
                        this.setState(`device.${deviceID}.state_of_charge_vis`, {val: visBattery, ack: true});
                        this.log.debug(`visBattery state for ${deviceID} : bat: ${bat} visBat: ${visBattery}`);

                        this.log.debug(`Now start the charging control`);
                        await this.charger(index, bat);
                        break;
                    }

                    case 'isScreenOn':
                        const isScreenOn = objects['isScreenOn'];

                        this.setState(`device.${deviceID}.device_info.isScreenOn`, {val: isScreenOn, ack: true});
                        this.log.debug(`isScreenOn state for ${deviceID} : ${isScreenOn}`);

                        this.log.debug(`It is checked whether the screen is switched on at ${deviceID}`);
                        if (isScreenOn) this.log.debug(`The screen is switched on for the ${deviceID}`);
                        if (!isScreenOn) {
                            await this.screenOn(index);
                        }
                        break;

                    case 'screenOn':

                        // new form App Version 1.40.3
                        const screenOn = objects['screenOn'];

                        this.setState(`device.${deviceID}.device_info.isScreenOn`, {val: screenOn, ack: true});
                        this.log.debug(`isScreenOn state for ${deviceID} : ${screenOn}`);

                        this.log.debug(`It is checked whether the screen is switched on at ${deviceID}`);
                        if (screenOn) this.log.debug(`The screen is switched on for the ${deviceID}`);
                        if (!screenOn) {
                            await this.screenOn(index);
                        }
                        break;

                    case 'screenBrightness':

                        brightness[index] = objects['screenBrightness'];
                        this.setState(`device.${deviceID}.brightness`, {val: brightness[index], ack: true});
                        this.log.debug(`screenBrightness state for ${deviceID} : ${brightness[index]}`);

                        break;

                    case 'lastAppStart':

                        const lastAppStart = objects['lastAppStart'];
                        this.setState(`device.${deviceID}.device_info.LastAppStart`, {val: lastAppStart, ack: true});
                        this.log.debug(`lastAppStart state for ${deviceID} : ${lastAppStart}`);

                        break;

                    case 'ssid':

                        const ssid = objects['ssid'].replace(/"/gi, '');
                        this.log.debug(`ssid ROW state for ${deviceID} : ${ssid}`);

                        if (ssid === '<unknown ssid>') {
                            this.setState(`device.${deviceID}.device_info.ssid`, {val: 'is not supported', ack: true});
                            this.log.debug(`ssid state for ${deviceID} : ${ssid}`);
                        }
                        else if (ssid === '') {
                            this.setState(`device.${deviceID}.device_info.ssid`, {val: 'is not supported', ack: true});
                            this.log.debug(`ssid state for ${deviceID} : ${ssid}`);
                        }
                        else {
                            this.setState(`device.${deviceID}.device_info.ssid`, {val: ssid, ack: true});
                            this.log.debug(`ssid state for ${deviceID} : ${ssid}`);
                        }

                        break;

                    case 'SSID':
                        // new from App version 1.40.3
                        const SSID = objects['SSID'].replace(/"/gi, '');
                        this.log.debug(`SSID ROW state for ${deviceID} : ${SSID}`);

                        if (SSID === '<unknown ssid>') {
                            this.setState(`device.${deviceID}.device_info.ssid`, {val: 'is not supported', ack: true});
                            this.log.debug(`SSID state for ${deviceID} : ${SSID}`);
                        }
                        else if (SSID === '') {
                            this.setState(`device.${deviceID}.device_info.ssid`, {val: 'is not supported', ack: true});
                            this.log.debug(`SSID state for ${deviceID} : ${SSID}`);
                        }
                        else {
                            this.setState(`device.${deviceID}.device_info.ssid`, {val: SSID, ack: true});
                            this.log.debug(`SSID state for ${deviceID} : ${SSID}`);
                        }

                        break;

                    case 'foregroundApp':

                        foreground[index] = objects.foregroundApp;
                        this.setState(`device.${deviceID}.device_info.foregroundApp`, {val: foreground[index], ack: true});
                        this.log.debug(`foregroundApp state for ${deviceID} : ${foreground[index]}`);

                        this.log.debug(`It is checked whether the FullyBrowser is in the foreground at ${deviceID}`);
                        if (await foreground[index] !== 'de.ozerov.fully' && await foregroundStart[index] === false) {
                            foregroundStart[index] = true;

                            this.log.debug(`FullyBrowser is not in the foreground with ${deviceID}`);
                            await this.foregroundApp(index, foreground[index]);
                            this.log.debug(`${await tabletName[index]} foregroundStart true: ${foreground[index]}`);

                        }
                        else {
                            foregroundStart[index] = false;
                            this.log.debug(`${await tabletName[index]} foreground is Fully: ${foreground[index]}`);
                        }

                        break;

                    case 'internalStorageFreeSpace':

                        const internalStorageFreeSpace = objects['internalStorageFreeSpace'];
                        this.setState(`device.${deviceID}.device_info.memory.internalStorageFreeSpace`, {val: await this.bytesToSize(internalStorageFreeSpace), ack: true});
                        this.log.debug(`internalStorageFreeSpace state for ${deviceID} : ${internalStorageFreeSpace}`);

                        break;

                    case 'appTotalMemory':

                        const appTotalMemory = objects['appTotalMemory'];
                        this.setState(`device.${deviceID}.device_info.memory.appTotalMemory`, {val: await this.bytesToSize(appTotalMemory), ack: true});
                        this.log.debug(`appTotalMemory state for ${deviceID} : ${appTotalMemory}`);

                        break;

                    case 'ramFreeMemory':

                        const ramFreeMemory = objects['ramFreeMemory'];
                        this.setState(`device.${deviceID}.device_info.memory.ramFreeMemory`, {val: await this.bytesToSize(ramFreeMemory), ack: true});
                        this.log.debug(`ramFreeMemory state for ${deviceID} : ${ramFreeMemory}`);

                        break;

                    case 'appFreeMemory':

                        const appFreeMemory = objects['appFreeMemory'];
                        this.setState(`device.${deviceID}.device_info.memory.appFreeMemory`, {val: await this.bytesToSize(appFreeMemory), ack: true});
                        this.log.debug(`appFreeMemory state for ${deviceID} : ${appFreeMemory}`);

                        break;

                    case 'internalStorageTotalSpace':

                        const internalStorageTotalSpace = objects['internalStorageTotalSpace'];
                        this.setState(`device.${deviceID}.device_info.memory.internalStorageTotalSpace`, {val: await this.bytesToSize(internalStorageTotalSpace), ack: true});
                        this.log.debug(`internalStorageTotalSpace state for ${deviceID} : ${internalStorageTotalSpace}`);

                        break;

                    case 'ramUsedMemory':

                        const ramUsedMemory = objects['ramUsedMemory'];
                        this.setState(`device.${deviceID}.device_info.memory.ramUsedMemory`, {val: await this.bytesToSize(ramUsedMemory), ack: true});
                        this.log.debug(`ramUsedMemory state for ${deviceID} : ${ramUsedMemory}`);

                        break;

                    case 'appUsedMemory':

                        const appUsedMemory = objects['appUsedMemory'];
                        this.setState(`device.${deviceID}.device_info.memory.appUsedMemory`, {val: await this.bytesToSize(appUsedMemory), ack: true});
                        this.log.debug(`appUsedMemory state for ${deviceID} : ${appUsedMemory}`);

                        break;

                    case 'ramTotalMemory':

                        const ramTotalMemory = objects['ramTotalMemory'];
                        this.setState(`device.${deviceID}.device_info.memory.ramTotalMemory`, {val: await this.bytesToSize(ramTotalMemory), ack: true});
                        this.log.debug(`ramTotalMemory state for ${deviceID} : ${ramTotalMemory}`);

                        break;

                    case 'batteryTemperature':

                        const batteryTemperature = objects['batteryTemperature'];
                        this.setState(`device.${deviceID}.device_info.batteryTemperature`, {val: batteryTemperature, ack: true});
                        this.log.debug(`batteryTemperature state for ${deviceID} : ${batteryTemperature} `);
                        break;

                    case 'motionDetectorStatus':

                        /**
                         * Gets the MotionDetectorStatus from the objects and converts it from number to boolean
                         */
                        const motionDetectorStatusObj = objects['motionDetectorStatus'];
                        if (motionDetectorStatusObj !== undefined || motionDetectorStatusObj !== null) {

                            switch (motionDetectorStatusObj) {
                                case 0:
                                    motionDetectorStatus[deviceID] = false;
                                    // console.log(`motionDetectorStatus state for ${deviceID} : ${motionDetectorStatusObj} = ${motionDetectorStatus[deviceID]}`)
                                    this.log.debug(`motionDetectorStatus state for ${deviceID} : ${motionDetectorStatusObj} = ${motionDetectorStatus[deviceID]}`);
                                    break;

                                case 1:
                                    // console.log(`motionDetectorStatus state for ${deviceID} : ${motionDetectorStatusObj} = ${motionDetectorStatus[deviceID]}`)
                                    this.log.debug(`motionDetectorStatus state for ${deviceID} : ${motionDetectorStatusObj} `);
                                    break;

                                case 2:
                                    motionDetectorStatus[deviceID] = true;
                                    // console.log(`motionDetectorStatus state for ${deviceID} : ${motionDetectorStatusObj} = ${motionDetectorStatus[deviceID]}`)
                                    this.log.debug(`motionDetectorStatus state for ${deviceID} : ${motionDetectorStatusObj} = ${motionDetectorStatus[deviceID]}`);
                                    break;
                                default:
                                    break;
                            }
                        }
                }
            }

            // last Info Update
            this.setState(`device.${deviceID}.lastInfoUpdate`, {val: Date.now(), ack: true});
            this.log.debug(`lastInfoUpdate is now being updated for ${deviceID} : ${Date.now()}`);

        }
        catch (error) {

            this.log.error(`state_write for ${deviceID} has a problem: ${error.message}, stack: ${error.stack}`);
        }
    }

    /**
     * command Send
     * @param {string} id
     * @param {object} state
     * @param {string|number} index
     * @param {string} cmd
     */
    async sendFullyCommand(id, state, index, cmd) {
        try {

            switch (cmd) {
                case 'reloadAll':
                    let reloadAllURL = null;
                    reloadAllURL = `http://${ip[index]}:${port[index]}/?cmd=loadStartURL&password=${password[index]}`;
                    await axios.get(reloadAllURL)
                        .then(async result => {

                            this.log.debug(`${tabletName[index]} send status for reloadAll = status Code: ${result.status} => status Message: ${result.statusText}`);
                            console.log(`${tabletName[index]} send status for reloadAll = status Code: ${result.status} => status Message: ${result.statusText}`);
                        }).catch(async error => {

                            this.log.error(`${tabletName[index]} send status for reloadAll could not be sent => ${error.message}, stack: ${error.stack}`);
                            console.log(`${tabletName[index]} send status for reloadAll could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                        });
                    break;

                case 'setStringSetting':
                    const txtKey = state.val;
                    if (txtKey.length > 1) {

                        const setStringSetting = `http://${ip[index]}:${port[index]}/?cmd=setStringSetting&key=${txtKey}&password=${password[index]}`;

                        await axios.get(setStringSetting)
                            .then(async result => {
                                this.setState(id, {val: '', ack: true});
                                this.log.debug(`${tabletName[index]} send status for setStringSetting = status Code: ${result.status} => status Message: ${result.statusText}`);
                                console.log(`${tabletName[index]} send status for setStringSetting = status Code: ${result.status} => status Message: ${result.statusText}`);
                            }).catch(async error => {

                                this.log.error(`${tabletName[index]} send status for setStringSetting could not be sent => ${error.message}, stack: ${error.stack}`);
                                console.log(`${tabletName[index]} send status for setStringSetting could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                            });
                    }
                    break;

                case 'mediaVolumen':

                    const volume = state.val;

                    if (volume >= 0 && volume <= 100) {

                        const mediaVolumeURL = `http://${ip[index]}:${port[index]}/?cmd=setAudioVolume&level=${volume}&stream=3&password=${password[index]}`;

                        await axios.get(mediaVolumeURL)
                            .then(async result => {
                                this.setState(id, {val: state.val, ack: true});
                                this.log.debug(`${tabletName[index]} send status for mediaVolume = status Code: ${result.status} => status Message: ${result.statusText}`);
                                console.log(`${tabletName[index]} send status for mediaVolume = status Code: ${result.status} => status Message: ${result.statusText}`);
                            }).catch(async error => {

                                this.log.error(`${tabletName[index]} send status for mediaVolume could not be sent => ${error.message}, stack: ${error.stack}`);
                                console.log(`${tabletName[index]} send status for mediaVolumen could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                            });

                    }
                    break;

                case 'textToSpeech':

                    let txtSp = state.val;
                    txtSp = encodeURIComponent(txtSp.replace(/ +/g, ' ')); // Remove multiple spaces
                    if (txtSp.length > 1) {

                        const textToSpeechURL = `http://${ip[index]}:${port[index]}/?cmd=textToSpeech&text=${txtSp}&password=${password[index]}`;

                        await axios.get(textToSpeechURL)
                            .then(async result => {
                                this.setState(id, {val: '', ack: true});
                                this.log.debug(`${tabletName[index]} send status for textToSpeech = status Code: ${result.status} => status Message: ${result.statusText}`);
                                console.log(`${tabletName[index]} send status for textToSpeech = status Code: ${result.status} => status Message: ${result.statusText}`);
                            }).catch(async error => {

                                this.log.error(`${tabletName[index]} send status for textToSpeech could not be sent => ${error.message}, stack: ${error.stack}`);
                                console.log(`${tabletName[index]} send status for textToSpeech could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                            });

                    }
                    break;

                case 'startURL':

                    let startURL = state.val;
                    startURL = startURL.replace(/ /g, ''); // Remove Spaces

                    this.log.debug(`check if http is specified in the url if not replace the url with http://`);
                    let result = startURL.match('http');
                    if (!result) {
                        startURL = `https://${startURL}`;
                    }

                    const encodeStartURL = encodeURI(startURL);

                    if (startURL.length > 5) {

                        // const loadURL = `http://${ip[index]}:${port[index]}/?cmd=startURL&url=${encodeStartURL}&password=${password[index]}`;
                        const loadURL = `http://${ip[index]}:${port[index]}/?cmd=setStringSetting&key=startURL&value=${encodeStartURL}&password=${password[index]}`;
                        // /?cmd=setStringSetting&key=[key]&value=[value]
                        await axios.get(loadURL)
                            .then(async result => {
                                this.setState(id, {val: startURL, ack: true});
                                this.log.debug(`${tabletName[index]} send status for startURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                console.log(`${tabletName[index]} send status for startURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                            }).catch(async error => {

                                this.log.error(`${tabletName[index]} send status for startURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                console.log(`${tabletName[index]} send status for startURL could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                            });
                    }
                    break;

                case 'loadURL':

                    let strUrl = state.val;
                    strUrl = strUrl.replace(/ /g, ''); // Remove Spaces

                    const encodeUrl = encodeURI(strUrl); // alle URLs per encodeURI(URL) senden

                    if (strUrl.length > 5) {

                        const loadURL = `http://${ip[index]}:${port[index]}/?cmd=loadURL&url=${encodeUrl}&password=${password[index]}`;

                        await axios.get(loadURL)
                            .then(async result => {
                                this.setState(id, {val: '', ack: true});
                                this.log.debug(`${tabletName[index]} send status for loadURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                console.log(`${tabletName[index]} send status for loadURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                            }).catch(async error => {

                                this.log.error(`${tabletName[index]} send status for loadURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                console.log(`${tabletName[index]} send status for loadURL could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                            });
                    }
                    break;

                case 'startApplication':
                    // eslint-disable-next-line no-case-declarations
                    let strApp = state.val;
                    strApp = strApp.replace(/ /g, ''); // Remove Spaces

                    if (strApp.length > 2) {
                        const startApplicationURL = `http://${ip[index]}:${port[index]}/?cmd=startApplication&package=${strApp}&password=${password[index]}`;

                        await axios.get(startApplicationURL)
                            .then(async result => {
                                this.setState(id, {val: '', ack: true});
                                this.log.debug(`${tabletName[index]} send status for startApplication = status Code: ${result.status} => status Message: ${result.statusText}`);
                                console.log(`${tabletName[index]} send status for startApplication = status Code: ${result.status} => status Message: ${result.statusText}`);
                            }).catch(async error => {

                                this.log.error(`${tabletName[index]} send status for startApplication could not be sent => ${error.message}, stack: ${error.stack}`);
                                console.log(`${tabletName[index]} send status for startApplication could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                            });
                    }
                    break;

                case 'motionDetection':

                    let motionD = state.val;

                    const motionDetectionURL = `http://${ip[index]}:${port[index]}/?cmd=setBooleanSetting&key=motionDetection&value=${motionD}&password=${password[index]}`;

                    await axios.get(motionDetectionURL)
                        .then(async result => {

                            this.setState(id, {val: motionD, ack: true});
                            this.log.debug(`${tabletName[index]} send status for motionDetection = status Code: ${result.status} => status Message: ${result.statusText}`);
                            console.log(`${tabletName[index]} send status for motionDetection = status Code: ${result.status} => status Message: ${result.statusText}`);

                        }).catch(async error => {

                            this.log.error(`${tabletName[index]} send status for motionDetection could not be sent => ${error.message}, stack: ${error.stack}`);
                            console.log(`${tabletName[index]} send status for motionDetection could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                        });

                    break;

                case 'camshot':
                    try {
                        const auto_motionDetection = JSON.parse(this.config['auto_motionDetection']);
                        const record_mode = JSON.parse(this.config['record_mode']);
                        const single_shot = JSON.parse(this.config['single_shot']);
                        let series_shot = JSON.parse(this.config['series_shot']);
                        const series_shot_safe = JSON.parse(this.config['series_shot_safe']);
                        const deviceID = await this.replaceFunction(tabletName[index]);

                        /**
                         * check if series_shot is greater than series_shot_safe and if greater replace with series_shot_safe
                         */
                        if (series_shot > series_shot_safe) {
                            this.log.debug(`The number of series of images to be captured is greater than the number of images to be saved.`)
                            series_shot = series_shot_safe;
                            this.log.debug(`The number of series of image recording has been adjusted to the number of images to be saved.`)
                        }

                        /**
                         * create an obj to pass data to the function
                         */
                        shareObj = {
                            'index': index,
                            'mode': record_mode,
                            'single_shot_safe': single_shot,
                            'series_shot': series_shot,
                            'series_shot_safe': series_shot_safe,
                        }

                        /**
                         * check if the motion detection should be switched on automatically ( val: true / false )
                         */
                        if (auto_motionDetection) {

                            // query the value of motionDetection state
                            let motionDetection = await this.getStateAsync(`device.${tabletName[index]}.commands.motionDetection`);
                            // @ts-ignore
                            motionDetection = motionDetection.val;

                            // checks if motionDetectorStatus and motionDetection are both true
                            if (motionDetectorStatus[deviceID] && !motionDetection) {
                                // motionDetection is false! motionDetection state is updated to true
                                this.setState(`device.${tabletName[index]}.commands.motionDetection`, {val: true, ack: true});

                                if (captureTimeout[index]) clearTimeout(captureTimeout[index]);
                                await this.image_capture();
                            }
                            else if (!motionDetectorStatus[deviceID] && motionDetection) {
                                // motionDetectorStatus is false! motion Detection is enabled on the FullyBrowser.

                                const motionDetectionURL = `http://${ip[index]}:${port[index]}/?cmd=setBooleanSetting&key=motionDetection&value=${true}&password=${password[index]}`;
                                await axios.get(motionDetectionURL)
                                    .then(async result => {

                                        this.log.debug(`${tabletName[index]} send status for camshot = status Code: ${result.status} => status Message: ${result.statusText}`);
                                        // console.log(`${tabletName[index]} send status for camshot = status Code: ${result.status} => status Message: ${result.statusText}`);

                                    }).catch(async error => {

                                        this.log.error(`${tabletName[index]} send status for camshot could not be sent => ${error.message}, stack: ${error.stack}`);
                                        // console.log(`${tabletName[index]} send status for camshot could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                                    });

                                if (captureTimeout[index]) clearTimeout(captureTimeout[index]);
                                await this.image_capture();
                            }
                            else if (!motionDetectorStatus[deviceID] && !motionDetection) {
                                // motionDetectorStatus and motionDetection state are both false! Both are now set to true.

                                const motionDetectionURL = `http://${ip[index]}:${port[index]}/?cmd=setBooleanSetting&key=motionDetection&value=${true}&password=${password[index]}`;
                                await axios.get(motionDetectionURL)
                                    .then(async result => {
                                        this.setState(`device.${tabletName[index]}.commands.motionDetection`, {val: true, ack: true})
                                        this.log.debug(`${tabletName[index]} send status for camshot = status Code: ${result.status} => status Message: ${result.statusText}`);
                                        // console.log(`${tabletName[index]} send status for camshot = status Code: ${result.status} => status Message: ${result.statusText}`);
                                    }).catch(async error => {
                                        this.log.error(`${tabletName[index]} send status for camshot could not be sent => ${error.message}, stack: ${error.stack}`);
                                        // console.log(`${tabletName[index]} send status for camshot could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                                    });

                                if (captureTimeout[index]) clearTimeout(captureTimeout[index]);
                                await this.image_capture();
                            }
                            else if (motionDetectorStatus[deviceID] && motionDetection) {
                                // motionDetectorStatus and motionDetection state are both true. Recording function is executed.

                                if (captureTimeout[index]) clearTimeout(captureTimeout[index]);
                                await this.image_capture();
                            }
                        }
                        else {
                            let motionDetection = await this.getStateAsync(`device.${tabletName[index]}.commands.motionDetection`);
                            // @ts-ignore
                            motionDetection = motionDetection.val;

                            if (motionDetection) {
                                if (captureTimeout[index]) clearTimeout(captureTimeout[index]);
                                await this.image_capture();
                            }
                            else {
                                this.log.warn(`Attention the motion detection is not activated it is not possible to take camshot if motion detection is deactivated !!`)
                            }
                        }
                    }
                    catch (error) {
                        this.log.error(`camshot function for ${tabletName[index]} has a problem: ${error.message}, stack: ${error.stack}`);
                    }
                    break;

                case 'kioskPin_confirm':
                    // @ts-ignore
                    const pin = (await this.getStateAsync(`${this.namespace}.device.${tabletName[index]}.commands.kiosk.kioskPin`)).val;
                    const pinConfirm = state.val;
                    if (kioskPinTimeout[index]) clearTimeout(kioskPinTimeout[index]);
                    // @ts-ignore
                    if (!isNaN(pin) && !isNaN(pinConfirm)) {
                        // @ts-ignore
                        console.log(isNaN(pin))
                        console.log(isNaN(pinConfirm))
                        if (pinConfirm === pin) {

                            const kioskPinURL = `http://${ip[index]}:${port[index]}/?cmd=setStringSetting&key=kioskPin&value=${pin}&password=${password[index]}`;
                            await axios.get(kioskPinURL)
                                .then(async result => {

                                    this.setState(`${this.namespace}.device.${tabletName[index]}.commands.kiosk.kioskPin`, {val: 'OK', ack: true});
                                    this.setState(id, {val: 'OK', ack: true});

                                    kioskPinTimeout[index] = setTimeout(async () => {
                                        this.setState(`${this.namespace}.device.${tabletName[index]}.commands.kiosk.kioskPin`, {val: '', ack: true});
                                        this.setState(id, {val: '', ack: true});
                                    }, 2000)

                                    this.log.debug(`${tabletName[index]} send status for kioskPin = status Code: ${result.status} => status Message: ${result.statusText}`);
                                    console.log(`${tabletName[index]} send status for kioskPin = status Code: ${result.status} => status Message: ${result.statusText}`);

                                }).catch(async error => {

                                    this.log.error(`${tabletName[index]} send status for kioskPin could not be sent => ${error.message}, stack: ${error.stack}`);
                                    console.log(`${tabletName[index]} send status for kioskPin could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                                });
                        }
                        else {

                            this.log.warn(`pin input does not match try again`);
                            this.setState(id, {val: 'pin does not match try again', ack: true});
                        }
                    }
                    // @ts-ignore
                    else if (isNaN(pin)) {
                        this.setState(`${this.namespace}.device.${tabletName[index]}.commands.kiosk.kioskPin`, {val: 'Attention kiosk pin may only contain numbers (1234567890) do not contain any special characters or letters', ack: true});
                        this.log.warn(`Attention kiosk pin may only contain numbers (1234567890) do not contain any special characters or letters`);

                    }
                    else if (isNaN(pinConfirm)) {
                        this.setState(id, {val: 'Attention kiosk pin Confirm may only contain numbers (1234567890) do not contain any special characters or letters', ack: true});
                        this.log.warn(`Attention kiosk pin Confirm may only contain numbers (1234567890) do not contain any special characters or letters`);

                    }

                    break;

                case 'kioskExitGesture':
                    const kioskExitGesture = state.val;

                    const kioskExitGestureURL = `http://${ip[index]}:${port[index]}/?cmd=setStringSetting&key=kioskExitGesture&value=${kioskExitGesture}&password=${password[index]}`;
                    await axios.get(kioskExitGestureURL)
                        .then(async result => {

                            this.setState(id, {val: kioskExitGesture, ack: true});
                            this.log.debug(`${tabletName[index]} send status for kioskPin = status Code: ${result.status} => status Message: ${result.statusText}`);
                            console.log(`${tabletName[index]} send status for kioskPin = status Code: ${result.status} => status Message: ${result.statusText}`);

                        }).catch(async error => {

                            this.log.error(`${tabletName[index]} send status for kioskPin could not be sent => ${error.message}, stack: ${error.stack}`);
                            console.log(`${tabletName[index]} send status for kioskPin could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                        });

                    break;

                case 'disableStatusBar':
                    const disableStatusBar = state.val;

                    const disableStatusBarURL = `http://${ip[index]}:${port[index]}/?cmd=setBooleanSetting&key=disableStatusBar&value=${disableStatusBar}&password=${password[index]}`;
                    await axios.get(disableStatusBarURL)
                        .then(async result => {

                            this.setState(id, {val: disableStatusBar, ack: true});
                            this.log.debug(`${tabletName[index]} send status for disableStatusBar = status Code: ${result.status} => status Message: ${result.statusText}`);
                            console.log(`${tabletName[index]} send status for disableStatusBar = status Code: ${result.status} => status Message: ${result.statusText}`);

                        }).catch(async error => {

                            this.log.error(`${tabletName[index]} send status for disableStatusBar could not be sent => ${error.message}, stack: ${error.stack}`);
                            console.log(`${tabletName[index]} send status for disableStatusBar could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                        });

                    break;

                case 'disableHomeButton':
                    const disableHomeButton = state.val;

                    const disableHomeButtonURL = `http://${ip[index]}:${port[index]}/?cmd=setBooleanSetting&key=disableHomeButton&value=${disableHomeButton}&password=${password[index]}`;
                    await axios.get(disableHomeButtonURL)
                        .then(async result => {

                            this.setState(id, {val: disableHomeButton, ack: true});
                            this.log.debug(`${tabletName[index]} send status for disableHomeButton = status Code: ${result.status} => status Message: ${result.statusText}`);
                            console.log(`${tabletName[index]} send status for disableHomeButton = status Code: ${result.status} => status Message: ${result.statusText}`);

                        }).catch(async error => {

                            this.log.error(`${tabletName[index]} send status for disableHomeButton could not be sent => ${error.message}, stack: ${error.stack}`);
                            console.log(`${tabletName[index]} send status for disableHomeButton could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                        });

                    break;

                case 'disablePowerButton':
                    const disablePowerButton = state.val;

                    const disablePowerButtonURL = `http://${ip[index]}:${port[index]}/?cmd=setBooleanSetting&key=disablePowerButton&value=${disablePowerButton}&password=${password[index]}`;
                    await axios.get(disablePowerButtonURL)
                        .then(async result => {

                            this.setState(id, {val: disablePowerButton, ack: true});
                            this.log.debug(`${tabletName[index]} send status for disablePowerButton = status Code: ${result.status} => status Message: ${result.statusText}`);
                            console.log(`${tabletName[index]} send status for disablePowerButton = status Code: ${result.status} => status Message: ${result.statusText}`);

                        }).catch(async error => {

                            this.log.error(`${tabletName[index]} send status for disablePowerButton could not be sent => ${error.message}, stack: ${error.stack}`);
                            console.log(`${tabletName[index]} send status for disablePowerButton could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                        });

                    break;

                case 'disableVolumeButtons':
                    const disableVolumeButtons = state.val;

                    const disableVolumeButtonsURL = `http://${ip[index]}:${port[index]}/?cmd=setBooleanSetting&key=disableVolumeButtons&value=${disableVolumeButtons}&password=${password[index]}`;
                    await axios.get(disableVolumeButtonsURL)
                        .then(async result => {

                            this.setState(id, {val: disableVolumeButtons, ack: true});
                            this.log.debug(`${tabletName[index]} send status for disableVolumeButtons = status Code: ${result.status} => status Message: ${result.statusText}`);
                            console.log(`${tabletName[index]} send status for disableVolumeButtons = status Code: ${result.status} => status Message: ${result.statusText}`);

                        }).catch(async error => {

                            this.log.error(`${tabletName[index]} send status for disableVolumeButtons could not be sent => ${error.message}, stack: ${error.stack}`);
                            console.log(`${tabletName[index]} send status for disableVolumeButtons could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                        });

                    break;

                case 'kioskMode':
                    const setKioskMode = state.val;

                    const kioskModeURL = `http://${ip[index]}:${port[index]}/?cmd=setBooleanSetting&key=kioskMode&value=${setKioskMode}&password=${password[index]}`;
                    await axios.get(kioskModeURL)
                        .then(async result => {

                            this.setState(id, {val: setKioskMode, ack: true});
                            this.log.debug(`${tabletName[index]} send status for setKioskMode = status Code: ${result.status} => status Message: ${result.statusText}`);
                            console.log(`${tabletName[index]} send status for setKioskMode = status Code: ${result.status} => status Message: ${result.statusText}`);

                        }).catch(async error => {

                            this.log.error(`${tabletName[index]} send status for setKioskMode could not be sent => ${error.message}, stack: ${error.stack}`);
                            console.log(`${tabletName[index]} send status for setKioskMode could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                        });

                    break;

                case 'lockKiosk':
                    const lockKiosk = state.val;
                    let lockKioskURL;

                    if (lockKiosk) {
                        lockKioskURL = `http://${ip[index]}:${port[index]}/?cmd=lockKiosk&password=${password[index]}`;
                    }
                    else {
                        lockKioskURL = `http://${ip[index]}:${port[index]}/?cmd=unlockKiosk&password=${password[index]}`;
                    }

                    await axios.get(lockKioskURL)
                        .then(async result => {

                            this.setState(id, {val: lockKiosk, ack: true});
                            this.log.debug(`${tabletName[index]} send status for lockKiosk = status Code: ${result.status} => status Message: ${result.statusText}`);
                            console.log(`${tabletName[index]} send status for lockKiosk = status Code: ${result.status} => status Message: ${result.statusText}`);

                        }).catch(async error => {

                            this.log.error(`${tabletName[index]} send status for lockKiosk could not be sent => ${error.message}, stack: ${error.stack}`);
                            console.log(`${tabletName[index]} send status for lockKiosk could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                        });

                    break;

                default:
                    if (state.val === true) {

                        const commandsURL = `http://${ip[index]}:${port[index]}/?cmd=${cmd}&password=${password[index]}`;

                        await axios.get(commandsURL)
                            .then(async result => {

                                this.log.debug(`${tabletName[index]} send status for ${cmd} = status Code: ${result.status} => status Message: ${result.statusText}`);
                                console.log(`${tabletName[index]} send status for ${cmd} = status Code: ${result.status} => status Message: ${result.statusText}`);
                            }).catch(async error => {

                                this.log.error(`${tabletName[index]} send status for ${cmd} could not be sent => ${error.message}, stack: ${error.stack}`);
                                console.log(`${tabletName[index]} send status for ${cmd} could not be sent [ command: ${cmd} val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
                            });
                    }
                    break;
            }
        }
        catch (error) {
            this.log.error(`[sendFullyCommand] : ${error.message}, stack: ${error.stack}`);
        }
    }

    async image_capture() {
        // Check the capture mode if continuous mode is on Start loop until the number of images set has been taken.
        switch (shareObj.mode) {
            case true:
                captureTimeout[shareObj.index] = setTimeout(async () => {
                    if (loop[shareObj.index] !== (shareObj.series_shot)) {
                        await this.image_capture();
                        loop[shareObj.index] = loop[shareObj.index] + 1
                    }
                    else {
                        if (captureTimeout[shareObj.index]) clearTimeout(captureTimeout[shareObj.index]);
                        loop[shareObj.index] = 0;
                    }
                }, imageTimeout);
                break;
        }

        // Send the command to take a photo and retrieve it in base64
        const base64 = await axios
            .get(`http://${ip[shareObj.index]}:${port[shareObj.index]}/?cmd=getCamshot&password=${password[shareObj.index]}`, {
                responseType: 'arraybuffer'
            })
            .then(response => new Buffer(response.data, 'binary').toString('base64'))
            .catch(async error => {
                this.log.error(` send status for camshot could not be sent => ${error.message}, stack: ${error.stack}`);
                // console.log(` send status for camshot could not be sent val: ${state.val} ] => ${error.message}, stack: ${error.stack}`);
            });

        const htmlBase64 = `<img src="data:image/png;base64,${base64}" style="width: auto ;height: 100%;"  alt='no Image'/>`

        await this.setStateAsync(`device.${tabletName[shareObj.index]}.device_info.camshot64`, {val: htmlBase64, ack: true})
        // @ts-ignore
        let base64String = Buffer.from(base64, 'base64')

        this.writeFile(`fully-tablet-control.admin`, `media/camshot_${tabletName[shareObj.index]}_${imageNr[shareObj.index]}.png`, base64String, function (err) {
            // @ts-ignore
            if (err) this.log.error(err)

            switch (shareObj.mode) {
                case true:
                    // Check if ImageNr = series recording or maximum number of 20 images if true then reset imageNr to 1 and delete the imageObj otherwise increase imageNr by 1
                    if (imageNr[shareObj.index] === shareObj.series_shot_safe || imageNr[shareObj.index] === 30) {
                        imageNr[shareObj.index] = 1
                    }
                    else if (imageNr[shareObj.index] !== shareObj.series_shot_safe) {
                        imageNr[shareObj.index] = imageNr[shareObj.index] + 1
                    }
                    break;
                case false:
                    // Check if ImageNr = single recording or maximum number of 20 images if true then reset imageNr to 1 and delete the imageObj otherwise increase imageNr by 1
                    if (imageNr[shareObj.index] === shareObj.single_shot_safe || imageNr[shareObj.index] === 30) {
                        imageNr[shareObj.index] = 1
                    }
                    else {
                        imageNr[shareObj.index] = imageNr[shareObj.index] + 1
                    }
                    break;
            }
        });
        // write the path of the image into an obj and write it into a state
        imageObj[`Nr${imageNr[shareObj.index]}`] = `/fully-tablet-control.admin/media/camshot_${tabletName[shareObj.index]}_${imageNr[shareObj.index]}.png`;
        this.log.debug(`File created in: /fully-tablet-control.admin.media/camshot_${tabletName[shareObj.index]}_${imageNr[shareObj.index]}.png`)
        await this.setState(`device.${tabletName[shareObj.index]}.device_info.camshotUrl`, {val: JSON.stringify(imageObj), ack: true});
    }

    /**
     * Check whether the FullyBrowser is switched on
     * @param {string|number} index
     * @param {string} value
     */
    async foregroundApp(index, value) {
        try {

            this.log.debug(`Timer for toForeground at ${tabletName[index]} is now deleted`);
            if (foregroundAppTimer[index]) clearTimeout(foregroundAppTimer[index]);

            const foregroundAppUrl = `http://${ip[index]}:${port[index]}/?cmd=toForeground&password=${password[index]}`;
            this.log.debug(`URL is now built for ${tabletName[index]} ==> foregroundAppUrl: ${foregroundAppUrl}`);

            this.log.debug(`timer is set to ${fireTabletInterval} for ${tabletName[index]}`);
            foregroundAppTimer[index] = setTimeout(async () => {

                this.log.debug(`Axios request is executed for ${tabletName[index]} with the URL => ${foregroundAppUrl}`);
                await axios.get(foregroundAppUrl)
                    .then(async result => {

                        this.log.debug(`${tabletName[index]} send status for toForeground = status Code: ${result.status} => status Message: ${result.statusText}`);
                        console.log(`${tabletName[index]} send status for toForeground = status Code: ${result.status} => status Message: ${result.statusText}`);

                    }).catch(async error => {

                        this.log.error(`${tabletName[index]} send status for toForeground could not be sent => ${error.message}, stack: ${error.stack}`);
                        console.log(`${tabletName[index]} send status for reloadAll could not be sent [ val: ${value} ] => ${error.message}, stack: ${error.stack}`);

                    });
            }, fireTabletInterval);
        }
        catch (error) {
            this.log.error(`foregroundApp for ${tabletName[index]} has a problem: ${error.message}, stack: ${error.stack}`);
        }
    }

    async astroTime() {
        try {
            if (deviceInfo.length !== 0) {
                this.log.debug(`Astro time is now being initialized...`);

                this.log.debug(`Adapter now reads the ioBroker config for the latitude and longitude`);
                const config = await this.getForeignObjectAsync('system.config');

                timeMode = JSON.parse(this.config['timeMode']);
                let dayH;
                let dayM;
                let dayS;
                let nightH;
                let nightM;
                let nightS;

                // @ts-ignore
                const iobrokerLatitude = config.common.latitude;
                // @ts-ignore
                const iobrokerLongitude = config.common.longitude;

                if (iobrokerLatitude !== '' && iobrokerLongitude !== '') {

                    this.log.debug(`The latitude and longitude were read from the config. => latitude: ${iobrokerLatitude} | longitude: ${iobrokerLongitude}`);

                    const ts = SunCalc.getTimes(new Date, iobrokerLatitude, iobrokerLongitude);

                    const astroSelectDay = this.config['astroSelectDay'];
                    const astroSelectNight = this.config['astroSelectNight'];

                    dayH = await this.zeroPad(ts[astroSelectDay].getHours(), 2);
                    dayM = await this.zeroPad(ts[astroSelectDay].getMinutes(), 2);
                    dayS = await this.zeroPad(ts[astroSelectDay].getSeconds(), 2);

                    nightH = await this.zeroPad(ts[astroSelectNight].getHours(), 2);
                    nightM = await this.zeroPad(ts[astroSelectNight].getMinutes(), 2);
                    nightS = await this.zeroPad(ts[astroSelectNight].getSeconds(), 2);

                }
                else {
                    this.log.warn(`The coordinates are not stored in the admin. Astro time is not switched on. Manuel mode is now active`);
                    timeMode = false;

                }

                const dayTime = await this.zeroPad(this.config['dayTime'], 2);
                const midTime = await this.zeroPad(this.config['midTime'], 2);
                const nightTime = await this.zeroPad(this.config['nightTime'], 2);

                this.log.debug(`The time of day is now determined`);
                if (timeMode) {

                    this.log.debug(`The current time is now checked whether it is in the time range from ${dayH}:${dayM}:${dayS} to ${nightH}:${nightM}:${nightS}`);
                    let astro_Time = await this.time_range(`${dayH}:${dayM}:${dayS}`, ``, `${nightH}:${nightM}:${nightS}`);
                    // console.log(`${dayH}:${dayM}:${dayS}`)
                    this.log.debug(`Time of day is now set to day or night`);
                    day_Time = astro_Time;

                    if (day_Time === 1) this.log.debug(`It is Morning`);
                    if (day_Time === 3) this.log.debug(`It's night`);
                    if (day_Time === 1) console.log(`It is day: ${day_Time}`);
                    if (day_Time === 3) console.log(`It's night: ${day_Time}`);

                }
                else {
                    this.log.debug(`The current time is now checked whether it is in the time range from ${dayTime}:00:00 to ${midTime}:00:00 and ${nightTime}:00:00`);
                    let manuel_Time = await this.time_range(`${dayTime}:00:00`, `${midTime}:00:00`, `${nightTime}:00:00`);

                    this.log.debug(`Time of day is now set to day or night`);
                    day_Time = manuel_Time;

                    if (day_Time === 1) this.log.debug(`It is Morning`);
                    if (day_Time === 2) this.log.debug(`It is afternoon`);
                    if (day_Time === 3) this.log.debug(`It's night`);

                    if (day_Time === 1) console.log(`It is day: ${day_Time}`);
                    if (day_Time === 2) console.log(`It is afternoon: ${day_Time}`);
                    if (day_Time === 3) console.log(`It's night: ${day_Time}`);

                }

                this.log.debug(`Time initialization is complete. Now start the cron`);
                // @ts-ignore
                await this.brightnessCron(dayH, dayM, nightH, nightM);
            }
        }
        catch (error) {
            this.log.error(`[astroTime] : ${error.message}, stack: ${error.stack}`);
        }
    }

    /**
     * @param {string} dayH
     * @param {string} dayM
     * @param {string} nightH
     *  @param {string} nightM
     */
    async brightnessCron(dayH, dayM, nightH, nightM) {
        try {
            if (deviceInfo.length !== 0) {
                this.log.debug(`Cron job is now being initialized`);

                this.log.debug(`Check whether the brightness control is active`);
                if (brightnessControlEnabled) {
                    for (const c in deviceEnabled) {
                        if (enabledBrightness[c] && !logMessage[c]) {
                            if (timeMode) {
                                this.log.debug(`night cron: ${nightM} ${nightH} * * * `);

                                const astroNightBriCron = new schedule(`${nightM} ${nightH} * * * `, async () => {
                                    this.log.debug(`the night brightness is now activated`);
                                    console.log(`the night brightness is now activated`);

                                    this.log.debug(`Time of day is now set to day or night`);
                                    day_Time = 3;
                                    this.log.debug(`It's night`);

                                    this.log.debug(`night and day timeout are reset`);
                                    if (automatic_briTimeout) clearTimeout(automatic_briTimeout);
                                    await this.automatic_bri();
                                });

                                this.log.debug(`day cron: ${dayM} ${dayH} * * * `);

                                const astroDayBriCron = new schedule(`${dayM} ${dayH} * * * `, async () => {
                                    this.log.debug(`the day brightness is now activated`);
                                    console.log(`the day brightness is now activated`);

                                    this.log.debug(`Time of day is now set to day or night`);
                                    day_Time = 1;
                                    this.log.debug(`It is day`);

                                    this.log.debug(`night and day timeout are reset`);
                                    if (automatic_briTimeout) clearTimeout(automatic_briTimeout);
                                    await this.automatic_bri();
                                });

                                this.log.debug(`start cron jobs`);
                                astroNightBriCron.start();
                                astroDayBriCron.start();
                            }
                            else {
                                const dayTime = this.config['dayTime'];
                                const midTime = this.config['midTime'];
                                const nightTime = this.config['nightTime'];
                                this.log.debug('checkInterval ' + checkInterval);
                                this.log.debug('dayTime ' + dayTime);
                                this.log.debug('nightTime ' + nightTime);

                                this.log.debug(`day cron: [ 0 ${dayTime} * * *  ]`);
                                const dayBriCron = new schedule(`0 ${dayTime} * * * `, async () => {
                                    this.log.debug(`the day brightness is now activated`);
                                    console.log(`the day brightness is now activated`);

                                    this.log.debug(`Time of day is now set to day or night`);
                                    day_Time = 1;
                                    this.log.debug(`It is day`);

                                    this.log.debug(`night and day timeout are reset`);
                                    if (automatic_briTimeout) clearTimeout(automatic_briTimeout);
                                    await this.automatic_bri();
                                });

                                this.log.debug(`day cron: [ 0 ${midTime} * * *  ]`);
                                const midBriCron = new schedule(`0 ${midTime} * * * `, async () => {
                                    this.log.debug(`the day brightness is now activated`);
                                    console.log(`the day brightness is now activated`);

                                    this.log.debug(`Time of day is now set to day or night`);
                                    day_Time = 2;
                                    this.log.debug(`It is afternoon`);

                                    this.log.debug(`night and day timeout are reset`);
                                    if (automatic_briTimeout) clearTimeout(automatic_briTimeout);
                                    await this.automatic_bri();
                                });

                                this.log.debug(`night cron: [ 0 ${nightTime} * * * ]`);
                                const nightBriCron = new schedule(`0 ${nightTime} * * * `, async () => {
                                    this.log.debug(`the night brightness is now activated`);
                                    console.log(`the night brightness is now activated`);

                                    this.log.debug(`Time of day is now set to day or night`);
                                    day_Time = 3;
                                    this.log.debug(`It's night`);

                                    this.log.debug(`night and day timeout are reset`);
                                    if (automatic_briTimeout) clearTimeout(automatic_briTimeout);
                                    await this.automatic_bri();
                                });

                                this.log.debug(`start cron jobs`);
                                dayBriCron.start();
                                midBriCron.start();
                                nightBriCron.start();
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            this.log.error(`[brightnessCron] : ${error.message}, stack: ${error.stack}`);
        }
    }

    /**
     * @param {string} id
     * @param {string|number} index
     * @param {object} state
     */
    async manualStates(id, index, state) {
        try {

            let value = state.val;
            this.log.debug(`Check whether value is in boolean or number`);
            let typ = typeof (value);
            let controlMode = await this.getStateAsync(`device.${tabletName[index]}.brightness_control_mode`);
            // @ts-ignore
            controlMode = controlMode['val'];

            switch (typ) {
                case 'boolean': {
                    let stateValue = await this.getStateAsync(`device.${tabletName[index]}.manualBrightness`);
                    // @ts-ignore
                    stateValue = stateValue.val;
                    controlMode = value;
                    if (day_Time === 1 || day_Time === 2) {
                        if (controlMode) {
                            this.log.debug(`night and day timeout are reset`);
                            if (automatic_briTimeout) clearTimeout(automatic_briTimeout);

                            this.log.debug(`start manuel brightness function`);
                            // @ts-ignore
                            await this.manuel_Bri(index, stateValue, controlMode);
                        }
                        else {
                            this.log.debug(`night and day timeout are reset`);
                            if (automatic_briTimeout) clearTimeout(automatic_briTimeout);

                            this.log.debug(`start day brightness function`);
                            await this.automatic_bri();
                        }
                    }
                    else {
                        if (controlMode) {
                            this.log.debug(`night and day timeout are reset`);
                            if (automatic_briTimeout) clearTimeout(automatic_briTimeout);

                            this.log.debug(`start manuel brightness function`);
                            // @ts-ignore
                            await this.manuel_Bri(index, stateValue, controlMode);
                        }
                        else {
                            this.log.debug(`night and day timeout are reset`);
                            if (automatic_briTimeout) clearTimeout(automatic_briTimeout);

                            this.log.debug(`start night brightness function`);
                            await this.automatic_bri();
                        }
                    }
                    await this.setStateAsync(id, value.val, true);
                    this.log.debug(`Manuel mode now active`);
                    break;
                }

                case 'number': {
                    if (controlMode) {
                        this.log.debug(`Check whether value is less than 0 or greater than 100`);
                        if (value <= 0) {
                            this.log.debug(`value ist kleiner 0 => ${value} wird jetzt ersetzt mir 0`);
                            value = 0;
                        }
                        else if (state.val >= 100) {
                            this.log.debug(`value is greater than 100 => ${value} is now replaced with 100`);
                            value = 100;
                        }

                        this.log.debug(`night and day timeout are reset`);
                        if (automatic_briTimeout) clearTimeout(automatic_briTimeout);
                        this.log.debug(`start manuel brightness function`);
                        // @ts-ignore
                        await this.manuel_Bri(index, value, controlMode);

                        await this.setStateAsync(id, value, true);
                        this.log.debug(`brightness was set to => ${value}`);
                    }
                    break;
                }
            }
        }
        catch (error) {
            this.log.error(`[manualStates] : ${error.message}, stack: ${error.stack}`);
        }
    }

    /**
     * @param {string|number} index
     * @param {number} value
     * @param {boolean} mode
     */
    async manuel_Bri(index, value, mode) {
        try {
            this.log.debug(`Manual brightness for ${tabletName[index]} is now carried out. Initialization operated .....`);
            this.log.debug(`start reading the configuration of ${tabletName[index]} ...`);
            const brightnessN = this.config.brightness;
            const screenSaverON = JSON.parse(this.config['screenSaverON']);
            const screenSaverBriSync = enableScreenSaverBrightness[index];

            this.log.debug(`Check whether the ${tabletName[index]} device is charging`);
            if (chargeDeviceValue[index]) {

                this.log.debug(`The ${tabletName[index]} device is charging, now carry out other actions ..`);
                this.log.debug(`Charging brightness for ${tabletName[index]} is now calculated....`);
                let chargingBri = Math.round(await this.convert_percent(value - brightnessN[index]['loadingLowering']));
                this.log.debug(`Charging brightness for ${tabletName[index]} has been calculated => ${chargingBri} and in percent => ${value - brightnessN[index]['loadingLowering']} `);
                if (chargingBri <= 0) {
                    this.log.debug(`The brightness for ${tabletName[index]} is less than 0 => ${chargingBri} is now replaced with 0`);
                    chargingBri = 0;
                    console.log(`return brightness => ${chargingBri}`)
                }
                this.log.debug(`Create the url for the screen brightness and the screen saver brightness....`);
                const BrightnessURL = `http://${ip[index]}:${port[index]}/?cmd=setStringSetting&key=screenBrightness&value=${chargingBri}&password=${password[index]}`;
                const ScreensaverOnBri = `http://${ip[index]}:${port[index]}/?cmd=setStringSetting&key=screensaverBrightness&value=${chargingBri}&password=${password[index]}`;

                this.log.debug(`Check whether the screen saver and the brightness synchronization is switched on`);
                if (screenSaverBriSync && screenSaverON) {

                    this.log.debug(`Check whether the current brightness is the same as the one you want to adjust`);
                    if (chargingBri !== brightness[index]) {

                        this.log.debug(`send the screen saver brightness to the device =>${tabletName[index]}`);
                        await axios.get(ScreensaverOnBri)
                            .then(async result => {
                                this.log.debug(`${tabletName[index]} send status for ScreensaverOnBri = status Code: ${result.status} => status Message: ${result.statusText}`);
                                console.log(`${tabletName[index]} send status for ScreensaverOnBri = status Code: ${result.status} => status Message: ${result.statusText}`);
                            })
                            .catch(async error => {
                                this.log.error(`${tabletName[index]} send status for ScreensaverOnBri name could not be sent => ${error.message}, stack: ${error.stack}`);
                                console.log(`${tabletName[index]} send status for ScreensaverOnBri name could not be sent val: ${value} ] => ${error.message}, stack: ${error.stack}`);
                            });

                        this.log.debug(`send the screen brightness to the device =>${tabletName[index]}`);
                        await axios.get(BrightnessURL)
                            .then(async result => {
                                this.log.debug(`${tabletName[index]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                console.log(`${tabletName[index]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);

                            })
                            .catch(async error => {
                                this.log.error(`${tabletName[index]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                console.log(`${tabletName[index]} send status for BrightnessURL could not be sent val: ${value} ] => ${error.message}, stack: ${error.stack}`);
                            });

                        this.log.debug(`Start the stateRequest in 300 ms to get the current values of the ${tabletName[index]} device`);
                        if (BriRequestTimeout) clearTimeout(BriRequestTimeout);
                        BriRequestTimeout = setTimeout(async () => {
                            this.log.debug(`start devices to query for new values`);
                            await this.stateRequest();
                        }, 300);
                    }
                }
                else if (!isInScreensaver[index]) {

                    this.log.debug(`send the screen brightness to the device =>${tabletName[index]}`);
                    await axios.get(BrightnessURL)
                        .then(async result => {
                            this.log.debug(`${tabletName[index]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                            console.log(`${tabletName[index]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                        })
                        .catch(async error => {
                            this.log.error(`${tabletName[index]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                            console.log(`${tabletName[index]} send status for BrightnessURL could not be sent val: ${value} ] => ${error.message}, stack: ${error.stack}`);
                        });

                    this.log.debug(`Start the stateRequest in 300 ms to get the current values of the ${tabletName[index]} device`);
                    if (BriRequestTimeout) clearTimeout(BriRequestTimeout);
                    BriRequestTimeout = setTimeout(async () => {
                        this.log.debug(`start devices to query for new values`);
                        await this.stateRequest();
                    }, 300);
                }
            }
            else {
                this.log.debug(`The ${tabletName[index]} device is not charging ..`);

                this.log.debug(`now calculate the brightness for ${tabletName[index]} from the percentages ....`);
                const brightnessValue = Math.round(await this.convert_percent(value));
                this.log.debug(`The brightness for ${tabletName[index]} has now been calculated => ${brightnessValue} and in percent => ${value}`);

                this.log.debug(`Create the url for the screen brightness and the screen saver brightness....`);
                const BrightnessURL = `http://${ip[index]}:${port[index]}/?cmd=setStringSetting&key=screenBrightness&value=${brightnessValue}&password=${password[index]}`;
                const ScreensaverOnBri = `http://${ip[index]}:${port[index]}/?cmd=setStringSetting&key=screensaverBrightness&value=${brightnessValue}&password=${password[index]}`;

                this.log.debug(`Check whether the screen saver and the brightness synchronization is switched on`);
                if (screenSaverBriSync && screenSaverON) {

                    this.log.debug(`Check whether the current brightness is the same as the one you want to adjust`);
                    if (brightnessValue !== brightness[index]) {

                        this.log.debug(`send the screen saver brightness to the device =>${tabletName[index]}`);
                        await axios.get(ScreensaverOnBri)
                            .then(async result => {
                                this.log.debug(`${tabletName[index]} send status for ScreensaverOnBri = status Code: ${result.status} => status Message: ${result.statusText}`);
                                console.log(`${tabletName[index]} send status for ScreensaverOnBri = status Code: ${result.status} => status Message: ${result.statusText}`);
                            })
                            .catch(async error => {
                                this.log.error(`${tabletName[index]} send status for ScreensaverOnBri name could not be sent => ${error.message}, stack: ${error.stack}`);
                                console.log(`${tabletName[index]} send status for ScreensaverOnBri name could not be sent val: ${value} ] => ${error.message}, stack: ${error.stack}`);
                            });

                        this.log.debug(`send the screen brightness to the device =>${tabletName[index]}`);
                        await axios.get(BrightnessURL)
                            .then(async result => {
                                this.log.debug(`${tabletName[index]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                console.log(`${tabletName[index]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                            })
                            .catch(async error => {
                                this.log.error(`${tabletName[index]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                console.log(`${tabletName[index]} send status for BrightnessURL could not be sent val: ${value} ] => ${error.message}, stack: ${error.stack}`);
                            });

                        this.log.debug(`Start the stateRequest in 300 ms to get the current values of the ${tabletName[index]} device`);
                        if (BriRequestTimeout) clearTimeout(BriRequestTimeout);
                        BriRequestTimeout = setTimeout(async () => {
                            this.log.debug(`start devices to query for new values`);
                            await this.stateRequest();
                        }, 300);
                    }
                }
                else {
                    this.log.debug(`send the screen brightness to the device => ${tabletName[index]}`);
                    await axios.get(BrightnessURL)
                        .then(async result => {
                            this.log.debug(`${tabletName[index]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                            console.log(`${tabletName[index]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);

                        })
                        .catch(async error => {
                            this.log.error(`${tabletName[index]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                            console.log(`${tabletName[index]} send status for BrightnessURL could not be sent val: ${value} ] => ${error.message}, stack: ${error.stack}`);
                        });

                    this.log.debug(`Start the stateRequest in 300 ms to get the current values of the ${tabletName[index]} device`);
                    if (BriRequestTimeout) clearTimeout(BriRequestTimeout);
                    BriRequestTimeout = setTimeout(async () => {
                        this.log.debug(`start devices to query for new values`);
                        await this.stateRequest();
                    }, 300);
                }
            }
        }
        catch (error) {
            this.log.error(`[manuel_Bri] : ${error.message}, stack: ${error.stack}`);
        }
    }

    async automatic_bri() {

        if (deviceInfo.length !== 0) {
            if (automatic_briTimeout) clearTimeout(automatic_briTimeout);
            if (day_Time === 1) {
                try {
                    const brightnessD = this.config.brightness;
                    const screenSaverON = JSON.parse(this.config['screenSaverON']);
                    // @ts-ignore
                    if (!brightnessD && brightnessD.length !== 0 || brightnessD !== [] && brightnessD.length !== 0) {
                        for (const d in deviceEnabled) {
                            if (deviceEnabled[d] && !logMessage[d]) {
                                if (enabledBrightness[d]) {
                                    this.log.debug(`automatic brightness control for ${tabletName[d]} is switched on the manual control is now switched off`);
                                    await this.setStateAsync(`device.${tabletName[d]}.brightness_control_mode`, false, true);

                                    if (brightnessD[d]) {
                                        let newBrightnessD = 0;
                                        if (chargeDeviceValue[d]) {
                                            newBrightnessD = Math.round(await this.convert_percent(brightnessD[d]['dayBrightness'] - brightnessD[d]['loadingLowering']));
                                            if (newBrightnessD <= 0) {
                                                newBrightnessD = 0;
                                                this.log.debug(`brightness from ${tabletName[d]} is less than 0 brightness is set to`);
                                            }
                                        }
                                        else {
                                            newBrightnessD = Math.round(await this.convert_percent(brightnessD[d]['dayBrightness']));
                                            this.log.debug(`${tabletName[d]} brightness set on: ${newBrightnessD}[${brightnessD[d]['dayBrightness']}%]`);
                                        }

                                        const BrightnessURL = `http://${ip[d]}:${port[d]}/?cmd=setStringSetting&key=screenBrightness&value=${newBrightnessD}&password=${password[d]}`;
                                        const ScreensaverOnBri = `http://${ip[d]}:${port[d]}/?cmd=setStringSetting&key=screensaverBrightness&value=${newBrightnessD}&password=${password[d]}`;

                                        this.log.debug(`Check whether the screen saver and the brightness synchronization is switched on`);
                                        if (enableScreenSaverBrightness[d] && screenSaverON) {

                                            this.log.debug(`Check whether the current brightness is the same as the one you want to adjust`);
                                            if (newBrightnessD !== brightness[d]) {

                                                this.log.debug(`send the screen saver brightness to the device =>${tabletName[d]}`);
                                                await axios.get(ScreensaverOnBri)
                                                    .then(async result => {
                                                        this.log.debug(`${tabletName[d]} send status for ScreensaverOnBri = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                        console.log(`${tabletName[d]} send status for ScreensaverOnBri = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                    })
                                                    .catch(async error => {
                                                        this.log.error(`${tabletName[d]} send status for ScreensaverOnBri name could not be sent => ${error.message}, stack: ${error.stack}`);
                                                        console.log(`${tabletName[d]} send status for ScreensaverOnBri name could not be sent => ${error.message}, stack: ${error.stack}`);
                                                    });

                                                this.log.debug(`send the screen brightness to the device =>${tabletName[d]}`);
                                                await axios.get(BrightnessURL)
                                                    .then(async result => {
                                                        this.log.debug(`${tabletName[d]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                        console.log(`${tabletName[d]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                    })
                                                    .catch(async error => {
                                                        this.log.error(`${tabletName[d]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                                        console.log(`${tabletName[d]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                                    });

                                                this.log.debug(`Start the stateRequest in 300 ms to get the current values of the ${tabletName[d]} device`);
                                                if (BriRequestTimeout) clearTimeout(BriRequestTimeout);
                                                BriRequestTimeout = setTimeout(async () => {
                                                    await this.stateRequest();
                                                }, 300);
                                            }
                                        }
                                        else if (!isInScreensaver[d]) {
                                            this.log.debug(`Check whether the current brightness is the same as the one you want to adjust`);
                                            if (newBrightnessD !== brightness[d]) {
                                                this.log.debug(`send the screen brightness to the device =>${tabletName[d]}`);
                                                await axios.get(BrightnessURL)
                                                    .then(async result => {
                                                        this.log.debug(`${tabletName[d]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                        console.log(`${tabletName[d]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                    })
                                                    .catch(async error => {
                                                        this.log.error(`${tabletName[d]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                                        console.log(`${tabletName[d]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                                    });

                                                this.log.debug(`Start the stateRequest in 300 ms to get the current values of the ${tabletName[d]} device`);
                                                if (BriRequestTimeout) clearTimeout(BriRequestTimeout);
                                                BriRequestTimeout = setTimeout(async () => {
                                                    this.log.debug(`start devices to query for new values`);
                                                    await this.stateRequest();
                                                }, 300);
                                            }
                                        }
                                    }
                                    else {
                                        this.log.warn(`${tabletName[d]} morningtime brightness not specified`);
                                    }
                                }
                                else {
                                    this.log.debug(`Automatic brightness has been deactivated for ${tabletName[d]} and is now switched to manual control`);
                                    await this.setStateAsync(`device.${tabletName[d]}.brightness_control_mode`, true, true);
                                }
                            }
                        }
                    }
                    else {
                        for (const d in deviceEnabled) {
                            if (!enabledBrightness[d]) {
                                this.log.warn(`Automatic brightness for ${tabletName[d]} is activated but no configuration is entered, the manual mode is activated.`);
                                await this.setStateAsync(`device.${tabletName[d]}.brightness_control_mode`, true, true);
                            }
                        }
                    }
                }
                catch (error) {
                    this.log.error(`[dayBri] : ${error.message}, stack: ${error.stack}`);
                }
            }
            else if (day_Time === 2) {
                try {
                    const brightnessD = this.config.brightness;
                    const screenSaverON = JSON.parse(this.config['screenSaverON']);
                    // @ts-ignore
                    if (!brightnessD && brightnessD.length !== 0 || brightnessD !== [] && brightnessD.length !== 0) {
                        for (const d in deviceEnabled) {
                            if (deviceEnabled[d] && !logMessage[d]) {
                                if (enabledBrightness[d]) {
                                    this.log.debug(`automatic brightness control for ${tabletName[d]} is switched on the manual control is now switched off`);
                                    await this.setStateAsync(`device.${tabletName[d]}.brightness_control_mode`, false, true);

                                    if (brightnessD[d]) {
                                        let newBrightnessM = 0;
                                        if (chargeDeviceValue[d]) {
                                            newBrightnessM = Math.round(await this.convert_percent(brightnessD[d]['midTimeBrightness'] - brightnessD[d]['loadingLowering']));
                                            if (newBrightnessM <= 0) {
                                                newBrightnessM = 0;
                                                this.log.debug(`brightness from ${tabletName[d]} is less than 0 brightness is set to`);
                                            }
                                        }
                                        else {
                                            newBrightnessM = Math.round(await this.convert_percent(brightnessD[d]['midTimeBrightness']));
                                            this.log.debug(`${tabletName[d]} brightness set on: ${newBrightnessM}[${brightnessD[d]['midTimeBrightness']}%]`);
                                        }

                                        const BrightnessURL = `http://${ip[d]}:${port[d]}/?cmd=setStringSetting&key=screenBrightness&value=${newBrightnessM}&password=${password[d]}`;
                                        const ScreensaverOnBri = `http://${ip[d]}:${port[d]}/?cmd=setStringSetting&key=screensaverBrightness&value=${newBrightnessM}&password=${password[d]}`;

                                        this.log.debug(`Check whether the screen saver and the brightness synchronization is switched on`);
                                        if (enableScreenSaverBrightness[d] && screenSaverON) {

                                            this.log.debug(`Check whether the current brightness is the same as the one you want to adjust`);
                                            if (newBrightnessM !== brightness[d]) {

                                                this.log.debug(`send the screen saver brightness to the device =>${tabletName[d]}`);
                                                await axios.get(ScreensaverOnBri)
                                                    .then(async result => {
                                                        this.log.debug(`${tabletName[d]} send status for ScreensaverOnBri = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                        console.log(`${tabletName[d]} send status for ScreensaverOnBri = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                    })
                                                    .catch(async error => {
                                                        this.log.error(`${tabletName[d]} send status for ScreensaverOnBri name could not be sent => ${error.message}, stack: ${error.stack}`);
                                                        console.log(`${tabletName[d]} send status for ScreensaverOnBri name could not be sent => ${error.message}, stack: ${error.stack}`);
                                                    });

                                                this.log.debug(`send the screen brightness to the device =>${tabletName[d]}`);
                                                await axios.get(BrightnessURL)
                                                    .then(async result => {
                                                        this.log.debug(`${tabletName[d]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                        console.log(`${tabletName[d]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                    })
                                                    .catch(async error => {
                                                        this.log.error(`${tabletName[d]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                                        console.log(`${tabletName[d]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                                    });

                                                this.log.debug(`Start the stateRequest in 300 ms to get the current values of the ${tabletName[d]} device`);
                                                if (BriRequestTimeout) clearTimeout(BriRequestTimeout);
                                                BriRequestTimeout = setTimeout(async () => {
                                                    this.log.debug(`start devices to query for new values`);
                                                    await this.stateRequest();
                                                }, 300);
                                            }
                                        }
                                        else if (!isInScreensaver[d]) {
                                            this.log.debug(`Check whether the current brightness is the same as the one you want to adjust`);
                                            if (newBrightnessM !== brightness[d]) {

                                                this.log.debug(`send the screen brightness to the device =>${tabletName[d]}`);
                                                await axios.get(BrightnessURL)
                                                    .then(async result => {
                                                        this.log.debug(`${tabletName[d]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                        console.log(`${tabletName[d]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                    })
                                                    .catch(async error => {
                                                        this.log.error(`${tabletName[d]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                                        console.log(`${tabletName[d]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                                    });

                                                this.log.debug(`Start the stateRequest in 300 ms to get the current values of the ${tabletName[d]} device`);
                                                if (BriRequestTimeout) clearTimeout(BriRequestTimeout);
                                                BriRequestTimeout = setTimeout(async () => {
                                                    this.log.debug(`start devices to query for new values`);
                                                    await this.stateRequest();
                                                }, 300);
                                            }
                                        }
                                    }
                                    else {
                                        this.log.warn(`${tabletName[d]} midTime brightness not specified`);
                                    }
                                }
                                else {
                                    this.log.debug(`Automatic brightness has been deactivated for ${tabletName[d]} and is now switched to manual control`);
                                    await this.setStateAsync(`device.${tabletName[d]}.brightness_control_mode`, true, true);
                                }
                            }
                        }
                    }
                    else {
                        for (const d in deviceEnabled) {
                            if (!enabledBrightness[d]) {
                                this.log.warn(`Automatic brightness for ${tabletName[d]} is activated but no configuration is entered, the manual mode is activated.`);
                                await this.setStateAsync(`device.${tabletName[d]}.brightness_control_mode`, true, true);
                            }
                        }
                    }
                }
                catch (error) {
                    this.log.error(`[dayBri] : ${error.message}, stack: ${error.stack}`);
                }
            }
            else {
                try {
                    const brightnessN = this.config.brightness;
                    const screenSaverON = JSON.parse(this.config['screenSaverON']);
                    // @ts-ignore
                    if (!brightnessN && brightnessN.length !== 0 || brightnessN !== [] && brightnessN.length !== 0) {
                        for (const d in deviceEnabled) {
                            if (deviceEnabled[d] && !logMessage[d]) {
                                if (enabledBrightness[d]) {
                                    this.log.debug(`automatic brightness control for ${tabletName[d]} is switched on the manual control is now switched off`);
                                    await this.setStateAsync(`device.${tabletName[d]}.brightness_control_mode`, false, true);

                                    if (brightnessN[d]) {
                                        let newBrightnessN = 0;
                                        if (chargeDeviceValue[d]) {
                                            newBrightnessN = Math.round(await this.convert_percent(brightnessN[d]['nightBrightness'] - brightnessN[d]['loadingLowering']));
                                            if (newBrightnessN <= 0) {
                                                newBrightnessN = 0;
                                                this.log.debug(`brightness from ${tabletName[d]} is less than 0 brightness is set to`);
                                            }
                                        }
                                        else {
                                            newBrightnessN = Math.round(await this.convert_percent(brightnessN[d]['nightBrightness']));
                                            this.log.debug(`${tabletName[d]} brightness set on: ${newBrightnessN}[${brightnessN[d]['nightBrightness']}%]`);
                                        }

                                        const BrightnessURL = `http://${ip[d]}:${port[d]}/?cmd=setStringSetting&key=screenBrightness&value=${newBrightnessN}&password=${password[d]}`;
                                        const ScreensaverOnBri = `http://${ip[d]}:${port[d]}/?cmd=setStringSetting&key=screensaverBrightness&value=${newBrightnessN}&password=${password[d]}`;

                                        this.log.debug(`Check whether the screen saver and the brightness synchronization is switched on`);
                                        if (enableScreenSaverBrightness[d] && screenSaverON) {

                                            this.log.debug(`Check whether the current brightness is the same as the one you want to adjust`);
                                            if (newBrightnessN !== brightness[d]) {

                                                this.log.debug(`send the screen saver brightness to the device =>${tabletName[d]}`);
                                                await axios.get(ScreensaverOnBri)
                                                    .then(async result => {
                                                        this.log.debug(`${tabletName[d]} send status for ScreensaverOnBri = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                        console.log(`${tabletName[d]} send status for ScreensaverOnBri = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                    })
                                                    .catch(async error => {
                                                        this.log.error(`${tabletName[d]} send status for ScreensaverOnBri name could not be sent => ${error.message}, stack: ${error.stack}`);
                                                        console.log(`${tabletName[d]} send status for ScreensaverOnBri name could not be sent => ${error.message}, stack: ${error.stack}`);
                                                    });

                                                this.log.debug(`send the screen brightness to the device =>${tabletName[d]}`);
                                                await axios.get(BrightnessURL)
                                                    .then(async result => {
                                                        this.log.debug(`${tabletName[d]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                        console.log(`${tabletName[d]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                    })
                                                    .catch(async error => {
                                                        this.log.error(`${tabletName[d]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                                        console.log(`${tabletName[d]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                                    });

                                                this.log.debug(`Start the stateRequest in 300 ms to get the current values of the ${tabletName[d]} device`);
                                                if (BriRequestTimeout) clearTimeout(BriRequestTimeout);
                                                BriRequestTimeout = setTimeout(async () => {
                                                    this.log.debug(`start devices to query for new values`);
                                                    await this.stateRequest();
                                                }, 300);
                                            }
                                        }
                                        else if (!isInScreensaver[d]) {
                                            this.log.debug(`Check whether the current brightness is the same as the one you want to adjust`);
                                            if (newBrightnessN !== brightness[d]) {
                                                this.log.debug(`send the screen brightness to the device =>${tabletName[d]}`);
                                                await axios.get(BrightnessURL)
                                                    .then(async result => {
                                                        this.log.debug(`${tabletName[d]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                        console.log(`${tabletName[d]} send status for BrightnessURL = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                    })
                                                    .catch(async error => {
                                                        this.log.error(`${tabletName[d]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                                        console.log(`${tabletName[d]} send status for BrightnessURL could not be sent => ${error.message}, stack: ${error.stack}`);
                                                    });

                                                this.log.debug(`Start the stateRequest in 300 ms to get the current values of the ${tabletName[d]} device`);
                                                if (BriRequestTimeout) clearTimeout(BriRequestTimeout);
                                                BriRequestTimeout = setTimeout(async () => {
                                                    this.log.debug(`start devices to query for new values`);
                                                    await this.stateRequest();
                                                }, 300);
                                            }
                                        }
                                    }
                                    else {
                                        this.log.warn(`${tabletName[d]} Night brightness not specified`);
                                    }
                                }
                                else {
                                    this.log.debug(`Automatic brightness has been deactivated for ${tabletName[d]} and is now switched to manual control`);
                                    await this.setStateAsync(`device.${tabletName[d]}.brightness_control_mode`, true, true);
                                }
                            }
                        }
                    }
                    else {
                        for (const d in deviceEnabled) {
                            if (!enabledBrightness[d]) {
                                this.log.warn(`Automatic brightness for ${tabletName[d]} is activated but no configuration is entered, the manual mode is activated.`);
                                await this.setStateAsync(`device.${tabletName[d]}.brightness_control_mode`, true, true);
                            }
                        }
                    }
                }
                catch (error) {
                    this.log.error(`[nightBri] : ${error.message}, stack: ${error.stack}`);
                }
            }
            automatic_briTimeout = setTimeout(async () => {
                this.log.debug(`automatic_bri function is restarted`);
                await this.automatic_bri();
            }, checkInterval);
        }
    }

    /**
     * automatically turns the screen back on if it was turned off.
     * @param {string|number} index
     */
    async screenOn(index) {
        try {

            const screen_on = JSON.parse(this.config['screen_on']);
            const Screen = `http://${ip[index]}:${port[index]}/?cmd=screenOn&password=${password[index]}`;
            if (screen_on) {
                this.log.warn(`Attention the screen on ${tabletName[index]} has been switched off, an attempt is made to switch it on again`);
                await axios.get(Screen)
                    .then(async result => {
                        this.log.debug(`${tabletName[index]} send status for screenOn = status Code: ${result.status} => status Message: ${result.statusText}`);
                        console.log(`${tabletName[index]} send status for screenOn = status Code: ${result.status} => status Message: ${result.statusText}`);

                    }).catch(async error => {
                        this.log.error(`${tabletName[index]} send status for screenOn could not be sent => ${error.message}, stack: ${error.stack}`);
                        console.log(`${tabletName[index]} send status for screenOn could not be sent => ${error.message}, stack: ${error.stack}`);
                    });
            }
        }
        catch (error) {
            this.log.error(`screenOn for ${tabletName[index]} has a problem: ${error.message}, stack: ${error.stack}`);
        }
    }

    /**
     *
     * @param {string|number} index
     * @param {object} state
     */
    async motionSensor(index, state) {
        try {

            const motion = this.config.motion;
            const motionSensor_enabled = JSON.parse(this.config['motionSensor_enabled']);
            this.log.debug(`read motion obj val: ${motion}`);
            this.log.debug(`read motionSensor_enabled val: ${motionSensor_enabled}`);

            if (motionSensor_enabled) {
                // @ts-ignore
                if (!motion && motion.length !== 0 || motion !== [] && motion.length !== 0) {

                    this.log.debug(`Check if the sensor is activated`);
                    if (motion[index]['enabled']) {

                        this.log.debug(`Check whether the sensor has an ID entry`);
                        if (motion[index]['motionid'] !== '') {

                            this.log.debug(`check whether a sensor or several are entered`);
                            if (motionID.length >= 2) {
                                motionVal[index] = state;
                                console.log('test')
                            }
                            else {
                                for (const i in ip) {
                                    motionVal[i] = state;
                                    console.log('test')
                                }
                            }
                        }
                        else {
                            this.log.warn(`Attention there is no motion detector ID entered`);
                        }
                    }
                    else {
                        this.log.debug(`the motion detector with the id: ${motion[index]['motionid']} is deactivated !!`);
                    }
                    this.log.debug(`start screensaver function`);
                    await this.screenSaver();
                }
            }
            else {
                this.log.debug(`Deactivate motion sensors `);
            }
        }
        catch (error) {
            this.log.error(`[motionSensor] : ${error.message}, stack: ${error.stack}`);
        }
    }

    async screenSaver() {
        try {

            const motionSensor_enabled = JSON.parse(this.config['motionSensor_enabled']);
            const screenSaverOn = JSON.parse(this.config['screenSaverON']);

            this.log.debug(`Check whether the screen saver control is activated`);
            if (screenSaverOn) {

                // @ts-ignore
                if (!tabletName && tabletName.length !== 0 || tabletName !== [] && tabletName.length !== 0) {

                    for (const on in ip) {

                        this.log.debug(`clear all screensaverTimer `);
                        if (screensaverTimer[on]) clearTimeout(screensaverTimer[on]);

                        this.log.debug(`check if the ${tabletName[on]} is active`);
                        if (deviceEnabled[on] && !logMessage[on]) {

                            this.log.debug(`Check whether the motion detector control is active`);
                            if (motionSensor_enabled) {
                                this.log.debug(`Motion Sensor is On`);

                                if (!motionVal[on]) {

                                    this.log.debug(`Check whether the screen saver is switched on on the ${tabletName[on]}`);
                                    if (!isInScreensaver[on]) {
                                        this.log.debug(`build url for ${tabletName[on]}`);

                                        this.log.debug(`${tabletName[on]} Screensaver starts in ${screenSaverTime[on]} ms ==> ${screenSaverTime[on] / 60000}`);

                                        screensaverTimer[on] = setTimeout(async () => {

                                            if (ScreensaverReturn) clearTimeout(ScreensaverReturn);

                                            await axios.get(screensaverOnURL[on])
                                                .then(async result => {
                                                    this.log.debug(`${tabletName[on]} send status for ScreensaverOn = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                    console.log(`${tabletName[on]} send status for ScreensaverOn = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                })
                                                .catch(async error => {
                                                    if (!logMessage[on]) this.log.error(`${tabletName[on]} send status for ScreensaverOn could not be sent => ${error.message}, stack: ${error.stack}`);
                                                });

                                            this.log.debug(`Start the stateRequest in 300 ms to get the current values of the ${tabletName[on]} device`);
                                            ScreensaverReturn = setTimeout(async () => {
                                                await this.stateRequest();
                                            }, 300);

                                        }, screenSaverTime[on]);
                                    }
                                    else if (isInScreensaver[on]) {
                                        this.log.debug(`The screen saver for ${tabletName[on]} is switched on.`);
                                    }
                                }
                                else {
                                    this.log.debug(`Movement was detected the screen saver is switched off for ${tabletName[on]}`);

                                    this.log.debug(`build url for ${tabletName[on]}`);

                                    this.log.debug(`Check whether the ${tabletName[on]} screen saver is already switched off`);
                                    if (!isInScreensaver[on]) {
                                        this.log.debug(`${tabletName[on]} screensaver is already off`);
                                    }
                                    else if (isInScreensaver[on]) {

                                        await axios.get(screensaverOffURL[on])
                                            .then(async result => {
                                                this.log.debug(`${tabletName[on]} send status for ScreensaverOff = status Code: ${result.status} => status Message: ${result.statusText}`);
                                                console.log(`${tabletName[on]} send status for ScreensaverOff = status Code: ${result.status} => status Message: ${result.statusText}`);
                                            })
                                            .catch(async error => {
                                                if (!logMessage[on]) this.log.error(`${tabletName[on]} send status for ScreensaverOff could not be sent => ${error.message}, stack: ${error.stack}`);
                                            });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            else {
                this.log.debug(`Screen saver control is switched off`);
            }
        }
        catch (error) {
            this.log.error(`[screenSaver] : ${error.message}, stack: ${error.stack}`);
        }
    }

    /**
     * screenSaver Time-based switch on and manual switch off
     * @param {string|number} index
     */
    async screensaverManuel(index) {

        const screenSaverOn = JSON.parse(this.config['screenSaverON']);

        if (screenSaverOn) {

            this.log.debug(`clear all screensaverTimer `);
            if (screensaverTimer[index] && isInScreensaver[index]) clearTimeout(screensaverTimer[index]);

            this.log.debug(`Motion detector is switched off Time-based switch on and manual switch off is now active`);

            this.log.debug(`build url for ${tabletName[index]}`);

            this.log.debug(`Check whether the screen saver is switched on on the ${tabletName[index]}`);

            this.log.debug(`${tabletName[index]} Screensaver starts in ${screenSaverTime[index]} ms ==> ${screenSaverTime[index] / 60000}`);

            screensaverTimer[index] = setTimeout(async () => {
                if (ScreensaverReturn) clearTimeout(ScreensaverReturn);
                if (!isInScreensaver[index]) {
                    await axios.get(screensaverOnURL[index])
                        .then(async result => {
                            this.log.debug(`${tabletName[index]} send status for ScreensaverOn = status Code: ${result.status} => status Message: ${result.statusText}`);
                            console.log(`${tabletName[index]} send status for ScreensaverOn = status Code: ${result.status} => status Message: ${result.statusText}`);
                        })
                        .catch(async error => {
                            if (!logMessage[index]) this.log.error(`${tabletName[index]} send status for ScreensaverOn could not be sent => ${error.message}, stack: ${error.stack}`);
                        });
                }
                manuel_screenSaver[index] = false;
            }, screenSaverTime[index]);
        }
    }

    /**
     *
     * @param {string|number} index
     * @param {number} bat
     */
    async charger(index, bat) {
        try {
            this.log.debug(`Load charge control config`);
            const charger = this.config.charger;
            const telegram_enabled = JSON.parse(this.config['telegram_enabled']);
            let chargeDevice

            this.log.debug(`Check whether the charge control is activated`);
            if (JSON.parse(this.config['chargerON'])) {
                this.log.debug(`Charge control is activated`);

                // @ts-ignore
                if (!charger && charger.length !== 0 || charger !== [] && charger.length !== 0) {
                    if (charger[index]) {

                        const chargerid = charger[index]['chargerid'];
                        const power_mode = charger[index].power_mode;
                        const loadStart = JSON.parse(charger[index]['loadStart']);
                        const loadStop = JSON.parse(charger[index]['loadStop']);

                        // state Object from chargerid
                        if (chargerid) {

                            this.log.debug(`load object data from ${chargerid}`);
                            chargeDevice = await this.getForeignStateAsync(chargerid);

                            if (chargeDevice !== null && chargeDevice !== undefined) {

                                switch (typeof (chargeDevice.val)) {
                                    case 'number':
                                        if (chargeDevice.val === 0) {
                                            chargeDeviceValue[index] = false;
                                        }
                                        else if (chargeDevice.val === 1) {
                                            chargeDeviceValue[index] = true;
                                        }
                                        break;

                                    case 'boolean':
                                        chargeDeviceValue[index] = chargeDevice.val;
                                        break;
                                }
                            }
                            else {
                                chargeDeviceValue[index] = false;
                            }
                            this.log.debug(`chargerid: ` + chargerid + ` val: ` + chargeDeviceValue[index]);
                        }
                        else {
                            if (power_mode !== 'off') {
                                this.log.warn(`${tabletName[index]} Charger ID not specified`);
                            }
                        }

                        this.log.debug(`Check which mode is switched on`);
                        if (chargeDevice !== null && chargeDevice !== undefined) {
                            if (power_mode === 'true') {
                                this.log.debug(`Charging cycle is switched on`);

                                if (chargerid) {

                                    messageCharging[index] = false;
                                    this.log.debug(`Check whether the battery level is lower than the set start limit`);
                                    if (bat <= loadStart && !chargeDeviceValue[index]) {

                                        switch (typeof (chargeDevice.val)) {
                                            case 'number':

                                                this.log.debug(`Battery is at the start of charging limit start charging`);
                                                await this.setForeignStateAsync(chargerid, 1, false);
                                                this.log.info(`${tabletName[index]} charging started`);
                                                break;

                                            case 'boolean':

                                                this.log.debug(`Battery is at the start of charging limit start charging`);
                                                await this.setForeignStateAsync(chargerid, true, false);
                                                this.log.info(`${tabletName[index]} charging started`);
                                                break;
                                        }
                                    }
                                    else if (bat >= loadStop && chargeDeviceValue[index]) {
                                        switch (typeof (chargeDevice.val)) {
                                            case 'number':

                                                this.log.debug(`Battery level has reached the set charging stop, stop charging`);
                                                messageSend[index] = false;
                                                await this.setForeignStateAsync(chargerid, 0, false);
                                                this.log.info(`${tabletName[index]} Charging cycle ended`);
                                                break;

                                            case 'boolean':

                                                this.log.debug(`Battery level has reached the set charging stop, stop charging`);
                                                messageSend[index] = false;
                                                await this.setForeignStateAsync(chargerid, false, false);
                                                this.log.info(`${tabletName[index]} Charging cycle ended`);
                                                break;
                                        }
                                    }
                                }
                                else {
                                    this.log.warn(`${tabletName[index]} Charger ID for Charging cycle not specified`);
                                }
                            }
                            else if (power_mode === 'false') {
                                this.log.debug(`Continuous current mode is activated`);

                                if (chargerid) {

                                    switch (typeof (chargeDevice.val)) {
                                        case 'number':

                                            messageCharging[index] = false;
                                            if (!chargeDeviceValue[index]) this.log.debug(`The adapter now switches on the socket`);
                                            if (!chargeDeviceValue[index]) await this.setForeignStateAsync(chargerid, 1, false);
                                            if (!chargeDeviceValue[index]) this.log.debug(`${tabletName[index]} Continuous current`);
                                            break;

                                        case 'boolean':

                                            messageCharging[index] = false;
                                            if (!chargeDeviceValue[index]) this.log.debug(`The adapter now switches on the socket`);
                                            if (!chargeDeviceValue[index]) await this.setForeignStateAsync(chargerid, true, false);
                                            if (!chargeDeviceValue[index]) this.log.debug(`${tabletName[index]} Continuous current`);
                                            break;
                                    }
                                }
                                else {
                                    this.log.warn(`${tabletName[index]} Charger ID for Continuous current not specified`);
                                }
                            }
                            else if (power_mode === 'off') {
                                if (!messageCharging[index]) {
                                    this.log.info(`${tabletName[index]} Charging Off`);
                                    messageCharging[index] = true;
                                }
                            }
                        }

                        if (power_mode !== 'off') {
                            if (chargeDevice !== null && chargeDevice !== undefined) {

                                if (telegram_enabled === true) {

                                    if (bat <= 18 && !chargeDeviceValue[index] && !telegramStatus[index] || bat <= 18 && chargeDeviceValue[index] && !telegramStatus[index]) {

                                        switch (typeof (chargeDevice.val)) {
                                            case 'number':

                                                telegramStatus[index] = true;
                                                this.sendTo('telegram.0', 'send', {
                                                    text: this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${tabletName[index]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!`,
                                                    user: User
                                                });
                                                this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + `  ${tabletName[index]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!`);
                                                await this.setForeignStateAsync(chargerid, 1, false);
                                                this.setState(`device.${tabletName[index]}.charging_warning`, {val: true, ack: true});

                                                break;

                                            case 'boolean':

                                                telegramStatus[index] = true;

                                                this.sendTo('telegram.0', 'send', {
                                                    text: this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${tabletName[index]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!`,
                                                    user: User
                                                });
                                                this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + `  ${tabletName[index]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!`);
                                                await this.setForeignStateAsync(chargerid, true, false);
                                                this.setState(`device.${tabletName[index]}.charging_warning`, {val: true, ack: true});
                                                break;
                                        }
                                    }
                                    else if (bat > 18 && chargeDeviceValue[index] && telegramStatus[index]) {
                                        telegramStatus[index] = false;
                                        this.sendTo('telegram.0', 'send', {
                                            text: this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${tabletName[index]} Tablet is charging the problem has been fixed.`,
                                            user: User
                                        });
                                        this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${tabletName[index]} Tablet is charging the problem has been fixed.`);
                                        this.setState(`device.${tabletName[index]}.charging_warning`, {val: false, ack: true});
                                    }
                                }
                                else {
                                    if (bat >= 20 && !messageSend[index]) {
                                        messageSend[index] = false;
                                    }
                                    if (bat <= 18 && !chargeDeviceValue[index] && !AlertMessageSend[index] || bat <= 18 && chargeDeviceValue[index] && !AlertMessageSend[index]) {

                                        switch (typeof (chargeDevice.val)) {
                                            case 'number':

                                                AlertMessageSend[index] = true;
                                                messageSend[index] = false;
                                                this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${tabletName[index]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!`);
                                                await this.setForeignStateAsync(chargerid, 1, false);
                                                this.setState(`device.${tabletName[index]}.charging_warning`, {val: true, ack: true});
                                                break;

                                            case 'boolean':

                                                AlertMessageSend[index] = true;
                                                messageSend[index] = false;
                                                this.log.warn(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${tabletName[index]} Tablet charging function has detected a malfunction, the tablet is not charging, please check it !!!`);
                                                await this.setForeignStateAsync(chargerid, true, false);
                                                this.setState(`device.${tabletName[index]}.charging_warning`, {val: true, ack: true});
                                                break;
                                        }
                                    }
                                    else if (bat > 18 && bat < 20 && chargeDeviceValue[index] && !messageSend[index]) {

                                        messageSend[index] = true;
                                        AlertMessageSend[index] = false;
                                        this.log.info(this.formatDate(new Date(), 'TT.MM.JJ SS:mm') + ` ${tabletName[index]} Tablet is charging the problem has been fixed.`);
                                        this.setState(`device.${tabletName[index]}.charging_warning`, {val: false, ack: true});
                                    }
                                }
                            }
                        }
                    }
                    else {
                        this.log.warn(`${tabletName[index]} charger not specified`);
                    }
                }
            }
        }
        catch (error) {
            this.log.error(`[charger] : ${error.message}, stack: ${error.stack}`);
        }
    }

    /**
     *
     * @param {boolean} view_enabled
     * @param {boolean} mode
     */
    async switchToHomeView(view_enabled, mode) {
        try {
            // check whether switch To Home View is switched on
            this.log.debug(`check whether switch To Home View is switched on`);
            if (view_enabled) {

                // check whether which mode is set
                this.log.debug(`check whether which mode is set`);
                if (!mode) {
                    // build vis command string
                    const visCmd = `{"instance": "FFFFFFFF", "command": "changeView", "data": "${homeView}"}`;
                    this.log.debug(`build vis command string: ${visCmd}`);

                    // Set the timer to 1 sec
                    this.log.debug(`Set the timer to 1 sec`);
                    viewTimer = setTimeout(async () => {

                        // Check the state Timer_View_Switch for the set time
                        this.log.debug(`Check the state Timer_View_Switch for the set time`);
                        let timer = await this.getStateAsync(`vis_View.Timer_View_Switch`);

                        if (timer && timer.val) {

                            // @ts-ignore
                            timer = parseInt(timer.val);
                            // @ts-ignore
                            this.log.debug(`parse timer.val string => ${timer.val} to number => ${timer}`);

                            // check whether the timer is greater than 1 if so then count down otherwise for action
                            this.log.debug(`check whether the timer is greater than 1 if so then count down otherwise for action`);
                            // @ts-ignore
                            if (timer > 1) {
                                // Count down the timer
                                // @ts-ignore
                                await this.setStateChangedAsync(`vis_View.Timer_View_Switch`, timer - 1, true);
                                this.log.debug(`Count down the timer`);
                                await this.switchToHomeView(view_enabled, mode);
                            }
                            else {
                                if (viewTimer) clearTimeout(viewTimer);
                                await this.setStateAsync(`vis_View.Timer_View_Switch`, 0, true);
                                await this.setForeignStateAsync('vis.0.control.command', visCmd);
                                this.log.debug(`the command is executed and the timer is deleted`);
                            }
                        }
                    }, 1000);
                }
                else {
                    // Set the timer to 1 sec
                    this.log.debug(`Set the timer to 1 sec`);
                    viewTimer = setTimeout(async () => {

                        // Check the state Timer_View_Switch for the set time
                        this.log.debug(`Check the state Timer_View_Switch for the set time`);
                        let timer = await this.getStateAsync(`vis_View.Timer_View_Switch`);

                        if (timer && timer.val) {
                            // @ts-ignore
                            timer = parseInt(timer.val);
                            // @ts-ignore
                            this.log.debug(`parse timer.val string => ${timer.val} to number => ${timer}`);

                            // check whether the timer is greater than 1 if so then count down otherwise for action
                            this.log.debug(`check whether the timer is greater than 1 if so then count down otherwise for action`);
                            // @ts-ignore
                            if (timer > 1) {
                                // Count down the timer
                                // @ts-ignore
                                await this.setStateChangedAsync(`vis_View.Timer_View_Switch`, timer - 1, true);
                                this.log.debug(`Count down the timer`);
                                await this.switchToHomeView(view_enabled, mode);
                            }
                            else {
                                // the command is executed and the timer is deleted
                                if (viewTimer) clearTimeout(viewTimer);
                                await this.setStateAsync(`vis_View.Timer_View_Switch`, 0, true);
                                await this.setStateAsync('vis_View.widget_8_view', 0, true);
                                this.log.debug(`the command is executed and the timer is deleted`);
                            }
                        }
                    }, 1000);
                }
            }
        }
        catch (error) {
            this.log.error(`[switchToHomeView] : ${error.message}, stack: ${error.stack}`);
        }
    }

    /**
     *
     * @param {boolean} view_enabled
     * @param {boolean} mode
     */
    async checkView(view_enabled, mode) {
        try {
            // check whether switch To Home View is switched on
            this.log.debug(`check whether switch To Home View is switched on`);
            if (view_enabled) {

                const visView = this.config.visView;
                this.log.debug(`read visView config`);
                // check whether which mode is set
                this.log.debug(`check whether which mode is set`);
                if (!mode) {
                    this.log.debug(`Vis control mode is activated`);

                    //Check the state 'vis.0.control.data' for the current view
                    this.log.debug(`Check the state 'vis.0.control.data' for the current view`);
                    const currentView = await this.getForeignStateAsync(`vis.0.control.data`);

                    if (currentView !== undefined && currentView !== null && currentView.val) {

                        //perform a loop through the 'visView'
                        for (const i in visView) {

                            //check whether the currentView == wishView is if not start timer
                            this.log.debug(`check whether the currentView == wishView is if not start timer`);
                            if (wishView[i] === currentView.val) {

                                this.log.debug(`delete current viewTimer`);
                                if (viewTimer) clearTimeout(viewTimer);
                                this.log.debug(`set the Timer_View_Switch state to 0`);
                                this.setState(`vis_View.Timer_View_Switch`, 0, true);

                                this.log.debug(`Check whether visView time is not 0`);
                                if (visView[i].time !== 0) {

                                    this.setState(`vis_View.Timer_View_Switch`, time[i]);
                                    this.log.debug(`set the Timer_View_Switch state to ${time[i]}`);

                                    this.log.debug(`start switchToHomeView function`);
                                    await this.switchToHomeView(view_enabled, mode);
                                    break;
                                }
                            }
                        }
                    }
                    else {
                        this.log.error(`vis is either not installed or the state vis.0.control.data is empty`);
                    }
                }
                else {
                    this.log.debug(`View in Widget 8 mode is activated`);
                    // Check the state 'vis_View.widget_8_view' for the current view
                    this.log.debug(`Check the state 'vis_View.widget_8_view' for the current view`);
                    const currentView = await this.getStateAsync(`vis_View.widget_8_view`);

                    this.log.debug(`check if currentView is a null`);
                    if (currentView === null) {
                        this.log.debug(`currentView ist null set Timer_View_Switch to 0 `);
                        this.setState(`vis_View.Timer_View_Switch`, 0, true);
                    }

                    //perform a loop through the 'visView'
                    for (const i in visView) {
                        if (currentView) {

                            //check whether the currentView == wishView is if not start timer
                            this.log.debug(`check whether the currentView == wishView is if not start timer`);
                            if (viewNumber[i] === currentView.val) {

                                this.log.debug(`delete current viewTimer`);
                                if (viewTimer) clearTimeout(viewTimer);
                                this.setState(`vis_View.Timer_View_Switch`, 0, true);
                                this.log.debug(`set the Timer_View_Switch state to 0`);

                                this.log.debug(`Check whether visView time is not 0`);
                                if (visView[i].time !== 0) {

                                    this.setState(`vis_View.Timer_View_Switch`, time[i]);
                                    this.log.debug(`set the Timer_View_Switch state to ${time[i]}`);

                                    this.log.debug(`start switchToHomeView function`);
                                    await this.switchToHomeView(view_enabled, mode);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            this.log.error(`[checkView] : ${error.message}, stack: ${error.stack}`);
        }
    }

    /**
     * Adds leading zeros to a number, e.g. makes from 7 a "007".
     * Accepts both data type number and string as input.
     * zeroPad(5, 4);    // becomes "0005"
     * zeroPad('5', 6);  // becomes "000005"
     * zeroPad(1234, 2); // becomes "1234" :)
     * @param  {string|number} num      Number that should have leading zeros
     * @param  {number} places          number of digits
     * @return {Promise} Number          with leading zeros as desired.
     */
    async zeroPad(num, places) {
        try {
            let zero = places - num.toString().length + 1;
            return Array(+(zero > 0 && zero)).join('0') + num;
        }
        catch (error) {
            this.log.error(`zeroPad has a problem: ${error.message}, stack: ${error.stack} `);
        }
    }

    /**
     * checks whether the current time is in the range of a time span.
     * @param   {string|number}    startTime                example: 06:15:00
     * @param   {string|number}    midTime                  example: 13:45:00
     * @param   {string|number}    endTime                  example: 23:21:00
     * @return  {Promise}   valid_time_frame       example: 1 (morning) / 2 (midday) / 3 (night)
     */
    async time_range(startTime, midTime, endTime) {
        // Get the current date
        let currentDate = new Date();

        // Format the start date
        let startDate = new Date(currentDate.getTime());
        // @ts-ignore
        startDate.setHours(startTime.split(':')[0]);
        // @ts-ignore
        startDate.setMinutes(startTime.split(':')[1]);
        // @ts-ignore
        startDate.setSeconds(startTime.split(':')[2]);

        // Format the end date
        let midDate = new Date(currentDate.getTime());
        // @ts-ignore
        midDate.setHours(midTime.split(':')[0]);
        // @ts-ignore
        midDate.setMinutes(midTime.split(':')[1]);
        // @ts-ignore
        midDate.setSeconds(midTime.split(':')[2]);

        // Format the end date

        let endDate = new Date(currentDate.getTime());
        // @ts-ignore
        endDate.setHours(endTime.split(':')[0]);
        // @ts-ignore
        endDate.setMinutes(endTime.split(':')[1]);
        // @ts-ignore
        endDate.setSeconds(endTime.split(':')[2]);

        // Reset time range
        let valid_time_frame;
        let valid_time_astro;

        if (timeMode) {
            if (endTime > startTime) {

                // Time range is in the same day
                valid_time_astro = (currentDate >= startDate && currentDate <= endDate);
                valid_time_frame = valid_time_astro ? 1 : 3
            }
        }
        else {
            // Time range is in the same day
            if (currentDate >= startDate && currentDate < midDate) {
                valid_time_frame = 1;
            }
            else if (currentDate >= midDate && currentDate < endDate) {
                valid_time_frame = 2;
            }
            else {
                valid_time_frame = 3;
            }
        }
        return valid_time_frame;
    }

    /**
     * Check on number.
     * @param {number} str
     * @return {Promise} str
     */
    async convert_percent(str) {
        if (Number.isNaN(str)) {
            return 0;
        }
        return str / 100 * 255;
    }

    /**
     * Calculate memory size and add the ending.
     * @param {number} bytes
     * @return {Promise}
     */
    async bytesToSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';

        // @ts-ignore
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));

        // @ts-ignore
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    /**
     * Replaces text in a string, using an object that supports replacement within a string.
     * @param {string} str
     * @return {Promise}
     */
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

    /**
     *
     * @param {string|number} index
     */
    async create_state(index) {

        try {

            this.log.debug(`create_state start`);

            this.log.debug('tabletName: ' + JSON.stringify(tabletName));

            const deviceID = await this.replaceFunction(tabletName[index]);

            await this.setObjectNotExistsAsync(`device`, {
                type: 'device',
                common: {
                    name: ''
                },
                native: {}
            });

            await this.setObjectNotExistsAsync(`vis_View`, {
                type: 'device',
                common: {
                    name: 'Automatic switch to Home View'
                },
                native: {}
            });

            await this.setObjectNotExistsAsync(`device.${deviceID}`, {
                type: 'device',
                common: {
                    name: ip[index]
                },
                native: {
                    ip: ip[index]
                }
            });

            for (const channelFolderKey in channelFolder) {

                await this.setObjectNotExistsAsync(`device.${deviceID}.${channelFolder[channelFolderKey]}`, {
                    type: 'channel',
                    common: {
                        name: `${channelFolder[channelFolderKey]}`
                    },
                    native: {}
                });
            }

            await this.setObjectNotExistsAsync(`device.${deviceID}.commands.kiosk`, {
                type: 'channel',
                common: {
                    name: `kiosk commands`
                },
                native: {}
            });

            await this.setObjectNotExistsAsync(`device.${deviceID}.device_info.memory`, {
                type: 'channel',
                common: {
                    name: `memory info`
                },
                native: {}
            });

            for (const obj in device_Folder_Object) {
                await this.setObjectNotExistsAsync(`device.${obj}`, device_Folder_Object[obj]);

            }
            this.subscribeStates(`device.reloadAll`);

            for (const obj in main_Object) {
                await this.setObjectNotExistsAsync(`device.${deviceID}.${obj}`, main_Object[obj]);
            }
            this.subscribeStates(`device.${deviceID}.manualBrightness`);
            this.subscribeStates(`device.${deviceID}.brightness_control_mode`);

            for (const obj in command_Object) {
                await this.setObjectNotExistsAsync(`device.${deviceID}.commands.${obj}`, command_Object[obj]);
                this.subscribeStates(`device.${deviceID}.commands.${obj}`);
                commandsID.push(`.device.${deviceID}.commands.${obj}`);
            }

            for (const obj in kiosk_Object) {
                await this.setObjectNotExistsAsync(`device.${deviceID}.commands.kiosk.${obj}`, kiosk_Object[obj]);
                if (obj !== 'kioskPin') this.subscribeStates(`device.${deviceID}.commands.kiosk.${obj}`);
            }

            for (const obj in device_info_Object) {
                await this.setObjectNotExistsAsync(`device.${deviceID}.device_info.${obj}`, device_info_Object[obj]);
            }

            for (const obj in memory_Object) {
                await this.setObjectNotExistsAsync(`device.${deviceID}.device_info.memory.${obj}`, memory_Object[obj]);
            }

            for (const obj in vis_View_object) {
                await this.setObjectNotExistsAsync(`vis_View.${obj}`, vis_View_object[obj]);
            }
            this.subscribeStates(`vis_View.widget_8_view`);
            this.subscribeForeignStates(`vis.0.control.data`);

            if (!deviceEnabled[index] && !logMessage[index]) {
                this.setState(`device.${tabletName[index]}.isFullyAlive`, {val: false, ack: true});
            }
            this.setState('info.connection', true, true);
        }
        catch (error) {
            this.log.error(`[create_state] : ${error.message}, stack: ${error.stack}`);
        }

    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            if (automatic_briTimeout) clearTimeout(automatic_briTimeout);
            if (viewTimer) clearTimeout(viewTimer);
            if (requestTimeout) clearTimeout(requestTimeout);
            if (ScreensaverReturn) clearTimeout(ScreensaverReturn);
            if (BriRequestTimeout) clearTimeout(BriRequestTimeout);

            for (const Unl in tabletName) {
                if (logMessageTimer[Unl]) clearTimeout(logMessageTimer[Unl]);
                if (screensaverTimer[Unl]) clearTimeout(screensaverTimer[Unl]);
                if (foregroundAppTimer[Unl]) clearTimeout(foregroundAppTimer[Unl]);
                if (kioskPinTimeout[Unl]) clearTimeout(kioskPinTimeout[Unl]);
                if (captureTimeout[Unl]) clearTimeout(captureTimeout[Unl]);
            }
            this.log.info('Adapter Fully Tablet Control stopped...');
            this.setState('info.connection', false, true);

            callback();
        }
        catch (e) {
            callback();
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
                this.log.debug(`stateID ${id} changed: ${state.val} (ack = ${state.ack})`);

                // manual brightness States change
                for (const index in tabletName) {
                    if (deviceEnabled[index] && !state.ack && !logMessage[index] && state.from !== `system.adapter.${this.namespace}`) {
                        if (id === `${this.namespace}.device.${tabletName[index]}.manualBrightness` || id === `${this.namespace}.device.${tabletName[index]}.brightness_control_mode`) {
                            this.log.debug(`state ${id} changed: ${state.val} from: ${this.namespace}`);
                            this.manualStates(id, index, state);
                            break;
                        }
                    }
                }

                //sendFullyCommand command folder
                for (const change in tabletName) {
                    if (deviceEnabled[change] && !state.ack && !logMessage[change]) {
                        for (const obj in command_Object) {
                            if (id === `${this.namespace}.device.${tabletName[change]}.commands.${obj}`) {
                                this.log.debug(`state ${id} changed: ${state.val} from: ${this.namespace}`);
                                this.sendFullyCommand(id, state, change, obj);
                                break;
                            }
                        }
                    }
                }

                //sendFullyCommand commands.kiosk folder
                for (const change in tabletName) {
                    if (deviceEnabled[change] && !state.ack && !logMessage[change]) {
                        for (const obj in kiosk_Object) {
                            if (id === `${this.namespace}.device.${tabletName[change]}.commands.kiosk.${obj}`) {
                                this.log.debug(`state ${id} changed: ${state.val} from: ${this.namespace}`);
                                this.sendFullyCommand(id, state, change, obj);
                                break;
                            }
                        }
                    }
                }

                //sendFullyCommand main folder
                for (const change in tabletName) {
                    if (deviceEnabled[change] && !state.ack && !logMessage[change]) {
                        for (const obj in device_Folder_Object) {
                            if (id === `${this.namespace}.device.${obj}`) {
                                if (state.val === false) {
                                    state.val = true;
                                }
                                this.log.debug(`state ${id} changed: ${state.val} from: ${this.namespace}`);
                                this.sendFullyCommand(id, state, change, obj);
                                break;
                            }
                        }
                    }
                }

                // Motion Sensor State Change
                for (const index in motionID) {
                    if (id === `${motionID[index]}`) {
                        if (typeof state.val === 'boolean') {
                            this.log.debug(`motion Sensor state ${id} changed: ${state.val}`);
                            this.motionSensor(index, state.val);
                        }
                    }
                }

                const view_enabled = JSON.parse(this.config['viewChange_enabled']);
                if (view_enabled) {
                    const mode = JSON.parse(this.config[`viewMode`]);
                    if (!mode) {
                        if (id === `vis.0.control.data`) {
                            this.log.debug(`state ${id} changed: ${state.val}`);
                            this.checkView(view_enabled, mode);
                        }
                    }
                    else {
                        if (!state.ack) {
                            if (id === `${this.namespace}.vis_View.widget_8_view`) {
                                this.log.debug(`state ${id} changed: ${state.val}`);
                                this.checkView(view_enabled, mode);
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            this.log.error(`[onStateChane ${id}] error: ${error.message}, stack: ${error.stack}`);
        }
    }

    /**
     * added in version 0.3.1-Beta.0
     * on Telegram and Vis adapter if available and Telegram user call from the adapter
     * @return {Promise}     //return Object {'User':[],'visAdapter':false, 'telegramAdapter':false}
     */
    async readTelegramUser() {
        const viewObj = await this.getObjectViewAsync('system', 'instance', {startkey: 'system.adapter.', endkey: 'system.adapter.\u9999'});
        const result = [];
        const arrTemp = [];
        const telegramUser = [];
        const telegramObj = {
            'User': [],
            'visAdapter': false,
            'telegramAdapter': false
        };
        for (const objKey in viewObj.rows) {
            result.push(viewObj.rows[objKey].value);
        }
        for (const r in result) {
            for (let i = 0; i < 10; i++) {
                // @ts-ignore
                if (result[r]._id === `system.adapter.telegram.${i}`) {
                    telegramObj.telegramAdapter = true;
                    arrTemp.push(`telegram.${i}.communicate.users`);
                }
                // @ts-ignore
                if (result[r]._id === `system.adapter.vis.0`) {
                    telegramObj.visAdapter = true;
                }
            }
        }

        for (const u in arrTemp) {
            telegramUser[u] = await this.getForeignStateAsync(arrTemp[u]);
            if (telegramUser !== null || telegramUser !== undefined) {
                for (const s in telegramUser) {
                    if (telegramUser[s] !== null) {
                        if (telegramUser[s].val !== '') {
                            const tempUser = JSON.parse(telegramUser[s].val);
                            for (const t in tempUser) {
                                if (tempUser[t].firstName !== undefined) {
                                    // @ts-ignore
                                    telegramObj.User.push(`${tempUser[t].firstName}/${tempUser[t].firstName}`);
                                }
                                else if (tempUser[t].userName !== undefined) {
                                    // @ts-ignore
                                    telegramObj.User.push(`${tempUser[t].userName}/${tempUser[t].userName}`);
                                }
                                else {
                                    // @ts-ignore
                                    telegramObj.User.push('');
                                }
                            }
                        }
                    }
                }
                return telegramObj;
            }
        }
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    /**
     * added in version 0.3.1-Beta.0
     * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
     * Using this method requires "common.messagebox" property to be set to true in io-package.json
     * @param {ioBroker.Message} obj
     */
    async onMessage(obj) {
        if (typeof obj === 'object' && obj.message) {
            const deviceObj = obj.message;
            const deviceOnline = [];
            let TelegramObj = {};
            switch (obj.command) {
                case 'pingTablet':
                    // @ts-ignore
                    for (const i in deviceObj) {
                        if (deviceObj[i].enabled) {
                            await axios.get(`http://${deviceObj[i].ip}:${deviceObj[i].port}/?cmd=deviceInfo&type=json&password=${deviceObj[i].password}`)
                                .then(async apiResult => {
                                    if (apiResult.statusText === 'OK ') {
                                        deviceOnline[i] = true;
                                    }
                                })
                                .catch(async error => {
                                    if (error.code === 'ETIMEDOUT') {
                                        deviceOnline[i] = false;
                                    }
                                });
                        }
                    }
                    this.sendTo(obj.from, obj.command, deviceOnline, obj.callback);
                    break;
                case 'TelegramUser':
                    TelegramObj = await this.readTelegramUser();
                    this.sendTo(obj.from, obj.command, TelegramObj, obj.callback);
                    break;
            }
        }
    }
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new FullyTabletControl(options);
}
else {
    // otherwise start the instance directly
    new FullyTabletControl();
}