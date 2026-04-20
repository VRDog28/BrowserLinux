# THE FS1 DISK
The fs1 disk stands for FileSystem version 1  
It was made by VRDog28 to store files folders and metadata  
## 💾 HOW IT WORKS
If you open any fs1 file you will first see the header  
`fs1`
Tells the operating system what version and type of filesystem it is  
next you will see  
`--folders` followed by something like  
`/bin`  
These are all the folders on your system  
The parser saves the folders to `window.fs.folders`  
Next up is  
`--files`  
All the files on your system are saved here   
To store a file you first use the file path  
`/bin/terminal.js`  
And then the line count of the file eg.  
`38`  
And then you will find the actual file content which must match the line count  
The parser saves it at  
`window.fs.files["filename"]`  
And finally there is  
`--meta` and `--end`  
meta stores the meta for each folder/file  
meta works similar to --files  
you have path, line count, metadata  
`--end` is used for declaring the end of a fs1 file

## ♻️ Powerwashing
type `sudo powerwash` to powerwash and reset your system
## 💿 RCVR FILES
rcvr stands for recovery which is a backup/recovery file for a fs1 filesystem
## 🔒 The fs1 permission system
Unlike linux, BrowserLinux uses the fs1 permission system which supports write and read permissions.  
These are stored in the metadata of a folder.  
You can use `chmod 0 0 /etc` to set the write and read permission of /etc to 0 0  
### 🔐 PERMISSION LEVELS
0 = Everyone  
1 = Admins  
2 = System  
3 = Kernel  
4 = Root  


