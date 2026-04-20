# BrowserLinux Firmware
The browserlinux firmware runs on javascript and this is the first thing that loads if you boot!
## ⚡ Flashing custom firmware
### ⚠️ WARNING
If you flash custom firmware you might never boot into BrowserLinux again.
### 📝 Requirements
- A stable firmware
- Root permissions
- At least Version 1.0.0
### 💬 TUTORIAL
type `sudo -s` if you haven't already  
type `flash` to unlock the firmware  
type `touch /firm/firmware.js` to create a base  
finally type `nano /firm/firmware.js` to edit the new firmware.  
NOTE:  
If you already have a firmware.js downloaded move the file using `mv /home/Downloads/firmware.js /firm`  
type `reboot` to reboot and boot into custom firmware  
