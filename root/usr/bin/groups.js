if (shell.userPermission == 0) write(window.shell.userName + " everybody\n");
if (shell.userPermission == 1) write(window.shell.userName + " admins\n");
if (shell.userPermission == 2) write(window.shell.userName + " system\n");
if (shell.userPermission == 3) write(window.shell.userName + " kernel\n");
if (shell.userPermission == 4) write("root\n");