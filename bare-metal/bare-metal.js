setDomain("bare-metal.site");

var hostname = "localhost";
var serverPort = 8080;

// ****** nginx ***********************************
var imageName = "nginx"

image(imageName, {
	build: function() {
		from("dockerfile/ubuntu");
		run("apt-get update");
		run("apt-get install -y nginx");
		cmd("nginx");
	},
	prepare: function(config, container) {
	},
	configure: function(config) {
		addTemplate(__DIR__+ "templates/nginx.conf", "/etc/nginx/nginx.conf", {serverPort: serverPort});
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