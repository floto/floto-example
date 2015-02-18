#!/bin/sh

# Look if hostvolume is empty
DIR="/root/common"
FILE="/root/common/jenkins.pub"
ssh_dir="/var/run/sshd"
GIT_DIR="/root/bin"

# Install Gitolite and put the public key in it
if [ \! -d "$GIT_DIR" ]; then
	mkdir /root/bin
	/root/gitolite/install -to /root/bin
	/root/bin/gitolite setup -pk /root/.ssh/gitolite.pub
fi

# Copy Public Key to Volume 
cp /root/.ssh/gitolite.pub /root/common

#check if directory exists
if [ -d "$DIR" ]; then
	# do this when volume is empty
	if [ -f "$FILE" ]; then
		echo "$DIR exists and $FILE is there"
		
		key=$(cat $FILE)
		
		if [ $(cat /root/.ssh/authorized_keys | grep "$key" | wc -l ) -eq 0 ]; then 
			echo "****************************************************************"
			# Only once
			chmod 600 /root/.ssh/authorized_keys
			echo  "\n" >> /root/.ssh/authorized_keys
			#echo  "command="/root/ >> /root/.ssh/authorized_keys
			echo "$key" >> /root/.ssh/authorized_keys
			echo  "\n" >> /root/.ssh/authorized_keys

			#Clone Admin repo
			git clone /root/repositories/gitolite-admin.git	
			cp "$FILE" /root/gitolite-admin/keydir
			cd /root/gitolite-admin
			#rm -f /root/gitolite-admin/conf/gitolite.conf
			cp -v /root/gitolite/conf/gitolite.conf /root/gitolite-admin/conf/gitolite.conf
			git add -A
			git commit -m "test"
			git push origin

		else
			if [ -d "$ssh_dir" ]; then
				echo "$ssh_dir already exists"
			else
				mkdir /var/run/sshd
				chmod 0755 /var/run/sshd
			fi
			# Gitolite post-recive hook to trigger buildsq of Jenkins Jobs
			# Works only if jenkins has already the sample porject cloned
			curl http://192.168.91.91:8080/jenkins/git/notifyCommit?url=/root/sample/
			
			service ssh restart
			netstat -tan | grep LIST
			# Cannot bind any address.
			cd && /usr/sbin/sshd -D -e

		fi
		
	else
		echo "$DIR exists and $FILE is not in it"
		#in volume should be the public key of jenkins
	fi
fi