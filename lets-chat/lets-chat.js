setDomain("lets-chat.site");

var hostname = "localhost";

var imageName = "lets-chat"

image("mongodb", {
	build: function() {
		from("mongo:3.0.0");
		cmd("mongod --rest --httpinterface");
	},
	prepare: function(config, container) {
	},
	configure: function(config) {
	}
});

container("mongodb", {
	image: "mongodb",
	host: hostname
});

image(imageName, {
	build: function() {
		from("node:0.10");
		download("https://github.com/sdelements/lets-chat/archive/0.3.8.tar.gz", "lets-chat.tar.gz");
		run("mkdir /lets-chat && tar -xzf lets-chat.tar.gz -C /lets-chat --strip-components=1");
		workdir("/lets-chat");
		run("npm install");
		cmd("npm start");
	},
	prepare: function(config, container) {
	},
	configure: function(config) {
		env("LCB_DATABASE_URI", "mongodb://localhost/letschat");
	}
});

container(imageName, {
	image: imageName,
	host: hostname
});
// **************************************************

host(hostname,
	{
		name: hostname,
		dockerUrl: "http://localhost:2375",
		vmConfiguration: {
			hypervisor: {
				type: "bare-metal"
			}
		}
	}
);