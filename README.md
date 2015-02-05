#A sample project to demonstrate the usage of floto

##Configuration of an Host
First set the following parameters: 
```javascript
setDomain("sample.site");

var hostname = "sample-host";
var hostIp = "X.X.X.X";
var nameserver = hostIp;
var hypervisorType = "YYY";
var ovaUrl = "http://xyz.com/my.ova";
var networks = [];
var restPort = 2375;
```
The Hypervisortype can be "virtualbox", "vmware", or "esx".
The ovaUrl ist the File of the Virtualhost.

To define the Host you have to follow this structure:
```javascript
host(hostname, 
{
	name: hostname,
	ip: hostIp,
	vmConfiguration: {
		ovaUrl: ovaUrl,
		numberOfCores: 1,
		memoryInMB: 2048,
		hypervisor: {
			type: hypervisorType
		},
		networks: networks
	},
	postDeploy: function postDeploy(host) {
		...
	},
	reconfigure: function reconfigure(host, config) {
		...
	}
}
);
```
Here are the parameters of the host and the build methods defined. 
In postDeploy you can put all tasks the Host have to do while deployment.
###Define hostname in machine
```javascript
run("echo " + host.name + " > /etc/hostname ");
run("sudo start hostname ");
run("pkill -f \"/sbin/getty.*tty[1-6]\" || true");
run("sed -i 's/^127.0.1.1.*/127.0.1.1   " + host.name + "." + site.domainName + "   " + host.name + "/' /etc/hosts");
...
run("echo -e 'search " + site.domainName + "\n' > /etc/resolvconf/resolv.conf.d/base");	
run("resolvconf -u");
determineIp("hostname -I | cut -d ' ' -f2");
```

###Configure Interfaces
You need three interfaces for communication in your VM.
- eth0: for the internal network.
- eht1: for the communication with the host.
- eth2: for the communication with the internet.

```javascript
// Configure network
var interfaces = [
// internal network
	{
		name: "eth0",
		type: "static",
		address: host.ip,
		netmask: "255.255.255.0",
		nameserver: nameserver
	}					
];

if(hypervisorType != "virtualbox"){
	interfaces.push({
		name: "eth1",
		type: "dhcp"
	});
}else{
	interfaces.push({
		// network for communication with rest of the world	
		name: "eth2",
		type: "dhcp"
	});
	if(system != "windows"){
		// network for communication with vbox-host
		// Interface set in Java
		interfaces.push({
		// network for communication with vbox-host
		name: "eth1",
		type: "dhcp"
	});
	}			
	
}
addTemplate(__DIR__ + "templates/network-interfaces.txt", "/etc/network/interfaces", {
	interfaces: interfaces
});
run("ifdown eth0; ifup eth0");
if(hypervisorType != "virtualbox" && system != "windows"){
	run("ifdown eth1; ifup eth1"); 
}else{
	//Set automatically IP in JAVA 
	//Only with Windows and Virtualbox 
	setHostOnlyIpVBoxWin(hostname);
}	
if(hypervisorType == "virtualbox") {
	run("ifdown eth2; ifup eth2");
}
```
You can use for the interfaces eth1 and eth2 dhcp. The only exception is when you are using floto under windows with virtualbox.
Then you have to configure the interfaces like in the example. The configuration checks if the OS is Windwos and the Hypervisortype is virtualbox.
If so then the configuration of the interface run a method in the Back-End which create a ip address for the Host-Only-Network. 

###Create folders for volumes
One folder for each Image
```javascript
run("mkdir /usr/local/nginx");
run("mkdir /usr/local/nexus");
run("mkdir /usr/local/jenkins");
run("mkdir /usr/local/gitolite");
```

###Communication via SSH
When you want to communicate via ssh and you want to send the public-key from one container to an other you can make a mound-folder on the Host. Both containers monut to that folder and can exchange there their data. 
Host:
```javascript
run("mkdir /usr/local/common");
```
First Container:
```javascript
run("mkdir /root/common");
mount("/usr/local/common","/root/common");
```
Second Container:
```javascript
run("mkdir /root/common");
mount("/usr/local/common","/root/common");
```

###Restart Docker
```javascript
run("sudo service docker restart");
```
###Set Avahi
You can use Avahi to call Floto in the webbrowser with the Domainname which was set.
```javascript
run('echo "AVAHI_DAEMON_DETECT_LOCAL=0\nAVAHI_DAEMON_START=1\n" > /etc/default/avahi-daemon');
run('echo "\n[server]\nallow-interfaces=eth1\n" >> /etc/avahi/avahi-daemon.conf');
run('/etc/init.d/avahi-daemon restart');
```

###Bash Promt
```javascript
var domainPrompt = site.projectName || (site.domainName.replace("\.site$", "").toUpperCase());
run("echo 'export PS1=\"\\u@\\h [" + domainPrompt + "] :\\w\\n\\$ \"' >> /home/user/.bashrc");
```

###Docker logrotate
```javascript
var dockerLogrotate = "/etc/logrotate.d/docker";
addTemplate(__DIR__ + "templates/logrotate-docker", dockerLogrotate);
run("chown root:root " + dockerLogrotate);
```

###Format Disk if needed
```javascript
if (host.vmConfiguration.disks != null) {
	disks = _.cloneDeep(host.vmConfiguration.disks);
	disks.forEach(function (disk, index) {
		disk.deviceName = "/dev/sd" + String.fromCharCode(97 + 1 + index);
	});
	var partitionPath = "/tmp/partition.sh";
	addTemplate(__DIR__ + "templates/partition.sh", partitionPath, {disks: disks});
	run("chmod a+x " + partitionPath);
	run(partitionPath);
}
```

###Set Login-screen
```javascript
var updateIssuePath = "/etc/network/if-up.d/update-issue";
	addTemplate(__DIR__ + "templates/update-issue.sh", updateIssuePath, {
		domainName: site.domainName,
		useDhcp: true
	});

run("chmod a+x " + updateIssuePath);
run("MODE=start " + updateIssuePath);

```

###Reconfigure
In reconfigure you have to add the docker-script to your host and run it.
```javascript
addTemplate(__DIR__ + "templates/docker-reconfigure.sh", "/tmp/docker-reconfigure.sh", {httpProxy: config.httpProxy});
run("bash /tmp/docker-reconfigure.sh > /tmp/docker-reconfigure.log");
```

###For configuration there are following methods
|Method											| Meaning					|
|-----------------------------------------------|--------------------------:|
| run("command")								| Command in Commandline	|
| addTemplate("name","destination","config")	| Add Template to host 		|
| determineIp("")								| define a Ip				|


*****************************************************************************************************
##Configuration of an Image
An image has the following structure.
```javascript
image("imagename", {
	build: function() {
		...
	},
	prepare: function(config, container) {
		...
	},
	configure: function(config) {
		...
	}
});
```
to every image you can add an container
```javascript
container("containername", {
	image: "imagename",
	host: hostname
});
```
The imagename should give a hint about what kind of service the image provides. 
In the build-function you can add all commands which have to be in the dockerfile.
Of the commands in the build-function floto builds a dockerfile for the image. 
In the prepare-function you can add for example the link to the web-interface of this service.
```javascript
config.webUrl = "http://" + hostname + ".local" + "/imagename";
```
##Dockerfile Example

```javascript
from("dockerfile/ubuntu");

// Mount Data on Host-Volume
volume("/usr/local/nexus","/opt/nexus");

//Add User
//run("sudo useradd -d /home/nexus -m --password nexus nexus");

run("apt-get update");
run("apt-get install -y openjdk-7-jre-headless");
run("apt-get install -y wget");

run("mkdir -p opt/sonatype-nexus");
run("chmod 777 opt/sonatype-nexus");

run("mkdir -p opt/sonatype-work");		
run("chmod 777 opt/sonatype-work");

run("mkdir -p opt/sonatype-work/nexus");
run("chmod 777 opt/sonatype-work/nexus");

run("wget http://www.sonatype.org/downloads/nexus-latest-bundle.tar.gz ");
run("tar xvzf nexus-latest-bundle.tar.gz");
run("mv nexus-2.11.1-01/ opt/sonatype-nexus");

run("useradd --user-group --system --home-dir opt/sonatype-nexus nexus");
run("chown -R nexus:nexus opt/sonatype-work opt/sonatype-nexus opt/sonatype-work/nexus");

runAsUser("nexus");
env("RUN_AS_USER", "root");
expose("8081");
cmd("opt/sonatype-nexus/nexus-2.11.1-01/bin/nexus start");
```
Here we see an configuration of an image for nexus. The methods mean this:

|floto 										| Dockerfile|
|-------------------------------------------|----------:|
|from("baseimage")							| FROM 		|
|run("command")								| RUN 		|
|runAsUser("user")							| USER 		|
|env("key","value")							| ENV 		|
|expose("port")								| EXPOSE 	|
|workdir("dir")								| WORKDIR 	|
|cmd("command")								| CMD 		|
|volume("path", "name")						| VOLUME 	|
|mount("hostpath", "containerpath")			| MOUNT 	|
|addTemplate("name","destination","config")	| ADD 		|

###Add a Template
To add a template or a file to the Container you can usr the folloing function:
```javascript
addTemplate(__DIR__ + "templates/nginxreverse.conf", "/etc/nginx/sites-available/nginxreverse.conf", {hostname : hostname});
```
The first parameter is the file on the system you are running. The second parameter ist the path of the file which have to be in the container. The third parameter you can put variables if which are put in the template.
```bash
#Nginx Reverse Proxy Configuration for Floto-Example

server {
	listen 80;
	server_name ${hostname};
	access_log /var/www/sample-host/log/nginx.access.log;
 	error_log /var/www/sample-host/log/nginx_error.log debug;

	location ~/gitolite {
		proxy_pass              http://localhost:8082;
		proxy_pass http://hostname.local/gitolite;
	}

	location ~/jenkins {
		proxy_pass              http://localhost:8080;
		proxy_pass http://hostname.local/jenkins;
	}

	location ~/nexus {
		proxy_pass              http://localhost:8081;
		proxy_pass http://hostname.local/nexus;
	}

}
```
Here will be the server-name set to the parameter given in the addTemplate() function.

*****************************************************************************************************
##User-Overrides
To make your configuration portable you can add a override method where some parameters are changed.
```javascript
var userOverridesFile = __DIR__ + "user-overrides.js";
if(new java.io.File(userOverridesFile).exists()) {
    include(userOverridesFile);
}
```
in this file you can change this parameters
```javascript
hypervisorType = "virtualbox"
ovaUrl = "file:X:/your/file/path/to/floto/image.ova"
networks = ["VM Network", "DHCP"]
```
*****************************************************************************************************
##Example for an NGINX image
The configuration of NGINX in the floto-example looks like this:
```javascript
image("nginx", {
	build: function() {
		from("dockerfile/ubuntu");
		run("sudo apt-get update");
		run("sudo apt-get install -y nginx");
		run("sudo apt-get install -y curl");

		//Add User
		run("sudo useradd -d /home/nginx -m --password nginx nginx");

		// Mount Data on Host-Volume
		volume("/usr/local/nginx","/opt/nginx");

		// Change Config
		//  Put Config-File to Container
		run('cd /etc/nginx/sites-available/');
		run('touch reverse-proxy.conf');
		addTemplate(__DIR__ + "templates/nginxreverse.conf", "/etc/nginx/sites-available/nginxreverse.conf", {hostname : hostname});

		run('echo "\\ndaemon off;" >> /etc/nginx/nginx.conf');
		expose('80');

		cmd("nginx");
	},
	prepare: function(config, container) {
		config.webUrl = "http://" + hostname + ".local" + "/nginx";
	},
	configure: function(config) {
	}
});
container("nginx", {
	image: "nginx",
	host: hostname
});
```

*****************************************************************************************************
##Including configuration into floto
First you have to open Eclipse and make a new run configuration.
Set the main class to the "Floto-Server" class.
Put following in the Argumentes:
```
--dev
--root /path/to/your/floto-example/sample-vbox.js
``` 

when you run this configuration you can open floto in your webbrowser with http://localhost:40004/