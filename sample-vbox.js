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
// **************************************************

// ********************* nexus **********************
var imageName = "nexus"
image(imageName, {
	build: function() {		
		from("dockerfile/ubuntu");

		// Mount Data on Host-Volume
		volume("/usr/local/nexus","/opt/nexus");

		//Add User
		//run("sudo useradd -d /home/nexus -m --password nexus nexus");

		run("apt-get update");
		run("apt-get install -y openjdk-7-jre-headless");
		run("apt-get install -y wget");

		run("mkdir -p /root/opt/sonatype-nexus");
		run("chmod 777 /root/opt/sonatype-nexus");

		run("mkdir -p /root/opt/sonatype-work");		
		run("chmod 777 /root/opt/sonatype-work");

		run("mkdir -p /root/opt/sonatype-work/nexus");
		run("chmod 777 /root/opt/sonatype-work/nexus");

		run("wget http://www.sonatype.org/downloads/nexus-latest-bundle.tar.gz ");
		run("tar xvzf nexus-latest-bundle.tar.gz");
		run("mv nexus-2.11.1-01/ /root/opt/sonatype-nexus");

		run("useradd --user-group --system --home-dir /root/opt/sonatype-nexus nexus");
		run("chown -R nexus:nexus /root/opt/sonatype-work /root/opt/sonatype-nexus /root/opt/sonatype-work/nexus");

		runAsUser("nexus");
		env("RUN_AS_USER", "root");
		expose("8081");

		// run Nexus	
		var startNexus = "/root/startNexus";
		addTemplate(__DIR__ + "templates/startNexus.sh", startNexus, "");
		run("chmod 777 /root/startNexus");
		cmd(startNexus);

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

		// Mount data 
		run("mkdir /root/volume");
		volume("/usr/local/jenkins","/root/volume/");
		run("mkdir /root/common");
		mount("/usr/local/common","/root/common");

		run("mkdir /root/.jenkins");

		//add Private- & Public-Key
		run("ssh-keygen -f /root/.ssh/jenkins -t rsa -N ''");

		//Install Java
		run("sudo apt-get install -y openjdk-7-jre-headless");
		run("sudo mkdir /usr/java");
		run("sudo ln -s /usr/lib/jvm/java-7-openjdk-amd64 /usr/java/default");

		//Add User
		run("sudo useradd -d /home/jenkins -m --password jenkins jenkins");
		// Change JENKINS_HOME
		env("JENKINS_HOME", "/root/.jenkins");
		//Install jenkins
		run("wget http://mirrors.jenkins-ci.org/war/latest/jenkins.war");

		// Directory for plugins
		run("mkdir /root/.jenkins/plugins");
		run("chmod 777 /root/.jenkins/plugins");

		// ************************** Plug-In's ***************************
		// ******************** always link to latest *********************
		// ************ load all Plug-In's in jenkins/plugins/ ************
		// Copy all plugins to wokdorectory of jenkins.
		// Condidtional-buildsteps Plugin
		run("wget https://updates.jenkins-ci.org/latest/configure-job-column-plugin.hpi  ");
		run("mv configure-job-column-plugin.hpi /root/.jenkins/plugins/");
		// Git Client Plugin
		run("wget https://updates.jenkins-ci.org/latest/git-client.hpi ");
		run("mv git-client.hpi /root/.jenkins/plugins/");
		// Git Plugin
		run("wget https://updates.jenkins-ci.org/latest/git.hpi ");
		run("mv git.hpi /root/.jenkins/plugins/");
		// Promoted Builds Plugin
		run("wget https://updates.jenkins-ci.org/latest/promoted-builds.hpi ");
		run("mv promoted-builds.hpi /root/.jenkins/plugins/");
		// Batch Task Plugin
		run("wget https://updates.jenkins-ci.org/latest/batch-task.hpi ");
		run("mv batch-task.hpi /root/.jenkins/plugins/");
		// Maven Plugin (Maven Intergration Plugin not Found)
		run("wget https://updates.jenkins-ci.org/latest/maven-plugin.hpi ");
		run("mv maven-plugin.hpi  /root/.jenkins/plugins/");
		// M2Release Cascade Plugin (Maven Release Plugin not found)
		run("wget https://updates.jenkins-ci.org/latest/m2release.hpi ");
		run("mv m2release.hpi  /root/.jenkins/plugins/");
		// Parameterrized Remote Trigger Plugin 
		run("wget https://updates.jenkins-ci.org/latest/Parameterized-Remote-Trigger.hpi ");
		run("mv Parameterized-Remote-Trigger.hpi /root/.jenkins/plugins/");
		// Run Condition Plugin
		run("wget https://updates.jenkins-ci.org/latest/run-condition.hpi ");
		run("mv run-condition.hpi /root/.jenkins/plugins/");
		// SCM API Plugin
		run("wget https://updates.jenkins-ci.org/latest/scm-api.hpi ");
		run("mv scm-api.hpi /root/.jenkins/plugins/");
		// Workspace Cleanup Plugin
		run("wget http://updates.jenkins-ci.org/latest/ws-cleanup.hpi ");
		run("mv ws-cleanup.hpi /root/.jenkins/plugins/");
		// Artifactory Plugin
		run("wget https://updates.jenkins-ci.org/latest/artifactory.hpi ");
		run("mv artifactory.hpi /root/.jenkins/plugins/");
		//Nexus Task Runner Plugin to connect nexus with jenkins
		run("wget https://updates.jenkins-ci.org/latest/nexus-task-runner.hpi");
		run("mv nexus-task-runner.hpi /root/.jenkins/plugins/");

		//addin logindata from nexus
		addTemplate(__DIR__ + "templates/org.jenkinsci.plugins.nexus.NexusTaskPublisher.xml", "/root/.jenkins/org.jenkinsci.plugins.nexus.NexusTaskPublisher.xml","");

		//for main webinterface
		expose("8080");

		// Create Buildjob 
		run("mkdir /root/.jenkins/jobs");
		run("chmod 777 /root/.jenkins/jobs");
		run('mkdir /root/.jenkins/jobs/test-job');
		run("chmod 777 /root/.jenkins/jobs/test-job");
		//Copy Config file to container
		addTemplate(__DIR__ + "templates/jenkins-build-config.xml", "/root/.jenkins/jobs/test-job/config.xml","");

		/*
		//My needed when actual project is in 
		run('mkdir /root/.jenkins/jobs/test-job/builds');
		run('chmod 777 /root/.jenkins/jobs/test-job/builds');
		run('touch /root/.jenkins/jobs/test-job/builds/lastFailedBuild');
		run('touch /root/.jenkins/jobs/test-job/builds/lastStableBuild');
		run('touch /root/.jenkins/jobs/test-job/builds/lastSuccessfulBuild');
		run('touch /root/.jenkins/jobs/test-job/builds/lastUnstableBuild');
		run('touch /root/.jenkins/jobs/test-job/builds/lastUnsuccessfulBuild');
		*/

		//Add user for Gitolite
		run("mkdir -p /root/.jenkins/users/sample");
		addTemplate(__DIR__ + "templates/jenkins-user-config.xml", "/root/.jenkins/users/sample/config.xml","");

		//Put git in hosts
		run("bash -c 'echo \"192.168.91.91   git.example.com git \" >> /etc/hosts' ");

		// run jenkins	
		var startJenkins = "/root/startJenkins";
		addTemplate(__DIR__ + "templates/startJenkins.sh", startJenkins, "");
		run("chmod 777 /root/startJenkins");
		cmd(startJenkins);

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
		run("apt-get update");
		//Install git
		run("apt-get install -y git-core");

		// Make folder for Mount Data on Host-Volume
		run("mkdir /root/volume");
		run("mkdir /root/common");
		volume("/usr/local/gitolite","/root/volume");
		//add Jenkins volume where publickey is
		volume("/usr/local/jenkins","/root/volume");
		mount("/usr/local/common","/root/common");
		
		//get Gitolite
		run("git clone git://github.com/sitaramc/gitolite");
		//Install Curl
		run("apt-get -y install curl");
		//Add User
		run("adduser --system --group --shell /bin/bash --disabled-password git");

		//istall ssh-server
		run("apt-get install openssh-server -y");
		//Add keypair	
		run("ssh-keygen -f /root/.ssh/gitolite -t rsa -N ''");
		run("echo 'IdentityFile /root/.ssh/gitolite' >> /etc/ssh/ssh_config")
		run("echo 'Host gitbox' >> /root/.ssh/config");
		run("echo 'User root' >> /root/.ssh/config");
		run("echo 'Hostname 192.168.91.91' >> /root/.ssh/config");
		run("echo 'Port 22' >> /root/.ssh/config");
		run("echo 'IdentityFile /root/.ssh/gitolite' >> /root/.ssh/config");

		run("chown -R git:git /root/gitolite/");

		run("mkdir -p /root/gitolite/conf");
		//Add gitolite config
		addTemplate(__DIR__ + "templates/gitolite.conf", "/root/gitolite/conf/gitolite.conf", "");

		// Sample Project
		run("mkdir sample");
		run("git init /root/sample");

		//make install filder
		run("mkdir /root/gitolite/bin");
		run("su - git");	
		expose("8082");
		//here put gitolite run script
		var startGitolite = "/root/startGitolite";
		addTemplate(__DIR__ + "templates/startGitolite.sh", startGitolite, "");
		run("chmod 777 /root/startGitolite");
		cmd(startGitolite);
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
			run("sed -i 's/^127.0.1.1.*/127.0.1.1   " + host.name + "." + site.domainName + "   " + host.name + "/' /etc/hosts");

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

			/*
			 * Create folders for volume data 
			 */
			run("mkdir /usr/local/nginx");
			run("mkdir /usr/local/nexus");
			run("mkdir /usr/local/jenkins");
			run("mkdir /usr/local/gitolite");
			run("mkdir /usr/local/common");

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