const express = require("express");
const router = express.Router();
const mongo = require("../MongoDriver");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
// const shell = require("shelljs");
const { spawn } = require("child_process");
const authenticate = require('../utils/auth_middleware')

const okCode = 200;
const serverErrorCode = 500;


router.post("/test", async (req, res, next) => {
  //test insertOne
  // let result = await mongo.insertOne('users', {
  //   name: 'aa'
  // });

  //test insertArr
  // let result = await mongo.insertArr('users', [{
  //   name: 'aa'
  // }, {
  //   name: 'bb'
  // }]);

  //test deleteOne
  // let result = await mongo.deleteOne('users', {
  //   name: 'aa'
  // });

  //test deleteArr
  let result = await mongo.deleteArr('users', [{
    name: 'aa'
  },
  {
    name: 'bb'
  }]);


  //test findOne
  // let result = await mongo.findOne('users', {
  //   name: 'aa'
  // });

  //test findAll
  // let result = await mongo.findAll('users');

  //test findAll with object
  // let result = await mongo.findAll('users', {
  //   name: 'aa'
  // });

  res.send(result);
})








/***************** Authentication Test API *****************/
router.post("/au-test", authenticate, async (req, res, next) => {
  res.send('All Good!');
});

/***************** Access Control API *****************/

/* POST users listing. */
router.post("/login", async (req, res, next) => {
  let resultsToSend = {
    success: false,
    data: ""
  };
  let attemptingUser = {
    username: req.body.userName,
    password: req.body.password,
    email: req.body.email
  };
  if (attemptingUser.username != null && attemptingUser.username != '' &&
    attemptingUser.password != null && attemptingUser.password.length > 1) {
    let result = await mongo.findOne('users', { username: attemptingUser.username });
    if (result["success"] && result["data"] != null) {
      const user = result["data"];
      const match = await bcrypt.compare(attemptingUser.password, user.password);
      if (match) {
        const accessToken = await jwt.sign({ 'id': user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.JWT_TOKEN_EXPIRATION });
        resultsToSend["success"] = true;
        resultsToSend["data"] = "login success";
        resultsToSend["token"] = accessToken;
        res.send(resultsToSend);
      } else {
        resultsToSend["data"] = "Invalid username or password";
        res.send(resultsToSend);
      }
    }
  } else {
    resultsToSend["data"] = "Invalid username or password";
    res.send(resultsToSend);
  }
  // res.status((result["success"]) ? okCode : serverErrorCode).send(resultsToSend);
});

/* POST register new user. */
router.post("/register", async (req, res, next) => {
  let resultsToSend = {
    success: false,
    data: ""
  };
  let attemptingUser = {
    username: req.body.userName,
    password: req.body.password,
    email: req.body.email
  };
  if (attemptingUser.username != null && attemptingUser.username != '' &&
    attemptingUser.password != null && attemptingUser.password.length > 1 &&
    attemptingUser.email != null && attemptingUser.email.indexOf('@') != -1) {
    let usernameResult = await mongo.findOne('users', { username: attemptingUser.username });
    if (usernameResult["success"] && usernameResult["data"] != null) {
      resultsToSend["data"] = "Username is already taken";
    }
    if (resultsToSend["data"] === '') {
      let emailResult = await mongo.findOne('users', { email: attemptingUser.email });
      if (emailResult["success"] && emailResult["data"] != null) {
        resultsToSend["data"] = "User is already created for this Email";
      }
      if (resultsToSend["data"] === '') {
        const salt = await bcrypt.genSalt(10);
        const hashPass = await bcrypt.hash(attemptingUser.password, salt);
        attemptingUser.password = hashPass;
        attemptingUser.is_admin = false;
        let result = await mongo.insertOne('users', attemptingUser);
        if (result["success"] && result["data"] === "inserted successfully.") {
          resultsToSend["success"] = true;
          resultsToSend["data"] = 'User created successfully';
        } else {
          resultsToSend["data"] = result["data"];
        }
        res.send(resultsToSend);
      } else {
        res.send(resultsToSend);
      }
    } else {
      res.send(resultsToSend);
    }
  } else {
    resultsToSend["data"] = "Invalid username or password";
    res.send(resultsToSend);
  }
  // res.status((result["success"]) ? okCode : serverErrorCode).send(resultsToSend);
});

/* DELETE users from the database. */
router.post("/delete-users", (req, res, next) => {
  // let resultsToSend = {
  //   success: false,
  //   data: ""
  // };
  mongo.deleteArr(req.query.usersToDelete, "users").then((result) => {
    // if (result["success"]) {
    // resultsToSend["success"] = true;
    // resultsToSend["data"] = result.data;
    // res.send(resultsToSend);
    // }
    res.send(result);
  }).catch((err) => {
    res.send(err);
  });
});

/* GET all of the users from the database. */
router.get("/users-list", async (req, res, next) => {
  let result = await mongo.findAll('users');
  res.send(result);
});

/***************** Execute *****************/
//example to pas dict from js to python
router.post("/create-new-index", (req, res, next) => {
  let data = req.body.data;
  console.log(data);
  let message = null;
  let python = spawn("python", ["../CryptoIndexer-Server/test2.py", data]);
  //python.stdout.on("data", (data) => message = JSON.parse(data) );
  python.on("close", (code) => res.send(message));


  // let coinsArr = req.query.coins.split(";");
  // let prcArr = req.query.prc.split(";");
  // let dict3 = {};
  // for (let i = 0; i < coinsArr.length; i++) {
    // dict3[coinsArr[i]] = prcArr[i];
  // }
  
  // shell.exec(
  //   "python ../CryptoIndexer-Server/test2.py " + JSON.stringify(dict3),
  //   {},
  //   (err, result) => {
  //     let res = JSON.parse(result);
  //     console.log(result);
  //     console.log(res);
  //   }
  // );
  // let message = null;
  // let python = spawn("python", ["../CryptoIndexer-Server/test2.py", JSON.stringify(dict3)]);
  // //python.stdout.on("data", (data) => message = JSON.parse(data) );
  // python.on("close", (code) => res.send(message));
});

router.post("/insert-one-example", (req, res, next) => {
  //test user
  let toInsert = {
    is_admin: true,
    username: "aa",
    password: "Aa123456",
    email: "aa@aa.com",
  };

  //test admin user
  // let toInsert = {
  //   is_admin: true,
  //   username: "aa",
  //   password: "Aa123456",
  //   email: "aa@aa.com",
  // };

  //test user
  // let toInsert = {
  //   name: "binance",
  //   api_url: "aa",
  //   password: "Aa123456",
  //   email: "aa@aa.com",
  // };

  //test user
  // let toInsert = {
  //   is_admin: true,
  //   username: "aa",
  //   password: "Aa123456",
  //   email: "aa@aa.com",
  // };

  //test user
  // let toInsert = {
  //   is_admin: true,
  //   username: "aa",
  //   password: "Aa123456",
  //   email: "aa@aa.com",
  // };

  //test wallet
  // let toInsert = {
  //   user_id: "626d7348d762cf58d0808261",
  //   broker_id: "",
  //   api_token: "",
  //   secret_key: "",
  // };
  let collectionToInsert = "users";
  // let collectionToInsert = "bugs";
  // let collectionToInsert = "todos";
  // let collectionToInsert = "supported_brokers";
  // let collectionToInsert = "wallets";
  // let collectionToInsert = "user_invested_index";
  // let collectionToInsert = "symbols";
  let isCommunity = false;
  // let isCommunity = true;
  mongo.insertOne(toInsert, collectionToInsert, isCommunity);
  res.send(
    "inserted " +
    JSON.stringify(toInsert) +
    " to collection " +
    collectionToInsert +
    " to Community? " +
    isCommunity
  );
});

router.get("/backtest-new-index", (req, res, next) => {
  let data = JSON.parse(req.query.data);
  if (data) {
    let python = spawn('python', ['../CryptoIndexer-Server/BacktestNewCustomIndex.py', JSON.stringify(data)]);
    let backtestResult = null;
    python.stdout.on("data", (data) => { 
     backtestResult = JSON.parse(data); 
    });
    python.on("close", (code) => {
      console.log('Python finished with code ' + code);
      res.send(backtestResult);
    });
  } else {
    res.send({ "success": False, "data": '' })
  }
});

/***************** DataBase Utills API *****************/
router.get("/supported-symbols-list", async (req, res, next) => {
  let result = await mongo.findAll('symbols');
  res.send(result)
});





/***************** Home Page API *****************/

router.get("/popular-indexes-list", async (req, res, next) => {
  //test findAll
  // let result = await mongo.findAll('users');

  //test findAll with object
  // let result = await mongo.findAll('users', {
  //   name: 'aa'
  // });

  res.send(result);
})

router.get("/most-successful-users-list", async (req, res, next) => {
  //todo: find the most successful users
  let result = await mongo.findAll('users');
  res.send(result)
});

router.get("/own-indexes", (req, res, next) => {
  let data = JSON.parse(req.query.data);
  if (data) {
    let result = await mongo.find('users',{name: data});
    res.send(result)
  }
});



/***************** Admin Page API *****************/

/* GET admins name and password listing. */
router.get("/admins", function (req, res, next) {
  mongo
    .findAdmin(req.query.userName, req.query.password)
    .then(function (result) {
      res.send(result);
    })
    .catch(function (err) {
      res.send(err);
    });
});

/* GET Bugs listing. */
router.get("/reported-bugs", function (req, res, next) {
  mongo
    .findAll("bugs")
    .then(function (result) {
      res.send(result);
    })
    .catch(function (err) {
      res.send(err);
    });
});

/* INSERT bug to the database. */
router.post("/insert-bug", function (req, res, next) {
  mongo.insertOne({
      name: req.query.name,
      subject: req.query.subject,
      description: req.query.description,
      insertDate: req.query.insertDate,
    },
    "bugs"
  ).then(function (result) {
    res.send(result);
  }).catch(function (err) {
    res.send(err);
  });
});

/* DELETE bug from the database. */
router.post("/delete-bugs", function (req, res, next) {
  mongo.deleteArr(req.query._id, "bugs").then(function () {
    mongo.findAll("bugs").then(function (result) {
      res.send(result);
    }).catch(function (err) {
      res.send(err);
    });
  }).catch(function (err) {
    res.send(err);
  });
});

/* GET To-DOs listing. */
router.get("/todo-list", function (req, res, next) {
  mongo.findAll("ToDo").then(function (result) {
    res.send(result);
  }).catch(function (err) {
    res.send(err);
  });
});

/* INSERT To-Do Item to the database. */
router.post("/insert-todo", function (req, res, next) {
  mongo.insertOne({
      description: req.query.description,
      insertDate: req.query.insertDate,
    },
    "ToDo"
  ).then(function (result) {
    mongo.findAll("ToDo").then(function (result) {
      res.send(result);
    }).catch(function (err) {
      res.send(err);
    });
  }).catch(function (err) {
    res.send(err);
  });
});

/* DELETE To-Do Item from the database. */
router.post("/delete-todos", function (req, res, next) {
  mongo.deleteArr(req.query._id, "ToDo").then(function () {
    mongo.findAll("ToDo").then(function (result) {
      res.send(result);
    }).catch(function (err) {
      res.send(err);
    });
  }).catch(function (err) {
    res.send(err);
  });
});

module.exports = router;