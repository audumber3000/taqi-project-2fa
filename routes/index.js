var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var nodemailer = require('nodemailer');
var middleware = require("../middleware");
var multer = require("multer");
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function(req, file, cb) {
  // accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};
var upload = multer({
  storage: storage,
  fileFilter: imageFilter
});

var cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: "dz36wt1bm",
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

// root route
router.get("/", function(req, res) {
  if (req.user) {
    return res.redirect("/campgrounds");
  } else {
    res.render("landing");
  }
});

router.get("/about", function(req, res) {
  res.render("about");
});

// show register form
router.get("/register", function(req, res) {
  if (req.user) {
    return res.redirect("/campgrounds");
  } else {
    res.render("register");
  }
});

// handle sign up logic
router.post("/register", upload.single("image"), function(req, res) {
  if (req.file === undefined) {
    var newUser = new User({
      username: req.body.username,
      email: req.body.email,
      phone: req.body.phone,
      fullName: req.body.fullName,
      image: "",
      imageId: ""
    });
    User.register(newUser, req.body.password, function(err, user) {
      if (err) {
        return res.render("register", {
          error: err.message
        });
      }
      passport.authenticate("local")(req, res, function() {
        res.redirect("/campgrounds");
      });
    });
  } else {
    cloudinary.v2.uploader.upload(
      req.file.path, {
        width: 400,
        height: 400,
        gravity: "center",
        crop: "scale"
      },
      function(err, result) {
        if (err) {
          req.flash("error", err.messsage);
          return res.redirect("back");
        }
        req.body.image = result.secure_url;
        req.body.imageId = result.public_id;
        var newUser = new User({
          username: req.body.username,
          email: req.body.email,
          phone: req.body.phone,
          fullName: req.body.fullName,
          image: req.body.image,
          imageId: req.body.imageId
        });
        User.register(newUser, req.body.password, function(err, user) {
          if (err) {
            return res.render("register", {
              error: err.message
            });
          }
          passport.authenticate("local")(req, res, function() {
            res.redirect("/campgrounds");
          });
        });
      }, {
        moderation: "webpurify"
      }
    );
  }
});

// show login form
router.get("/login", function(req, res) {
  if (req.user) {
    console.log(req.user)
    return res.redirect("/campgrounds");
  } else {
    res.render("login");
  }
});

//-----------handling SMS get and post logic
router.get("/sms", function(req, res) {
  OTP = (Math.floor(100000 + Math.random() * 900000)).toString();
  const accountSid = 'AC49b4e61f32d9704ed29243644ad53bce'; 
  const authToken = '8421517e6de9d140f516ad34fcec354e'; 
  const client = require('twilio')(accountSid, authToken); 
   
  client.messages 
        .create({ 
           body: 'Dear User, use this One Time Password '+OTP+ ' to log in to your account.' ,
           messagingServiceSid: 'MG7c5c5c99c80d1443f47be4d8715f3c48',      
           to: req.user.phone 
         }) 
        .then(message => console.log(message.sid)) 
        .done();
   
    console.log(OTP)
    res.render("TwoStepsAuth/sms",{OTP:OTP , username:req.user.username , phone:req.user.phone});
 
});



router.post("/sms" ,async function(req,res){
  actual_otp = req.body.otp1
  user_otp = req.body.O1+req.body.O2+req.body.O3+req.body.O4+req.body.O5+req.body.O6
  console.log(req.user.username)
  if(actual_otp === user_otp){
    console.log("verified !")
    await User.findOneAndUpdate({username:req.user.username},{
      phone_verified:"1"});
    req.flash("success", "Phone Verified successfully !");
    res.redirect("/email");
  }else{
    req.flash("error","Incorrect OTP ,please enter it again !")
    res.render("TwoStepsAuth/sms",{OTP:actual_otp , username:req.user.username , phone:req.user.phone});
  }
})

//--------handling EMail-----------
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'notification.education4ol@gmail.com',
    pass: 'nvejvzbxojipdjbv'
  }
});

router.get("/email", function(req, res) {
    OTP = (Math.floor(100000 + Math.random() * 900000)).toString();

    var mailOptions = {
      from: 'notification@gmail.com',
      to: req.user.email,
      subject: 'OTP for VacationCamp',
      text: 'Hi User'   +'\nThankyou for Using VacationCamp . \n\n OTP : ' + OTP  + '\n\nGood Luck ! with the Platform , we hope you have an smooth Experience. \n\n - Vacation Camp Team '
      // html:'<html> <body> <h1>Audumber chaudhari</h1> </body>   </html>'
    };

    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      }
      });

    console.log(OTP)
    res.render("TwoStepsAuth/email" , {OTP:OTP , username:req.user.username , email:req.user.email});

});

router.post("/email" ,async function(req,res){
  actual_otp = req.body.otp1
  user_otp = req.body.O1+req.body.O2+req.body.O3+req.body.O4+req.body.O5+req.body.O6
  console.log(req.user.username)

  if(actual_otp === user_otp){
    await User.findOneAndUpdate({username:req.user.username},{email_verififed:"1"});
    req.flash("success", "2-Factor authentication completed and Login Successfully !");
    res.redirect("/campgrounds");
  }else{
    req.flash("error","Incorrect OTP ,please enter it again !")
    res.render("TwoStepsAuth/email" , {OTP:actual_otp , username:req.user.username , email:req.user.email});

  }
})

// handle login logic
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/sms",
    failureRedirect: "/login",
    failureFlash: true
  }),
  function(req, res) {}
);

// logout route
router.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

// user profile
router.get("/users/:user_id", function(req, res) {
  User.findById(req.params.user_id, function(err, foundUser) {
    if (err || !foundUser) {
      req.flash("error", "This user doesn't exist");
      return res.render("error");
    }
    Campground.find()
      .where("author.id")
      .equals(foundUser._id)
      .exec(function(err, campgrounds) {
        if (err) {
          req.flash("error", "Something went wrong");
          res.render("error");
        }
        Comment.find()
          .where("author.id")
          .equals(foundUser._id)
          .exec(function(err, ratedCount) {
            if (err) {
              req.flash("error", "Something went wrong");
              res.render("error");
            }
            res.render("users/show", {
              user: foundUser,
              campgrounds: campgrounds,
              reviews: ratedCount
            });
          });
      });
  });
});

// edit profile
router.get(
  "/users/:user_id/edit",
  middleware.isLoggedIn,
  middleware.checkProfileOwnership,
  function(req, res) {
    res.render("users/edit", {
      user: req.user
    });
  }
);

// update profile
router.put(
  "/users/:user_id",
  upload.single("image"),
  middleware.checkProfileOwnership,
  function(req, res) {
    User.findById(req.params.user_id, async function(err, user) {
      if (err) {
        req.flash("error", err.message);
      } else {
        if (req.file) {
          try {
            await cloudinary.v2.uploader.destroy(user.imageId);
            var result = await cloudinary.v2.uploader.upload(req.file.path, {
              width: 400,
              height: 400,
              gravity: "center",
              crop: "scale"
            }, {
              moderation: "webpurify"
            });
            user.imageId = result.public_id;
            user.image = result.secure_url;
          } catch (err) {
            req.flash("error", err.message);
            return res.redirect("back");
          }
        }
        user.email = req.body.email;
        user.phone = req.body.phone;
        user.fullName = req.body.fullName;
        user.save();
        req.flash("success", "Updated your profile!");
        res.redirect("/users/" + req.params.user_id);
      }
    });
  }
);

// delete user
router.delete("/users/:user_id", middleware.checkProfileOwnership, function(
  req,
  res
) {
  User.findById(req.params.user_id, async function(err, user) {
    if (err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
    if (user.image === "") {
      user.remove();
      res.redirect("/");
    } else {
      try {
        await cloudinary.v2.uploader.destroy(user.imageId);
        user.remove();
        res.redirect("/");
      } catch (err) {
        if (err) {
          req.flash("error", err.message);
          return res.redirect("back");
        }
      }
    }
  });
});

module.exports = router;
