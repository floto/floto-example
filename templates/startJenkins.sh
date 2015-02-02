#!/bin/sh

# start jenkins if key is on host
DIR="/usr/local/jenkins"
if [ -d "$DIR" ]; then
	# do this when volume is empty
	if [ "$(ls -A $DIR)" ]; then
		echo "$DIR exists and is not empty"
		java -jar jenkins.war
	else
		echo "$DIR exists and is empty"
		# Copy Public Key to Volume (and host?)
		cp /root/.ssh/jenkins.pub /root/volumes
		cp /root/.ssh/jenkins.pub /usr/local/jenkins
		
	fi
fi

