setDomain("sample.site");

var hostname = "sample-host";
var hostIp = "192.168.91.91";
var nameserver = hostIp;
var hypervisorType = "virtualbox";
var ovaUrl = "http://xyz.com/my.ova"
var networks = []

var userOverridesFile = __DIR__ + "user-overrides.js";
if(new java.io.File(userOverridesFile).exists()) {
    include(userOverridesFile);
}
	
// ****** nginx ***********************************

image("nginx", {
	build: function() {
		from("dockerfile/ubuntu");
		run("apt-get update");
		run("apt-get install -y nginx");
		run('echo "\\ndaemon off;" >> /etc/nginx/nginx.conf');
		cmd("nginx");
	},
	prepare: function(config, container) {
		config.webUrl = "http://" + hostname + ".local";
	},
	configure: function(config) {
	}
});

container("nginx", {
	image: "nginx",
	host: hostname
});

// **************************************************

// ****** jenkins ***********************************
/*
image("jenkins", {
	build: function() {
		from("dockerfile/ubuntu");
		//No root access
		run("apt-get install openjdk-7-jre-headless");
		run("wget http://mirrors.jenkins-ci.org/war/latest/jenkins.war");
		run("java -jar jenkins.war");
		
	},
	prepare: function(config, container) {
		config.webUrl = "http://" + hostname + ".local" + "/jenkins";
	},
	configure: function(config) {
	}
});

container("jenkins", {
	image: "jenkins",
	host: hostname
});
*/
// **************************************************

// ****** nexus *************************************
/*
var imageName = "nexus"
image(imageName, {
	build: function() {
		
	},
	prepare: function(config, container) {
	},
	configure: function(config) {
	}
});
*/
// **************************************************

// ****** gitolite **********************************
/*
var imageName = "gitolite"
image(imageName, {
	build: function() {
		
	},
	prepare: function(config, container) {
	},
	configure: function(config) {
	}
});
*/
// **************************************************


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
			// Set hostname
			run("echo " + host.name + " > /etc/hostname && sudo start hostname && (pkill -f \"/sbin/getty.*tty[1-6]\" || true) ");
			run("sed -i 's/^127.0.1.1.*/127.0.1.1   " + host.name + "." + site.domainName + "   " + host.name + "/' /etc/hosts")


			// Configure network
			var interfaces = [
			    // internal network
				{
					name: "eth0",
					type: "static",
					address: host.ip,
					netmask: "255.255.255.0",
					nameserver: nameserver
				},
				// network for communication with vbox-host
				{
					name: "eth1",
					type: "dhcp"
				},
				// network for communication with rest of the world
				
			];
			
			if(hypervisorType == "virtualbox") {
				interfaces.push({
					name: "eth2",
					type: "dhcp"
				});
			}
			
			addTemplate(__DIR__ + "templates/network-interfaces.txt", "/etc/network/interfaces", {
				interfaces: interfaces
			});
			//run("echo -e 'nameserver " + site.dns.ip + "\n' > /etc/resolvconf/resolv.conf.d/head");
			run("echo -e 'search " + site.domainName + "\n' > /etc/resolvconf/resolv.conf.d/base");

			run("ifdown eth0; ifup eth0");
			run("ifdown eth1; ifup eth1");
			
			if(hypervisorType == "virtualbox") {
				run("ifdown eth2; ifup eth2");
			}
			
			
			run("resolvconf -u");
			determineIp("hostname -I | cut -d ' ' -f 2");

			// Restart docker so it uses our nameserver config
			run("service docker restart");

			// MDNS/Zeroconf w/ avahi
			run('echo "AVAHI_DAEMON_DETECT_LOCAL=0\nAVAHI_DAEMON_START=1\n" > /etc/default/avahi-daemon');
			run('echo "\n[server]\nallow-interfaces=eth1\n" >> /etc/avahi/avahi-daemon.conf');
			run('/etc/init.d/avahi-daemon restart');

			// Bash Prompt
			var domainPrompt = site.projectName || (site.domainName.replace("\.site$", "").toUpperCase());
			run("echo 'export PS1=\"\\u@\\h [" + domainPrompt + "] :\\w\\n\\$ \"' >> /home/user/.bashrc");

			// Docker logrotate
			var dockerLogrotate = "/etc/logrotate.d/docker";
			addTemplate(__DIR__ + "templates/logrotate-docker", dockerLogrotate);
			run("chown root:root " + dockerLogrotate);

			// Data disk format(if needed) and mount
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
			
			// Login screen
			var updateIssuePath = "/etc/network/if-up.d/update-issue";
			addTemplate(__DIR__ + "templates/update-issue.sh", updateIssuePath, {
					domainName: site.domainName,
					useDhcp: true
				});

			run("chmod a+x " + updateIssuePath);
			run("MODE=start " + updateIssuePath);
		},
		reconfigure: function reconfigure(host, config) {
			determineIp("hostname -I | cut -d ' ' -f 2");

			// set new http proxy
			addTemplate(__DIR__ + "templates/docker-reconfigure.sh", "/tmp/docker-reconfigure.sh", {httpProxy: config.httpProxy});
			run("bash /tmp/docker-reconfigure.sh > /tmp/docker-reconfigure.log");
		}
	}
);