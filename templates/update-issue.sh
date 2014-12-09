#!/bin/sh
if [ "$METHOD" = loopback ]; then
    exit 0
fi

# Only run from ifup.
if [ "$MODE" != start ]; then
    exit 0
fi

<#if useDhcp>
	<#assign adapter="eth1">
<#else>
	<#assign adapter="eth0">
</#if>

#cp /etc/issue-standard /etc/issue
#/usr/local/bin/get-ip-address >> /etc/issue
IP=`/sbin/ifconfig ${adapter} | grep "inet addr" | grep -v "127.0.0.1" | awk '{ print $2 }' | awk -F: '{ print $2 }' | head -1`

tee /etc/issue <<EOFEOFEOF
------------------------------------------------------------------------------
Welcome to Floto :-)
------------------------------------------------------------------------------

Domain:                   [${domainName}]

Boot date:                $(who -b | cut -d' ' -f13,14)

<#if useDhcp>

Please enter the following address into your browser (Chrome is recommended):

http://$IP

If you have an mDNS Client installed (Bonjour or avahi),
you can use the following address:

http://\n.local

<#else>
IP:                       $IP
</#if>

There should be no need to login to this console.

EOFEOFEOF

pkill -f "/sbin/getty.*tty[1-6]"

