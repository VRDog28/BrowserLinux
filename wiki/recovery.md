# Emergency Recovery
If you forgot your root password or your system is locked here is a way to recover your system

## ♻️ Way 1: Powerwashing
You might think you need sudo to powerwash but there is a handy way to bypass this using 🗑️ dumping  
- open the dump using `nano /usr/local/dump.conf`
- next add these values:  
`disablesudo=true`  
`bypasspowerwash=true`  
`enterprise=false`  
- save and exit and **force** reboot your system using `CTRL + R`
- after booting type `powerwash` and if you've done it correctly it should ask for confirmation type `y` and it should powerwash and reset your system
## ⚠️ NOTE
On version 2.0.0 powerwash does not require sudo!
