const dns = require("dns");

dns.resolveSrv("_mongodb._tcp.cluster0.mwfvd.mongodb.net", (err, records) => {
  console.log("resolveSrv:");
  console.log(err);
  console.log(records);
});

dns.resolve4("google.com", (err, records) => {
  console.log("resolve4:");
  console.log(err);
  console.log(records);
});