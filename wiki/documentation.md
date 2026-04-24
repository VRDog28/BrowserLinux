# Custom filesystem (challenge 1):

Instead of using IndexedDB or LocalStorage I explored a minimal filesystem format

```
fs
--folders
/usr
/usr/bin
--files
/usr/bin/example.js
1
write("fs1\n");
--meta
/usr/bin
1
writepermission=4
--end
```

## Format design:

The file starts with a header `fs` identifies the format. Then it splits into different sections

### - folders

A flat list of paths in plain-text. It was really straightforward to implement in javascript but required normalization to avoid duplicate/malformed entries.

### - files

Each file is stored as:

* Path
* Line count
* Content

The important constraint here is that the parser depends on the line count being correct, else it will break and not parse files correctly.

### - metadata

Meta works very similar to files but instead uses a key-value pair for the content.
This is used for example, permission handling

### - end marker

Marks the end of the system

---

## - Technical challenges

### - Strict parsing requirements

Because the format is plain-text and line-based, a single miscount can corrupt everything after it

---

# Why not JSON

Making my own disk format was more low-level and interesting, so i had to make it

---

# Kernel execution model (challenge 2):

Once the filesystem was working and parsed correctly, the next problem is executing files within my fs1 disk

Since everything is written in pure javascript, i dont have a real process system. Instead files had to be executed dynamically during runtime.

Here is how a execution model could look like in Javascript:

```js
await new Function(`return (async ()=>{ ${code} })();`)();
```

Each JS program inside the disk is just a string with newlines, which get turned into a function executed at runtime

## Why this:

* Run files directly from a string
* Support async code by default
* Keeps everything inside the browser sandbox

## Challenges:

This method introduced several issues:

### - No isolation

Any program can acces globals and manipulate them.

### - Error handling

If any program throws, it will stop the whole kernel.
To fix it i had to make sure the function was catched everytime

### - State handling

I had to track every process manually to avoid conflicting programs.

---

# Persistence & version compatibility (challenge 3)

## Cross version incompatibility:

* New disk features had incompatibility with older versions where:

**New kernels:**
correctly read the disk

**Old kernels:**
Failed/Throws

## Why updating kernels could not fix it:

* Older kernels are immutable
* You cannot change their behaviour because there is no "update kernel" yet

## Fix:

Let the firmware handle most of it while the kernel being untouched.

While this specific solution mostly fixed it, it was not perfect:

* Some functions are not handled by the firmware so it was impossible to change/intercept it
* Implementing features in the firmware was a fragile solution and not ideal

---

# Lessons learned:

Writing OS features in Javascript is easy, but making them stable and compatible is not:

* FS1 worked but later broke with versioning.
* Execution worked but did cause isolation issues and you have to manually catch each error.
* Small changes can turn into BIG problems fast.
* Backwards compatibility becomes a problem much earlier on:

  * Even with simple functions that seem very solid

And it forced me to rethink architecture.
