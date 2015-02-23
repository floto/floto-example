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
		// Put Config-File to Container
		run('cd /etc/nginx/sites-available/');
		run('touch reverse-proxy.conf');
		addTemplate(__DIR__ + "templates/nginxreverse.conf", "/etc/nginx/sites-available/nginxreverse.conf", 
			{hostname : hostname});

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

		run("mkdir -p opt/sonatype-nexus");
		run("chmod 777 opt/sonatype-nexus");

		run("mkdir -p opt/sonatype-work");		
		run("chmod 777 opt/sonatype-work");

		run("mkdir -p opt/sonatype-work/nexus");
		run("chmod 777 opt/sonatype-work/nexus");

		run("wget http://download.sonatype.com/nexus/oss/nexus-2.11.1-01-bundle.tar.gz");
		run("tar xvzf nexus-2.11.1-01-bundle.tar.gz");
		run("mv nexus-2.11.1-01/ opt/sonatype-nexus");

		run("useradd --user-group --system --home-dir /root/opt/sonatype-nexus nexus");
		run("chown -R nexus:nexus opt/sonatype-work /root/opt/sonatype-nexus /root/opt/sonatype-work/nexus");

		runAsUser("nexus");
		env("RUN_AS_USER", "root");
		expose("8081");

		// run Nexus	*/
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

		//istall ssh-server
		run("apt-get install -y openssh-server");
		//Install Java
		run("sudo apt-get install -y openjdk-7-jre-headless");
		run("sudo mkdir /usr/java");
		run("sudo ln -s /usr/lib/jvm/java-7-openjdk-amd64 /usr/java/default");
		//Install Curl
		run("apt-get install -y curl");

		// Mount data 
		run("mkdir volume");
		volume("/usr/local/jenkins","volume/");
		run("mkdir common");
		mount("/usr/local/common","/root/common");

		run("mkdir .jenkins");

		//add Private- & Public-Key
		run("ssh-keygen -f /root/.ssh/jenkins -t rsa -N ''");

		//Add User
		run("sudo useradd -d /home/jenkins -m --password jenkins jenkins");
		// Change JENKINS_HOME
		env("JENKINS_HOME", ".jenkins");
		//Install jenkins
		run("wget http://mirrors.jenkins-ci.org/war/latest/jenkins.war");

		// Directory for plugins
		run("mkdir .jenkins/plugins");
		run("chmod 777 .jenkins/plugins");

		// ************************** Plug-In's ***************************
		// ******************** always link to latest *********************
		// ************ load all Plug-In's in jenkins/plugins/ ************
		// Copy all plugins to wokdorectory of jenkins.
		// Condidtional-buildsteps Plugin
		run("wget https://updates.jenkins-ci.org/latest/configure-job-column-plugin.hpi");
		run("mv configure-job-column-plugin.hpi .jenkins/plugins/");
		// Git Client Plugin
		run("wget https://updates.jenkins-ci.org/latest/git-client.hpi");
		run("mv git-client.hpi .jenkins/plugins/");
		// Git Plugin
		run("wget https://updates.jenkins-ci.org/latest/git.hpi ");
		run("mv git.hpi .jenkins/plugins/");
		// Promoted Builds Plugin
		run("wget https://updates.jenkins-ci.org/latest/promoted-builds.hpi");
		run("mv promoted-builds.hpi .jenkins/plugins/");
		// Batch Task Plugin
		run("wget https://updates.jenkins-ci.org/latest/batch-task.hpi");
		run("mv batch-task.hpi .jenkins/plugins/");
		// Maven Plugin (Maven Intergration Plugin not Found)
		run("wget https://updates.jenkins-ci.org/latest/maven-plugin.hpi");
		run("mv maven-plugin.hpi  .jenkins/plugins/");
		// M2Release Cascade Plugin (Maven Release Plugin not found)
		run("wget https://updates.jenkins-ci.org/latest/m2release.hpi");
		run("mv m2release.hpi  .jenkins/plugins/");
		// Parameterrized Remote Trigger Plugin 
		run("wget https://updates.jenkins-ci.org/latest/Parameterized-Remote-Trigger.hpi");
		run("mv Parameterized-Remote-Trigger.hpi .jenkins/plugins/");
		// Run Condition Plugin
		run("wget https://updates.jenkins-ci.org/latest/run-condition.hpi");
		run("mv run-condition.hpi .jenkins/plugins/");
		// SCM API Plugin
		run("wget https://updates.jenkins-ci.org/latest/scm-api.hpi");
		run("mv scm-api.hpi .jenkins/plugins/");
		// Workspace Cleanup Plugin
		run("wget http://updates.jenkins-ci.org/latest/ws-cleanup.hpi");
		run("mv ws-cleanup.hpi .jenkins/plugins/");
		// Artifactory Plugin
		run("wget https://updates.jenkins-ci.org/latest/artifactory.hpi");
		run("mv artifactory.hpi .jenkins/plugins/");
		//Nexus Task Runner Plugin to connect nexus with jenkins
		run("wget https://updates.jenkins-ci.org/latest/nexus-task-runner.hpi");
		run("mv nexus-task-runner.hpi .jenkins/plugins/");

		//addn logindata from nexus
		addTemplate(__DIR__ + "templates/org.jenkinsci.plugins.nexus.NexusTaskPublisher.xml",
		 "/root/.jenkins/org.jenkinsci.plugins.nexus.NexusTaskPublisher.xml","");

		//for main webinterface
		expose("8080");

		// Create Buildjob 
		run("mkdir .jenkins/jobs");
		run("chmod 777 /root/.jenkins/jobs");
		run('mkdir .jenkins/jobs/test-job');
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
		run("mkdir -p .jenkins/users/sample");
		addTemplate(__DIR__ + "templates/jenkins-user-config.xml", "/root/.jenkins/users/sample/config.xml","");

		// run jenkins	
		var startJenkins = "/root/startJenkins";
		addTemplate(__DIR__ + "templates/startJenkins.sh", startJenkins, "");
		run("chmod 777 /root/startJenkins");

		//cmd(startJenkins);
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

// **************** gitolab *************************
var imageName = "gitlab"
image(imageName, {
	build: function() {
		from("dockerfile/ubuntu");

		/*
	 	 * Install Database
	 	 */
	 	 run("apt-get update");
	 	 run("apt-get install -y mysql-server");
	 	 run("apt-get install -y php5-mysql");
	 	 run("mysqladmin creategitlabhq_production")

		/*
		 * Install GitLab
		 */
		run("apt-key adv --keyserver keyserver.ubuntu.com --recv E1DF1F24" + 
			" && echo \"deb http://ppa.launchpad.net/git-core/ppa/ubuntu trusty main\" >> /etc/apt/sources.list" + 
			" && apt-key adv --keyserver keyserver.ubuntu.com --recv C3173AA6" + 
			" && echo \"deb http://ppa.launchpad.net/brightbox/ruby-ng/ubuntu trusty main\" >> /etc/apt/sources.list" + 
			" && apt-key adv --keyserver keyserver.ubuntu.com --recv C300EE8C" + 
			" && echo \"deb http://ppa.launchpad.net/nginx/stable/ubuntu trusty main\" >> /etc/apt/sources.list" + 
			" && wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - " + 
			" && echo 'deb http://apt.postgresql.org/pub/repos/apt/ trusty-pgdg main' > /etc/apt/sources.list.d/pgdg.list"); 
			
		run(" apt-get update" + 
			" && apt-get install -y supervisor logrotate locales" + 
			" nginx openssh-server mysql-client postgresql-client redis-tools" + 
			" git-core ruby2.1 python2.7 python-docutils" + 
			" libmysqlclient18 libpq5 zlib1g libyaml-0-2 libssl1.0.0" + 
			" libgdbm3 libreadline6 libncurses5 libffi6" + 
			" libxml2 libxslt1.1 libcurl3 libicu52");

		run(" update-locale LANG=C.UTF-8 LC_MESSAGES=POSIX" + 
			" && locale-gen en_US.UTF-8" + 
			" && dpkg-reconfigure locales");

		run(" gem install --no-document bundler" + 
			" && rm -rf /var/lib/apt/lists/* # 20150220"); 

		run("mkdir /app");
		copyDirectory(__DIR__+"templates/Gitlab/setup", "/app/", "");
		run("chmod 777 /app/setup/install");
		run("cd /app/setup/ && sh install");

		copyDirectory(__DIR__+"templates/Gitlab/config", "/app/setup/", "");

		copyDirectory(__DIR__+"templates/Gitlab/init-folder/", "/app/", "");
		run("mv /app/init-folder/init /app/init");
		run("rm -rf /app/init-folder");
		run("chmod 755 /app/init");
	
		expose("22");
		expose("80");
		expose("443");
		expose("8082");

		volume("/home/git/data");
		volume("/var/log/gitlab");

		/*
		 * Connection to Database is missing
		 */

		cmd("cd /app/ && sh init");
	},
	prepare: function(config, container) {
		config.webUrl = "http://" + hostname + ".local" + "/gitlab";
	},
	configure: function(config) {
	}
});
container("gitlab", { 
	image: "gitlab",
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
		run("apt-get install -y git");
		//istall ssh-server for communication
		run("apt-get install -y openssh-server");
		//Install Curl for jenkins trigger
		run("apt-get install -y curl");
		run("apt-get install -y perl");
		run("apt-get install -y gitolite");

		run("locale-gen en_US.UTF-8");
		run("dpkg-reconfigure locales");

		// Make folder for Mount Data on Host-Volume
		run("mkdir /root/volume");
		run("mkdir /root/common");
		volume("/usr/local/gitolite","/root/volume");
		//add Jenkins volume where publickey is
		volume("/usr/local/jenkins","/root/volume");
		mount("/usr/local/common","/root/common");
		
		//get Gitolite
		run("git clone git://github.com/sitaramc/gitolite");
		
		//Add User
		run("adduser --system --group --shell /bin/bash --disabled-password git");

		//Add keypair	
		run("ssh-keygen -f /root/.ssh/gitolite -t rsa -N ''");
		run("echo 'IdentityFile /root/.ssh/gitolite' >> /etc/ssh/ssh_config")
		run("echo 'Host gitbox' >> /root/.ssh/config");
		run("echo 'User root' >> /root/.ssh/config");
		run("echo 'Hostname 192.168.91.91' >> /root/.ssh/config");
		run("echo 'Port 22' >> /root/.ssh/config");
		run("echo 'IdentityFile /root/.ssh/gitolite' >> /root/.ssh/config");

		//Copy Public key to common for jenkins
		run("cp /root/.ssh/gitolite.pub /root/common");

		run("chown -R git:git /root/gitolite/");

		run("mkdir -p /root/gitolite/conf");
		//Add gitolite config
		addTemplate(__DIR__ + "templates/gitolite.conf", "/root/gitolite/conf/gitolite.conf", "");

		// Sample Project
		run("mkdir sample");
		run("git init /root/sample");

		//make install folder
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
//************************************************
// NOT IN USE
//************************************************
/*container("gitolite", {
	image: "gitolite",
	host: hostname
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
			run("echo " + host.name + " > /etc/hostname ");
			run("sudo start hostname ");
			run("pkill -f \"/sbin/getty.*tty[1-6]\" || true");
			run("sed -i 's/^127.0.1.1.*/127.0.1.1   " + host.name + "." + site.domainName + "   " + 
				host.name + "/' /etc/hosts");

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
			addTemplate(__DIR__ + "templates/docker-reconfigure.sh", "/tmp/docker-reconfigure.sh", 
				{httpProxy: config.httpProxy});
			run("bash /tmp/docker-reconfigure.sh > /tmp/docker-reconfigure.log");
		}
	}
);