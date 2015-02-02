#!/bin/sh

# Install Gitolite and put the public key in it
/root/gitolite/install -to /root/gitolite/bin
/root/gitolite/bin/gitolite setup -pk /root/.ssh/gitolite.pub

# Look if hostvolume is empty
DIR="/root/volume/"
#check if directory exists
if [ -d "$DIR" ]; then
	# do this when volume is empty
	if [ "$(ls -A $DIR)" ]; then
		echo "$DIR exists and is not empty"
		ssh-copy-id /root/volume/jenkins.pub
	else
		echo "$DIR exists and is empty"
		
	fi
fi