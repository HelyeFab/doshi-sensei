#!/bin/bash

# Fix for "too many open files" error in development

echo "Current file watch limit:"
cat /proc/sys/fs/inotify/max_user_watches

echo -e "\nIncreasing file watch limit..."

# Temporary fix (until reboot)
echo "Setting temporary limit..."
sudo sysctl fs.inotify.max_user_watches=524288

# Permanent fix
echo "Setting permanent limit..."
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

echo -e "\nNew file watch limit:"
cat /proc/sys/fs/inotify/max_user_watches

echo -e "\nDone! You can now run 'npm run dev' without file watch errors."