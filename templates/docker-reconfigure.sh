#!/bin/bash

set -e
set -u

PROXY_LINE="export http_proxy=${httpProxy}"

if grep -F "export http_proxy" /etc/default/docker
then
	if ! grep -F "$PROXY_LINE" /etc/default/docker
	then
		echo "Restarting docker"
		perl -pi -e 's#^.*http_proxy.*$#'"$PROXY_LINE#" /etc/default/docker
		restart docker
	fi
fi

