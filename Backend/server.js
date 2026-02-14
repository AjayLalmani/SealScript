require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");

const dbUrl = process.env.MONGO_URL;
mongoose
  .connect(dbUrl)
  .then(() => console.log("Db Connected Successfully"))
  .catch((e) => console.log("DB connect Error : ", e));

app.use(cors());
app.use(express.json());

const Port = process.env.PORT || 5000;

app.use("/api/auth", require("./routes/auth"));
app.use("/api/docs", require("./routes/file"));


app.listen(Port, () => {
  console.log(`listening at ${Port}`);
});
