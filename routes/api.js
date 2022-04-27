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
  var resultsToSend = { success: false, data: "Invalid Username or Password" };
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
      .findOne("Users", { userName: attemptingUser.userName }, false)
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

/* GET users listing. */
router.get("/register", async (req, res, next) => {
  var resultsToSend = { success: false, data: "Invalid Username or Password" };
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
      .findOne("Users", { userName: attemptingUser.userName }, false)
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
    // res.status(serverErrorCode).send(genericErrorMsg);
  }
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
    "python routes/test.py " + JSON.stringify(dict3),
    {},
    (err, result) => {
      // result = result.replaceAll("'", '"');
      let res = JSON.parse(result);
      console.log(result);
      console.log(res);
    }
  );
  res.send("All Good!");
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
router.get("/reportedBugs", function (req, res, next) {
  mongo
    .findAll("Bugs")
    .then(function (result) {
      res.send(result);
    })
    .catch(function (err) {
      res.send(err);
    });
});

/* INSERT bug to the database. */
router.get("/insertBug", function (req, res, next) {
  mongo
    .insertOne(
      {
        name: req.query.name,
        subject: req.query.subject,
        description: req.query.description,
        insertDate: req.query.insertDate,
      },
      "Bugs"
    )
    .then(function (result) {
      res.send(result);
    })
    .catch(function (err) {
      res.send(err);
    });
});

/* DELETE bug from the database. */
router.get("/deleteBugs", function (req, res, next) {
  mongo
    .deleteArr(req.query._id, "Bugs")
    .then(function () {
      mongo
        .findAll("Bugs")
        .then(function (result) {
          res.send(result);
        })
        .catch(function (err) {
          res.send(err);
        });
    })
    .catch(function (err) {
      res.send(err);
    });
});

/* GET To-DOs listing. */
router.get("/ToDoList", function (req, res, next) {
  mongo
    .findAll("ToDo")
    .then(function (result) {
      res.send(result);
    })
    .catch(function (err) {
      res.send(err);
    });
});

/* INSERT To-Do Item to the database. */
router.get("/insertToDo", function (req, res, next) {
  mongo
    .insertOne(
      {
        description: req.query.description,
        insertDate: req.query.insertDate,
      },
      "ToDo"
    )
    .then(function (result) {
      mongo
        .findAll("ToDo")
        .then(function (result) {
          res.send(result);
        })
        .catch(function (err) {
          res.send(err);
        });
    })
    .catch(function (err) {
      res.send(err);
    });
});

/* DELETE To-Do Item from the database. */
router.get("/deleteToDos", function (req, res, next) {
  mongo
    .deleteArr(req.query._id, "ToDo")
    .then(function () {
      mongo
        .findAll("ToDo")
        .then(function (result) {
          res.send(result);
        })
        .catch(function (err) {
          res.send(err);
        });
    })
    .catch(function (err) {
      res.send(err);
    });
});

module.exports = router;
