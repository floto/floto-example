#!/bin/sh

#******************************************
# 	CURRENTLY NOT USED
#******************************************

# start jenkins if key is on host
DIR="/root/common"
FILE="/root/common/gitolite.pub"
GIT_DIR="/root/smaple"

# Copy Public Key to Volume 
echo "Copy Jenkins Public-Key into Common-Folder"
cp /root/.ssh/jenkins.pub /root/common

if [ -d "$DIR" ]; then
	# do this when volume is empty
	if [ -f "$FILE" ]; then
		echo "$DIR exists and $FILE is in it"
		#Clone sample project 
		git clone git@localhost:sample
		chmod 600  /root/.ssh/authorized_keys
		key=$(cat $FILE)

		if [ $(cat /root/.ssh/authorized_keys | grep "$key" | wc -l ) -eq 0 ]; then 
			echo "****************************************************************"
			# Only once
			echo "\n$key" >> /root/.ssh/authorized_keys

			service ssh restart
		fi

	else
		echo "$DIR exists and $FILE is not in it"		
		
	fi
else
	echo "$DIR doesn't exists"
fi

if [ -d "$GIT_DIR" ]; then
	#if clone went right start jenkins
	java -jar jenkins.war
		
fi