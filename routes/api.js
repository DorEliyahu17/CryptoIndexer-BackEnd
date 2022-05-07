var express = require("express");
var router = express.Router();
var mongo = require("../MongoDriver");
var bcrypt = require("bcrypt");
var shell = require("shelljs");

const okCode = 200;
const serverErrorCode = 500;

/***************** Access Control API *****************/

/* GET users listing. */
router.get("/login", async (req, res, next) => {
  var resultsToSend = {
    success: false,
    data: "Invalid Username or Password"
  };
  const attemptingUser = {
    userName: req.body.userName,
    password: req.body.password,
  };
  // const genericErrorMsg = 'Invalid Username or Password';
  console.log(
    "attemptingUser.userName=" +
    attemptingUser.userName +
    ", attemptingUser.password=" +
    attemptingUser.password
  );
  if (attemptingUser.userName != null && attemptingUser.password != null) {
    console.log(
      "attemptingUser.userName=" +
      attemptingUser.userName +
      ", attemptingUser.password=" +
      attemptingUser.password
    );
    await mongo
      .findOne("Users", {
        userName: attemptingUser.userName
      }, false)
      .then(async (result) => {
        if (result !== null) {
          const match = await bcrypt.compare(
            attemptingUser.password,
            result.password
          );
          if (match) {
            resultsToSend["success"] = true;
            resultsToSend["data"] = "login success";
            res.send(resultsToSend);
            // res.status(okCode).send(resultsToSend);
          }
        }
        // resultsToSend['data'] = genericErrorMsg;
        res.send(resultsToSend);
        // res.status(serverErrorCode).send(genericErrorMsg);
      })
      .catch((err) => {
        resultsToSend["data"] = err;
        res.send(resultsToSend);
        // res.status(serverErrorCode).send(err);
      });
  } else {
    res.send(resultsToSend);
    // res.status(serverErrorCode).send(resultsToSend);
  }
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

  console.log("attemptingUser.username=" + attemptingUser.username + ", attemptingUser.password=" + attemptingUser.password + ", attemptingUser.email=" + req.body.email);
  if (attemptingUser.username != null && attemptingUser.username != '' &&
    attemptingUser.password != null && attemptingUser.password.length > 1 &&
    attemptingUser.email != null && attemptingUser.email.indexOf('@') != -1) {
    await mongo.findOne("users", {
      username: attemptingUser.username
    }, false).then(async (result) => {
      if (result["success"] && result["data"].length > 0) {
        resultsToSend["data"] = "Username is already taken";
      }
    }).catch((err) => {
      resultsToSend["data"] = err;
      res.send(resultsToSend);
    });
    if (resultsToSend["data"] === '') {
      await mongo.findOne("users", {
        email: attemptingUser.email
      }, false).then(async (result) => {
        if (result["success"] && result["data"].length > 0) {
          resultsToSend["data"] = "User is already created for this Email";
        }
      }).catch((err) => {
        resultsToSend["data"] = err;
        res.send(resultsToSend);
      });
      if (resultsToSend["data"] === '') {
        const salt = await bcrypt.genSalt(10);
        const hashPass = await bcrypt.hash(attemptingUser.password, salt);
        console.log("attemptingUser.username=" + attemptingUser.username + ", attemptingUser.password=" + attemptingUser.password);
        console.log("salt=" + salt + ", hashPass=" + hashPass);
        attemptingUser.password = hashPass;
        attemptingUser.is_admin = false;
        mongo.insertOne(attemptingUser, "users").then((result) => {
          if (result["success"]) {
            resultsToSend["success"] = true;
            resultsToSend["data"] = 'User created successfully';
          } else {
            resultsToSend["data"] = result["error"];
          }
          res.send(resultsToSend);
        }).catch((err) => {
          resultsToSend["data"] = err;
          res.send(resultsToSend);
        })
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

/***************** Execute *****************/
//example to pas dict from js to python
// router.post("/create-new-index", (req, res, next) => {
router.get("/create-new-index", (req, res, next) => {
  let coinsArr = req.query.coins.split(";");
  let prcArr = req.query.prc.split(";");

  let dict3 = {};
  for (let i = 0; i < coinsArr.length; i++) {
    dict3[coinsArr[i]] = prcArr[i];
  }

  shell.exec(
    "python ../CryptoIndexer-Server/test2.py " + JSON.stringify(dict3), {},
    (err, result) => {
      // result = result.replaceAll("'", '"');
      let res = JSON.parse(result);
      console.log(result);
      console.log(res);
    }
  );
  res.send("All Good!");
});

router.get("/insert-one-example", (req, res, next) => {
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
  let symbolsArr = req.query.symbols.split(";");
  let weightsArr = req.query.weights.split(";");

  let dict = {};
  for (let i = 0; i < symbolsArr.length; i++)
    dict[symbolsArr[i]] = weightsArr[i];

  shell.exec(
    "python ../CryptoIndexer-Server/BacktestNewCustomIndex.py " + JSON.stringify(dict), {},
    (err, result) => {
      let res = JSON.parse(result);
      console.log(result);
      console.log(res);
    }
  );
  res.send("All Good!!!");
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
router.get("/insert-bug", function (req, res, next) {
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
router.get("/delete-bugs", function (req, res, next) {
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
router.get("/insert-todo", function (req, res, next) {
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
router.get("/delete-todos", function (req, res, next) {
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