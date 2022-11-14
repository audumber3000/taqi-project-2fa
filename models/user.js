var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  phone: String,
  phone_verified: {type:String, default:"0"},
  email_verified: {type:String, default:"0"},
  fullName: String,
  image: String,
  imageId: String,
  joined: { type: Date, default: Date.now }
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);
