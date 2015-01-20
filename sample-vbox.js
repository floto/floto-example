setDomain("sample.site");

var hostname = "sample-host";
var hostIp = "192.168.91.91";
var nameserver = hostIp;
var hypervisorType = "virtualbox";
var ovaUrl = "http://xyz.com/my.ova";
var networks = [];
var restPort = 2375;

//TODO: do a query for this
var system = "windows";

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

		// Change Config
		//TODO: It must be an Template in floto/server
		//  Put Config-File to Container
		run('cd /etc/nginx/sites-available/');
		run('touch reverse-proxy.conf');
		addTemplate(__DIR__ + "templates/nginxreverse.conf", "/etc/nginx/sites-available/nginxreverse.conf", {hostname : hostname});


		run('echo "\\ndaemon off;" >> /etc/nginx/nginx.conf');
		expose('80');
		// Mount Data on Host-Volume
		volume("/usr/local/nginx","/opt/nginx");

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

// ********************* nexus **********************
var imageName = "nexus"
image(imageName, {
	build: function() {		
		from("dockerfile/ubuntu");

		//Add User
		run("sudo useradd -d /home/nexus -m --password nexus nexus");

		run("apt-get update");
		run("apt-get install -y default-jre ");
		run("apt-get install -y wget");

		run("cd /usr/local");
		run("wget http://download.sonatype.com/nexus/oss/nexus-2.10.0-02-bundle.tar.gz ");
		run('tar xvzf nexus-2.10.0-02-bundle.tar.gz ');

		run("sudo ln -s nexus-2.10.0-02 nexus");
		run("sudo rm -rf sonatype-work/nexus");
		run("sudo ln -s nexus sonatype-work/nexus");

		volume("/nexus", "");

		expose("8081");

		env("CONTEXT_PATH", "/nexus");

		// Make Key-Pair for Jenkins-communication
		//run('ssh-keygen -t rsa -C "nexus@nexus" -f "nexus" -P "12345"');

		// Mount Data on Host-Volume
		volume("/usr/local/nexus","~/.");

		// run
		cmd("RUN_AS_USER=root NEXUS_CONTEXT_PATH=$CONTEXT_PATH /usr/local/nexus/bin/nexus console");

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

// ******************** jenkins *********************
image("jenkins", {
	build: function() {
		from("dockerfile/ubuntu");
		run("apt-get update");

		//Install Java
		run("sudo apt-get install -y openjdk-7-jre-headless");
		run("sudo mkdir /usr/java");
		run("sudo ln -s /usr/lib/jvm/java-7-openjdk-amd64 /usr/java/default");

		//Add User
		run("sudo useradd -d /home/jenkins -m --password jenkins jenkins");
		run('export JENKINS_HOME=~/.');

		//Change to home directory
		run("cd ~/.")

		//Install jenkins
		run("sudo wget http://mirrors.jenkins-ci.org/war/latest/jenkins.war");

		// create temp directory for plugins (may not needed)
		//run('sudo mkdir .jenkins');
		//run('cd .jenkins');
		var jenkins_tmp = "plugins";
		run("sudo mkdir " + jenkins_tmp);
		run("cd " + jenkins_tmp);
		// ************************** Plug-In's ***************************
		// ******************** always link to latest *********************
		// ************ load all Plug-In's in jenkins/plugins/ ************
		// Copy all plugins to temp-folder.
		// Condidtional-buildsteps Plugin
		run("wget https://updates.jenkins-ci.org/latest/configure-job-column-plugin.hpi");
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
		//Back to .jenkins
		run("cd ..");

		//for main webinterface
		expose("8080");

		// Create Buildjob 
		run('sudo mkdir jobs');
		run('cd jobs');
		run('sudo mkdir test-job');
		run('sudo chmod 777 test-job');
		run('cd test-job');
		//Copy Config file to container
		addTemplate(__DIR__ + "templates/jenkins-build-config.xml", "~/jobs/test-job/config.xml","");

		run('mkdir builds');
		run('cd builds');
		run('touch lastFailedBuild');
		run('touch lastStableBuild');
		run('touch lastSuccessfulBuild');
		run('touch lastUnstableBuild');
		run('touch lastUnsuccessfulBuild');
		//Back to root
		run('cd ');

		//Directory tmp cache for git needed by git-plugin
		run('mkdir git');

		//TODO: Make Key-Pair for Gitolite so Jenkins can pull and clone git-projects
		//run('ssh-keygen -t rsa -C "jenkins@jenkins" -f "jenkins" -P "12345"');
		//TODO: Add Public-Key from nexus to store successful builds
		//run('docker add /usr/local/nexus/nexus.pub ~/.ssh');

		// Mount data 
		volume("/usr/local/jenkins","~/.");

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

// **************** gitolite ************************
var imageName = "gitolite"
image(imageName, {
	build: function() {
		from("dockerfile/ubuntu");
		run("sudo apt-get update");
		run("sudo apt-get install -y git perl openssh-server");
		
		//Add User
		run("sudo useradd -d /home/gitolite -m --password gitolite gitolite");

		//Install gitolite
		run("sudo su - gitolite -c 'git clone git://github.com/sitaramc/gitolite'");
		run("sudo su - gitolite -c 'mkdir -p $HOME/bin && gitolite/install -to $HOME/bin'");

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

		// Sample Project
		run("sudo mkdir sample");
		run("cd sample"); 
		run("sudo git init");

		//TODO: Add Public-Key from Jenkins (key is on /usr/local/jenkins/id_rsa.pub | see jenkis config)
		//run('docker add /usr/local/jenkins/jenkins.pub ~/.ssh');

		expose("8082");
		// Mount Data on Host-Volume
		volume("/usr/local/gitolite","/opt/gitolite");

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
			run("echo " + host.name + " > /etc/hostname ");
			run("sudo start hostname ");
			run("pkill -f \"/sbin/getty.*tty[1-6]\" || true");
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

			//run("echo -e 'nameserver " + site.dns.ip + "\n' > /etc/resolvconf/resolv.conf.d/head");
			run("echo -e 'search " + site.domainName + "\n' > /etc/resolvconf/resolv.conf.d/base");			

			run("resolvconf -u");
			
			determineIp("hostname -I | cut -d ' ' -f2");
			
			// Restart docker so it uses our nameserver config
			run("sudo service docker restart");

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
			if(hypervisorType != "virtualbox") {
				determineIp("hostname -I | cut -d ' ' -f2");
			}

			// set new http proxy
			addTemplate(__DIR__ + "templates/docker-reconfigure.sh", "/tmp/docker-reconfigure.sh", {httpProxy: config.httpProxy});
			run("bash /tmp/docker-reconfigure.sh > /tmp/docker-reconfigure.log");
		}
	}
);