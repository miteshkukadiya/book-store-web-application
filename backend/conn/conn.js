const mongoose = require("mongoose");
require("dotenv").config();

const conn = async () => {
    try{
        await mongoose.connect(process.env.URI);
        console.log("MONGO URI =", process.env.URI);

        console.log("Connected to Database");
    }
    catch(error){
        console.log(error.message);
        console.log(error.name);
        console.log(error.message);
        console.log(error.stack);
    }
};

conn();
