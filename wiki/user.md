# The BrowserLinux Usersystem
BrowserLinux does not have a Usersystem as of Version 1.0.0  
Which means you can switch/create user but you can customize your own user
## 🔧 Customizing your user
### 🕶️ Changing your name
To change your name follow these steps:  
type `sudo nano /etc/profiles/default.conf` to change configuration.  
in qoutes replace userName="old_name" to userName="new_name"  
reboot using `sudo reboot` to apply the changes
### 🕶️ Changing the hostname
Same for the hostname
### 🔒 Changing the root password
As of version V1.0.0 there is no simple way to change the superuser password unless manually changing your disk  
The only way is to powerwash your system using `sudo powerwash`
Version 2.0.0:  
Use the passwd command
