#!/bin/sh

# Install Gitolite and put the public key in it
/root/gitolite/install -to /root/gitolite/bin
/root/gitolite/bin/gitolite setup -pk /root/.ssh/gitolite.pub

# Look if hostvolume is empty
DIR="/root/common"
ssh_dir="/var/run/sshd"
#check if directory exists
if [ -d "$DIR" ]; then
	# do this when volume is empty
	if [ "$(ls -A $DIR)" ]; then
		echo "$DIR exists and is not empty"
		
		key=$(cat /root/common/jenkins.pub)
		
		if [ $(cat /root/.ssh/authorized_keys | grep "$key" | wc -l ) -eq 0 ]; then 
			echo "****************************************************************"
			# Only once
			echo -e "\n$key" >> /root/.ssh/authorized_keys

			#Gitolite post-recive hook to trigger buildsq of Jenkins Jobs
			curl http://192.168.91.91:8080/jenkins/git/notifyCommit?url=/root/sample/

		else
			if [ -d "$ssh_dir" ]; then
				echo "$ssh_dir already exists"
			else
				mkdir /var/run/sshd
				chmod 0755 /var/run/sshd
			fi

			service ssh restart
			netstat -tan | grep LIST
			cd && /usr/sbin/sshd -D -e

		fi
		
	else
		echo "$DIR exists and is empty"
		#in volume shoub be the public key of jenkins
	fi
fi