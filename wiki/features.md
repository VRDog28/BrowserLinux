## Features (v1.0.0)

### 🔧 Configuration

To view the configuration:

```sh
sudo -s
nano /etc/profiles/default.conf
````
![](https://raw.githubusercontent.com/VRDog28/BrowserLinux/main/screenshots/screenshot8.jpg)

### 📢 Example config:

```ini
cwd="/home"
args=[]
userPermission=0
inputMode="command"
```

### ⚠️ Important Notes

It is **not recommended** to change settings unless you understand their purpose.

### 📘 Configuration Reference

* **cwd**
  Default working directory

* **args**
  Command arguments (do not modify)

* **userPermission**
  Default user permission level

* **inputMode**
  Input mode for the shell (do not modify)

* **path**
  Directories the shell searches for commands

* **font**
  System font file

* **theme**
  System-wide theme settings:

  ```text
  ["textcolor", "textbackground", "terminalbackground", "textsize"]
  ```

* **pipe**
  Used for piping command output between processes

* **home**
  The user's home directory

* **lastStatus**
  The last command exit code

### 🗑️ Dumping
**This is very similar to config**

To view the dump:

```sh
nano /usr/local/dump.conf
````

### 📖 Available dump settings
- disablesudo  
disables sudo  
- bypasspowerwash  
bypasses powerwash  
- lock  
locks the system forever  
