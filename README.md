![Logo](admin/tablet-control.png)

# ioBroker.fully-tablet-control

[![NPM version](http://img.shields.io/npm/v/iobroker.fully-tablet-control.svg?logo=npm)](https://www.npmjs.com/package/iobroker.fully-tablet-control) 
[![Downloads](https://img.shields.io/npm/dm/iobroker.fully-tablet-control.svg?logo=npm)](https://www.npmjs.com/package/iobroker.fully-tablet-control) 
![Installations (latest)](http://iobroker.live/badges/fully-tablet-control-installed.svg)
![(stable)](http://iobroker.live/badges/fully-tablet-control-stable.svg)
[![Dependency Status](https://img.shields.io/david/xXBJXx/iobroker.fully-tablet-control.svg)](https://david-dm.org/xXBJXx/iobroker.fully-tablet-control)

[![NPM](https://nodei.co/npm/iobroker.fully-tablet-control.png?downloads=true)](https://nodei.co/npm/iobroker.fully-tablet-control/)

**Tests:**: [![Travis-CI](http://img.shields.io/travis/xXBJXx/ioBroker.fully-tablet-control/master.svg)](https://travis-ci.org/xXBJXx/ioBroker.fully-tablet-control)

# Fully Tablet Control Adapter für ioBroker

## Steuern Sie Ihr Tablet mit dem Fully Kiosk Browser **(Plus License erforderlich)**

# !!! ACHTUNG Beta Release !!!

## Browser Admin Login

![login](admin/media/browser-admin-login.png)

### Hier werden die Tablets eingetragen und der Abfrageintervall festgelegt

1. Abfrageintervall standardmäßig auf 30 sec eingestellt.

2. Timer in Minuten, um den Fully Browser wieder in den Vordergrund zu holen (empfohlen für Amazon Fire Tablet mit Alexa da der Fully Browser in den Hintergrund gesetzt wird, wenn Alexa auf dem Tablet getriggert wird Z.B. "Alexa wie ist das Wetter heute").

3. Tablet Name wird verwendet, um die verschiedenen Tablets in separaten Ordner zu erstellen, wenn kein Name angegeben wird wir die Ip Adresse als Name versendet.

4. Ip Adresse von deinem Tablet.

5. Hier kann man den Port eintragen falls man ihn geändert hat.

6. Password von Fully Remote Admin **(Plus License erforderlich)**.

7. Hier könne einzelne Tablets ausgeschaltet werden so das diese nicht mehr abgefragt werden.

## Für Jedes Tablet, das auf der ersten Seite angelegt wurde, muss auf den nächsten Seiten ein Eintrag in der Tabelle angelegt werden!

## Ladegerät

![charger](admin/media/charger.png)

Hier muss die ID von dem Ladegerät eingetragen werden damit das Tablet geladen werden kann.

1. Datenpunkt ID von dem Ladegerät.

2. Lademodus auswählbar sind **Dauerstrom** oder **Ladezyklus** bei Dauerstrom wird das Tablet dauerhaft am Strom gehalten und bei Ladezyklus wird das Tablet z.B. bei 20% anfangen zu laden und bei 85% das Laden abschalten.

3. **(nur für Ladezyklus relevant)** Ladestart ab dieser grenze startet das Tablet das laden.

4. **(nur für Ladezyklus relevant)** Ladestopp bis zu den diesen Wert wird das Tablet aufgeladen.

## Helligkeit

![brightness](admin/media/brightness.png)

Hier wird die Helligkeit von dem Tablet eingestellt.

1. hier kann man entscheiden ob der Bildschirm dauerhaft an bleiben soll, selbst wenn man auf den ausschalt Knopf drückt wird der Bildschirm wieder eingeschaltet.

2. Intervall für die Prüfung der Helligkeit in Minuten

3. Uhrzeit wann das Tablet auf die unter Nr.: **5** eingestellte Tageshelligkeit eingestellt werden soll.

4. Uhrzeit wann das Tablet auf die unter Nr.: **6** eingestellte Nachthelligkeit eingestellt werden soll.

7. Hier wird die Absenkung der Helligkeit eingestellt wen das Tablet am Laden ist damit es schneller aufgeladen wird.

## Bildschirmschoner

![Screensaver](admin/media/Screensaver.png)

Hier wird der Bildschirmschoner eingestellt.

1. Bildschirmschoner einschalten oder Ausschalten auswählen damit den Tablets der Bildschirmschoner eingeschaltet wird.

2. Beschreibung des Bildschirmschoners dient nur zur Info was für ein Bildschirmschoner eingestellt ist.

3. YouTube URL oder Wallpaper URL Hier kann eine YouTube Video URL eingetragen werden z.B. ein Aquarium bei Wallpaper URL kann ein Bild als Bildschirmschoner eingestellt werden.

4. Hier muss man auswählen was für eine URL man verwendet.

5. Timer wann der Bildschirmschoner starten soll

## (Optional) Telegramm

![telegram](admin/media/telegram.png)

Hier werden die Telegramm User eingestellt, die die Warnung erhalten sollen, die gesendet wird, wen ein Tablet nicht geladen wird und unter 18% fällt.

1. Telegrammwarnungen aktivieren oder deaktivieren wen die Warnung deaktivieren ist werden trotzdem die Warnung im Iobroker log ausgegeben.

2. Telegrammbenutzer Hier werden die User Namen vom Telegramm eingetragen.

## (Optional) Bewegungsmelder

![motion](admin/media/motion.png)

Hier kann man externe Bewegungsmelder eintragen, die den Bildschirmschoner abschalten sollen.

1. Bewegungsmelder Aktiviren oder deaktivieren, wenn ausgeschaltet wird der Bildschirmschoner nach der eingestellten Zeit gestartet und bleibt aktiv bis er durch Berührung ausgeschaltet wird  

2. Bewegungsmelder ID hier kommt die Bewegungsmelder ID, wenn nur eine ID eingetragen wird werden alle Tablets von diesem Bewegungsmelder geschaltet.

3. wenn mehrere Bewegungsmelder eingetragen wurden kann man über diese Schaltfläche die einzeln abschalten.

## Objects

![objects](admin/media/objects.png)

* bei den erstellten Datenpunkten kann man die Helligkeit manuell einstellen dazu muss man zuerst bei punkt **1** von Admin auch User wechseln dann kann man bei punkt **3** die Helligkeit manuell verändern dies ist nur für die Tages Helligkeit nicht für die Nacht.

* unter Punkt **2** wird bei einer Warnung, wenn das Tablet nicht auflädt ein **true** wert gesetzt.

* bei punkt **4** wird der aktuelle Batterie stand für eine vis anzeige geschrieben z.B. **[ basic-Image 8 Widget]**

![battery](admin/media/battery.png)

![battery-settings](admin/media/battery-settings.png)

## Automatischer Wechsel auf Home View

unter Vis View kann man seine Views von der Vis eintragen und die Zeit, nach der sie wieder auf die Home View wechseln sollen.

![config_vis](admin/media/config_vis.png)

1. Einschalten oder Ausschalten der Automatische Änderung der Vis-Ansicht.

2. Auswählen welche View Methode man verwendet Widget 8 wird z.B. bei (**Material Design Widgets (Top App Bar verwendet)**).

3. hier wird euer Project eingetragen wer nicht weiß wo man es findet hier z.B:
![project_name1](admin/media/project_name1.png)
![project_name](admin/media/project_name.png)

4. hier kommt die View rein die oberste also **Nr.: 1 ist immer die Home View**.

5. hier kommt die Nummer der **Widget 8 View** rein die erste ist wie bei Nr.: 4 immer die Home View.

6. hier kommt nun die Zeit rein in Sekunden.

## Vis View Objekte

hier sind 2 Dp.

![objects_vis](admin/media/objects_vis.png)

1. hier ist der Timer der die Rest Zeit anzeigt.

2. das ist der Dp für die Widget 8 View's.

_______________________________

## Changelog

### 0.2.0

* (xXBJXx) charging warning message output adjusted

### 0.1.9

* (xXBJXx) bug in Automatic change to home view widget 8 fixed

### 0.1.8

* (xXBJXx) add Automatic change to home view

### 0.1.5

* (xXBJXx) brightness bug fix

### 0.1.4

* (xXBJXx) manuell StateChange optimized

### 0.1.3

* (xXBJXx) Configuration page changed

### 0.1.2

* (xXBJXx) log level adjusted

### 0.1.1

* (xXBJXx) README.md edit

### 0.1.0

* (xXBJXx) Beta Release

### 0.0.8

* (xXBJXx) device activate added
* (xXBJXx) bug fixes

### 0.0.7

* (xXBJXx) back to Fully Browser implemented
* (xXBJXx) bug fixes

### 0.0.6

* (xXBJXx) Screensaver selection implemented
* (xXBJXx) Motion detector added

### 0.0.5

* (xXBJXx) manual brightness control implemented
* (xXBJXx) Screensavers added

### 0.0.4

* (xXBJXx) request optimized for multiple devices
* (xXBJXx) brightness control implemented

### 0.0.3

* (xXBJXx) Charging function optimized
* (xXBJXx) Added selection screen for continuous operation
* (xXBJXx) Telegram warning added

### 0.0.2

* (xXBJXx) added charging function

### 0.0.1

* (xXBJXx) initial release

## License

MIT License

Copyright (c) 2020 xXBJXx <alienware.games@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
