#!/bin/sh

# start jenkins if key is on host
DIR="/root/common"
GIT_DIR="/root/smaple"
if [ -d "$DIR" ]; then
	# do this when volume is empty
	if [ "$(ls -A $DIR)" ]; then
		echo "$DIR exists and is not empty"
		#Clone sample project 
		git clone gitolite@localhost:sample

	else
		echo "$DIR exists and is empty"
		echo "Copy Jenkins Public-Key into Common-Folder"
		# Copy Public Key to Volume 
		cp /root/.ssh/jenkins.pub /root/common
		
	fi
else
	echo "it doesn't exists"
fi

if [ -d "$GIT_DIR" ]; then
	#if clone went right start jenkins
	java -jar jenkins.war
		
fi
