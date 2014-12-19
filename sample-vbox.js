setDomain("sample.site");

var hostname = "sample-host";
var hostIp = "192.168.91.91";
var nameserver = hostIp;
var hypervisorType = "virtualbox";
var ovaUrl = "http://xyz.com/my.ova"
var networks = []
var restPort = 2375;

var containersJson = [];

var userOverridesFile = __DIR__ + "user-overrides.js";
if(new java.io.File(userOverridesFile).exists()) {
    include(userOverridesFile);
}
	
// **************** nginx *************************
image("nginx", {
	build: function() {
		from("dockerfile/ubuntu");
		run("sudo apt-get update");
		run("sudo apt-get install -y nginx");
		run("sudo apt-get install -y curl");

		// TODO: Config:		
		// Configuration in extra file

		run('echo "\\ndaemon off;" >> /etc/nginx/nginx.conf');
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
// **************************************************

// **************** gitolite ************************
var imageName = "gitolite"
image(imageName, {
	build: function() {
		from("dockerfile/ubuntu");
		run("sudo apt-get update");
		run("sudo apt-get install -y git perl openssh-server");
		expose("8080");

		//Add User
		run("sudo useradd git -m");

		//Install gitolite
		run("sudo su - git -c 'git clone git://github.com/sitaramc/gitolite'");
		run("sudo su - git -c 'mkdir -p $HOME/bin && gitolite/install -to $HOME/bin'");

		//setup with build-in ssh key
		run("ssh-keygen -f admin -t rsa -N ''");
		// File can not be readed
		//run("sudo su - git -c '$HOME/bin/gitolite setup -pk /admin.pub'");

		// prevent the perl warning 
		run("sudo sed  -i 's/AcceptEnv/# \\0/' /etc/ssh/sshd_config");
		run("sudo sed -i 's/session\\s\\+required\\s\\+pam_loginuid.so/# \\0/' /etc/pam.d/sshd");

		run("mkdir /var/run/sshd");

		run("sudo touch start.sh /start.sh");
		run("sudo chmod a+x /start.sh");

		cmd("/start.sh");

		//Sample Project
		run("sudo mkdir sample");
		run("cd sample");
		run("sudo git init");

		// Mount Data on Host-Volume
		// TODO: Get id of container for right directory in host
		// No access because other domain
/*
		var xmlhttp = new XMLHttpRequest();
		var url = "http://192.168.18.128:2375/images/json";

		xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
			var myArr = JSON.parse(xmlhttp.responseText);
			myFunction(myArr);
			}
		}

		xmlhttp.open("GET", url, true);
		xmlhttp.send();


		//ID of Container in containertsJson
		var containerId = "";
		function e(){
			for(var key in xhr){
				for(var tag in key.RepoTags){
					if(tag == "gitolite"){
					containerId =  {key : "Id"};
					}
				}		
			}
		};	
		run("sudo docker run -d -P --name sample -v /var/lib/docker/aufs/mnt/"+ containerId + "/root/sample:/opt/" + imageName );
*/
		cmd("gitolite");
	},
	prepare: function(config, container) {
		config.webUrl = "http://" + hostname + ".local" + "/gitolite";
	},
	configure: function(config) {
	}
});
container("gitolite", {
	image: "gitolite",
	host: hostname
});
// **************************************************

// ******************** jenkins *********************
image("jenkins", {
	build: function() {
		from("dockerfile/ubuntu");
		run("apt-get update");
		expose("8082");

		//Install Java
		run("sudo apt-get install -y openjdk-7-jre-headless");
		run("sudo mkdir /usr/java");
		run("sudo ln -s /usr/lib/jvm/java-7-openjdk-amd64 /usr/java/default");

		//Install jenkins
		run("sudo wget http://mirrors.jenkins-ci.org/war/latest/jenkins.war");

		//Add User
		run("sudo useradd jenkins -m");

		// create temp directory for plugins
		var jenkins_tmp = "~/jenkins_tmp";
		run("mkdir " + jenkins_tmp);
		run("cd " + jenkins_tmp);
		// ************************** Plug-In's ***************************
		// ******************** always link to latest *********************
		// ************ load all Plug-In's in jenkins/plugins/ ************
		// Copy all plugins to temp-folder.
		// Condidtional-buildsteps Plugin
		run("wget -P /tmp https://updates.jenkins-ci.org/latest/configure-job-column-plugin.hpi");
		// Git Client Plugin
		run("wget https://updates.jenkins-ci.org/latest/git-client.hpi");
		// Git Plugin
		run("wget https://updates.jenkins-ci.org/latest/git.hpi");
		// Promoted Builds Plugin
		run("wget https://updates.jenkins-ci.org/latest/promoted-builds.hpi");
		// Batch Task Plugin
		run("wget https://updates.jenkins-ci.org/latest/batch-task.hpi");
		// Maven Plugin (Maven Intergration Plugin not Found)
		run("wget https://updates.jenkins-ci.org/latest/maven-plugin.hpi");
		// M2Release Cascade Plugin (Maven Release Plugin not found)
		run("wget https://updates.jenkins-ci.org/latest/m2release.hpi");
		// Parameterrized Remote Trigger Plugin 
		run("wget https://updates.jenkins-ci.org/latest/Parameterized-Remote-Trigger.hpi");
		// Run Condition Plugin
		run("wget https://updates.jenkins-ci.org/latest/run-condition.hpi");
		// SCM API Plugin
		run("wget https://updates.jenkins-ci.org/latest/scm-api.hpi");
		// Workspace Cleanup Plugin
		run("wget http://updates.jenkins-ci.org/latest/ws-cleanup.hpi");
		// Artifactory Plugin
		run("wget https://updates.jenkins-ci.org/latest/artifactory.hpi");
		run("cd ..");
		
		// TODO: Mount Data on Host-Volume look at gitolite

		// TODO: Create Buildjob (via Remote access API?)
		// how to get to jenkins page

		// run jenkins
		cmd("java -jar jenkins.war");
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
// **************************************************

// ********************* nexus **********************
var imageName = "nexus"
image(imageName, {
	build: function() {		
		from("dockerfile/ubuntu");
		run("apt-get update");
		expose("8081");
		// Start by creating new user and group, you will prompted do add additional info.
		run("adduser nexu");
		// change to work dir
		run("cd /tmp");
		// Then download fresh version of nexus. In my case v2.1.2
		run("wget www.sonatype.org/downloads/nexus-2.1.2-bundle.tar.gz");
		// Extract nexus-2.1.2 omly directory from archive. No need of extracting working dir.
		run("tar xzvf nexus-2.1.2-bundle.tar.gz nexus-2.1.2/");		 
		// Creating new symlink to avoit version in path.
		run("ln -s nexus-2.1.2/ nexus");

		// TODO: Configure
		// Configuration in extra file

		// TODO: Mount Data on Host-Volume look at gitolite

		cmd("nexus");

	},
	prepare: function(config, container) {
		config.webUrl = "http://" + hostname + ".local" + "/nexus";
	},
	configure: function(config) {
	}
});
container("nexus", {
	image: "nexus",
	host: hostname
});
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