import mongoose from "mongoose";

const dbConnect = () => {
  mongoose.connect(process.env.MONGO_URI);

  mongoose.connection.on("connected", () => {
    console.log("Connected to Mongoose server");
  });

  mongoose.connection.on("error", (err) => {
    console.log(`Error connecting to Mongoose server: ${err.message}`);
  });

  mongoose.connection.on("disconnected", () => {
    console.log("Disconnected from Mongoose server");
  });
};

export default dbConnect;
