#!/bin/sh

# Install Gitolite and put the public key in it
/root/gitolite/install -to /root/gitolite/bin
/root/gitolite/bin/gitolite setup -pk /root/.ssh/gitolite.pub

# Look if hostvolume is empty
DIR="/root/volume/"
#check if directory exists
if [ -d "$DIR" ]; then
	echo "$DIR exists!"
	# do this when volume is empty
	if [ "$(ls -A $DIR)" ]; then
		echo "volume is not empty"
	else
		#Problem: shell dont know docker 
		#volume("/usr/local/gitolite","/root/volume");
	   	echo "make Host-Volume"
	fi
fi