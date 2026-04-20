# Kernel
The kernel loads after the firmware and handles running javascript files, making functions like write, log, clear and way more
## ❌ CRITICAL KERNEL ERRORS
If you ever see "KERNEL ERROR: FONT FILE NOT FOUND" it means the kernel cant seem to find any font and refuses to load.  
To fix it you have to recover using rcvr recovery  
If you ever see "BIOS: ERROR: File not found "/krnl/kernel.js"" it means you deleted your kernel fix it using rcvr recovery
## ⚠️ Kernel checksum
Your bios checks for kernel legitimately.  
If the checksum fails it means you can't boot anymore typically caused by changing your kernel.  
To disable:  
Disable kernel verification  
To fix:  
rcvr recovery
