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
		run("apt-get update");

		//add user
		run("adduser --disabled-login --gecos 'git' git");
		// Install the required packages to compile Ruby and native extensions to Ruby gems
		run("apt-get install -y" + 
			" build-essential cmake zlib1g-dev libyaml-dev");
		run("apt-get install -y libssl-dev libgdbm-dev libreadline-dev libncurses5-dev");
		run("apt-get install -y libffi-dev curl openssh-server redis-server checkinstall libxml2-dev");
		run("apt-get install -y libxslt-dev libcurl4-openssl-dev libicu-dev logrotate");
		//install git
		run("apt-get install git");

		//install ruby
		run("apt-get remove ruby");
		run("mkdir -p /root/tmp/ruby ");
		run("wget http://ftp.ruby-lang.org/pub/ruby/2.1/ruby-2.1.2.tar.gz ")
		run("mv ruby-2.1.2.tar.gz /root/tmp/ruby");
		run("tar xvzf /root/tmp/ruby/ruby-2.1.2.tar.gz");
		run("./ruby-2.1.2/./configure --disable-install-rdoc --prefix=/usr/local");
		run("make");
		run("make install");
		//check ruby version
		run("ruby -v");

		//Setup PostgreSQL Database for GitLab
		expose("5432");
		run("apt-get update -y"),
		run("apt-get upgrade -y");
		run("apt-get install build-essential -y");
		run("apt-get install libreadline-dev zlib1g-dev flex bison libxml2-dev libfl-dev libxslt1-dev" + 
			" libssl-dev libfl-dev python2.7-dev python-dev libpam-dev tcl-dev libperl-dev git -y");
		run("git clone git://git.postgresql.org/git/postgresql.git");
		run("cd postgresql && git checkout REL9_3_1");
		run("cd postgresql && ./configure --with-tcl --with-perl --with-python --with-pam --with-openssl" +
			" --with-libxml --with-libxslt --mandir=/usr/local/share/postgresql/man --docdir=/usr/local/share/doc/postg" +
			"resql-doc --sysconfdir=/etc/postgresql-common --datarootdir=/usr/local/share --datadir=/usr/local/share/" +
			"postgresql --bindir=/usr/local/lib/postgresql/bin --libdir=/usr/local/lib --libexecdir=/usr/local/lib/" +
			"postgresql --includedir=/usr/local/include/postgresql --with-pgport=5432  --enable-integer-datetimes" +
			" --enable-thread-safety --enable-debug --disable-rpath --with-system-tzdata=/usr/share/zoneinfo");
		run("cd postgresql && make");
		run("cd postgresql && make install");
		run("cd postgresql/contrib make all");
		run("cd postgresql/contrib make install");
		run("cp postgresql/contrib/start-scripts/linux /etc/init.d/postgresql ");
		run("sed -i 's,/usr/local/pgsql/data,/var/lib/postgresql/data,g' /etc/init.d/postgresql");
		run("sed -i 's,/usr/local/pgsql,/usr/local/lib/postgresql,g' /etc/init.d/postgresql");
		
		run("chmod +x /etc/init.d/postgresql");
		run("update-rc.d postgresql defaults");
		run("echo 'PATH=$PATH:/usr/local/lib/postgresql/bin; export PATH' > /etc/profile.d/postgresql.sh");
		run("echo 'MANPATH=$MANPATH:/usr/local/postgresql/man; export MANPATH' >> /etc/profile.d/pgmanual.sh");
		run("chmod 775 /etc/profile.d/postgresql.sh");
		run("chmod 775 /etc/profile.d/pgmanual.sh");
		run(". /etc/profile");
		run("adduser postgres --disabled-password --gecos '' ");
		run("mkdir -p /var/log/postgresql");
		run("chown -R postgres:postgres /var/log/postgresql");

		run("mkdir -p /var/lib/postgresql/data");
		run("chown -R postgres:postgres /var/lib/postgresql/data");
		run("/sbin/ldconfig /usr/local/lib/postgresql");
		run("su - postgres -c \"/usr/local/lib/postgresql/bin/initdb -D /var/lib/postgresql/data\"");
		run("echo \"CREATE USER git WITH SUPERUSER PASSWORD 'git';\"");
		run("echo \"CREATE DATABASE gitlabhq_production OWNER git\"");
		//run("sudo -u postgres /usr/local/lib/postgresql/bin/postgres --single -D /var/lib/postgresql/data" + 
		//	" -c config_file=/var/lib/postgresql/data/postgresql.conf");
		
		run("echo \"host    all     all   0.0.0.0/0     trust\" >> /var/lib/postgresql/data/pg_hba.conf");
		run("echo \"listen_addresses='*'\" >> /var/lib/postgresql/data/postgresql.conf");

		//Install GitLab
		run("cd /home/git && git clone https://gitlab.com/gitlab-org/gitlab-ce.git -b 6-9-stable gitlab");
		run("cp /home/git/gitlab/config/gitlab.yml.example /home/git/gitlab/config/gitlab.yml");
		//Make sure GitLab can write to the log/ and tmp/ directories
		run("cd /home/git/gitlab/ && sudo chown -R git log/");
		run("cd /home/git/gitlab/ && sudo chown -R git tmp/");
		run("cd /home/git/gitlab/ && sudo chmod -R u+rwX log");
		run("cd /home/git/gitlab/ && sudo chmod -R u+rwX tmp");
		run("cd /home/git/gitlab/ && sudo chmod -R u+rwX tmp/pids");
		run("cd /home/git/gitlab/ && sudo chmod -R u+rwX tmp/sockets");
		run("cd /home/git/gitlab/ && sudo chmod -R u+rwX public/uploads");

		//Create directory for satellites
		run("mkdir /home/git/gitlab-satellites");
		run("sudo chmod u+rwx,g+rx,o-rwx /home/git/gitlab-satellites");
		//Create the Unicorn, Rack attack, and PostgreSQL configuration files
		run("cd /home/git/gitlab/ && cp config/unicorn.rb.example config/unicorn.rb");
		run("cd /home/git/gitlab/ && cp config/initializers/rack_attack.rb.example config/initializers/rack_attack.rb");
		run("cd /home/git/gitlab/ && cp config/database.yml.postgresql config/database.yml");
		
		//Install the gems
		run("sudo apt-get install -y libpq-dev");
		run("sudo gem install pg -v '0.15.1'");

		run("sudo gem install bundler");
		run("cd /home/git/gitlab && bundle install --deployment --without development test mysql aws");
		expose("6379");
		run("wget https://downloads-packages.s3.amazonaws.com/ubuntu-14.04/gitlab_7.7.2-omnibus.5.4.2.ci-1_amd64.deb");
		run("sudo dpkg -i gitlab_7.7.2-omnibus.5.4.2.ci-1_amd64.deb");

		/*
		ERROR WITH CONNECTION TO THE SERVER: 
			could not connect to server: No such file or directory
			Is the server running locally and accepting
			connections on Unix domain socket "/tmp/.s.PGSQL.5432"?
		*/
		//run("cd /home/git/gitlab && bundle exec rake gitlab:shell:install[v1.9.4]" +
		//	" REDIS_URL=redis://localhost:6379 RAILS_ENV=production");
		//Initialize database and activate advanced features
		/*run("cd /home/git/gitlab &&  bundle exec rake gitlab:setup RAILS_ENV=production -y");
		run("cp /home/git/gitlab/lib/support/init.d/gitlab /etc/init.d/gitlab");
		run("sudo update-rc.d gitlab defaults 21");
		run("sudo cp lib/support/logrotate/gitlab /etc/logrotate.d/gitlab");
		run("bundle exec rake gitlab:env:info RAILS_ENV=production");
		run("bundle exec rake assets:precompile RAILS_ENV=production");
		//*/

		//Configure Git global settings for the git user:
		run("git config --global user.name \"GitLab\"");
		run("git config --global user.email \"gitlab@example.com\"");
		run("git config --global core.autocrlf input");

		//Make a sample Porject to pull in Jenkins
		run("mkdir sampleproject");
		run("cd sampleproject && git init");
		
		expose("8082");
		cmd("gitlab-ctl reconfigure");
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