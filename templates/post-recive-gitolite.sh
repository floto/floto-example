#!/bin/sh

JENKINS_URL=http://192.168.91.91:8080/
GIT_URL=git@git
echo -n "Notifying Jenkins..."
wget -q $JENKINS_URL/git/notifyCommit\?url=$GIT_URL:$GL_REPO -O /dev/null
echo "done."