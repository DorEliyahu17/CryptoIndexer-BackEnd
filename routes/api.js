const express = require("express");
const router = express.Router();
const mongo = require("../MongoDriver");
const { ObjectID, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
const { spawn } = require("child_process");
const authenticate = require('../utils/auth_middleware')
const { createHash } = require('crypto');

const okCode = 200;
const clientReqHasProblem = 400;
const serverErrorCode = 500;
const pythonCommand = process.env.NODE_ENV === "development" ? 'python' : 'python3';

function costumeHash(string) {
  return createHash('sha256').update(string).digest('hex');
}

async function decriptUserFromToken(userToken) {
  let decodedUserData = await jwt.decode(userToken);
  delete decodedUserData.iat;
  delete decodedUserData.exp;
  return decodedUserData;
}

async function createUserToken(user) {
  const accessToken = await jwt.sign({ 'id': user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.JWT_TOKEN_EXPIRATION });
  return accessToken;
}

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
  // let result = await mongo.deleteArr('users', [{
  //   name: 'aa'
  // },
  // {
  //   name: 'bb'
  // }]);


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

  //test UpdateOne
  let result = await mongo.updateOne('users', { username: 'aaa' }, { username: 'aa' });

  res.send(result);
});

router.get("/test2", async (req, res, next) => {
  let user = await mongo.findOne('users', { username: 'admin' }, includeId=true);
  // console.log(user.data.result);
  let userToken = await jwt.sign({ 'id': user.data.result._id, 'username': user.data.result.username }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.JWT_TOKEN_EXPIRATION })
  // console.log(userToken);
  let result = await decriptUserFromToken(userToken);
  // console.log(result);
  let findTest = await mongo.findOne('users', { _id: user.data.result._id }, includeId=true);
  console.log(findTest.data.result);
  res.send(result);
});






/***************** Authentication Test API *****************/
router.post("/au-test", authenticate, async (req, res, next) => {
  res.send('All Good!');
});

/***************** Access Control API *****************/

/* POST users listing. */
router.post("/login", async (req, res, next) => {
  const data = JSON.parse(req.body.data)
  let resultsToSend = {
    success: false,
    data: ""
  };
  let attemptingUser = {
    password: data.password,
    email: data.email
  };
  if (attemptingUser.email != null && attemptingUser.email != '' &&
    attemptingUser.password != null && attemptingUser.password.length > 1) {
    let result = await mongo.findOne('users', { email: attemptingUser.email }, includeId=true);
    if (result["success"] && result["data"] != null) {
      const user = result["data"].result;
      const match = await bcrypt.compare(attemptingUser.password, user.password);
      if (match) {
        const accessToken = await createUserToken(user);
        resultsToSend["success"] = true;
        resultsToSend["data"] = "login success";
        resultsToSend["token"] = accessToken;
        res.append('authorization', accessToken);
        res.append('name', user.username);
        res.append('admin', user.is_admin);
        res.status(okCode).send();
      } else {
        res.statusMessage = "Invalid password";
        res.status(clientReqHasProblem).send();
      }
    }
   else {
    res.statusMessage = "Invalid email";
    res.status(clientReqHasProblem).send();
  }}
});

/* POST register new user. */
router.post("/register", async (req, res, next) => {
  const data = JSON.parse(req.body.data);
  let resultsToSend = {
    success: false,
    data: ""
  };
  let attemptingUser = {
    username: data.userName,
    password: data.password,
    email: data.email,
    is_admin: false,
    api_keys: { binance: data.apiKey }
  };

  if (attemptingUser.username != null && attemptingUser.username != '' &&
    attemptingUser.password != null && attemptingUser.password.length > 1 &&
    attemptingUser.email != null && attemptingUser.email.indexOf('@') != -1 &&
    attemptingUser.api_keys != null) {
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
        let resultInsertUser = await mongo.insertOne('users', attemptingUser);
        if (resultInsertUser["success"] && resultInsertUser["data"] === "inserted successfully.") {
          let findCreatedUser = await mongo.findOne('users', attemptingUser, includeId=true);
          let userIndexes = {
            user_id: findCreatedUser.data.result._id,
            indexes: []
          };
          let resultInsertUserIndexes = await mongo.insertOne('users_indexes', userIndexes);
          if (resultInsertUserIndexes["success"] && resultInsertUserIndexes["data"] === "inserted successfully.") {
            const accessToken = await createUserToken(findCreatedUser.data.result);
            res.append('authorization', accessToken);
            res.append('name', findCreatedUser.data.result.username);
            res.append('admin', findCreatedUser.data.result.is_admin);
            res.status(okCode).send();
          } else {
            res.statusMessage = resultInsertUserIndexes["data"];
            res.status(serverErrorCode).send();
          }
        } else {
          res.statusMessage = resultInsertUser["data"];
          res.status(serverErrorCode).send();
        }
      } else {
        res.statusMessage = resultsToSend["data"];
        res.status(clientReqHasProblem).send();
      }
    } else {
      res.statusMessage = resultsToSend["data"];
      res.status(clientReqHasProblem).send();
    }
  } else {
    res.statusMessage = "Invalid username or password";
    res.status(clientReqHasProblem).send();
  }
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
router.post("/create-new-index", async (req, res, next) => {
  let data = JSON.parse(req.body.data);
  let index_hash = costumeHash(JSON.stringify(data.symbolToPrice));
  let isIndexExist = await mongo.findAll('indexes', { index_hash: index_hash });

  let userTokenTemp = await decriptUserFromToken(data.userToken);
  const userFromToken = new ObjectID(userTokenTemp);

  let user = await mongo.findOne('users', { _id: userFromToken }, includeId=true);
  let userFromUsersIndexes = await mongo.findOne('users_indexes', { user_id: userFromToken }, includeId=true);
  let isUserIndexNameExist = await mongo.findOne('users_indexes', { user_id: userFromToken, indexes: {$elemMatch: {name: data.indexName}} }, includeId=true);
  let isUserIndexExist = await mongo.findOne('users_indexes', { user_id: userFromToken, indexes: {$elemMatch: {index_hash: index_hash}} }, includeId=true);
  if(isIndexExist.success) {
    /*
      index already exist
    */
    //create or update users_indexes by user_id
    if(userFromUsersIndexes.success) {
      if (!isUserIndexNameExist.success) {
        if (!isUserIndexExist.success) {
          //user found and index is not created and index name is not created by him
          userFromUsersIndexes.data.result.indexes.push({
            index_hash: index_hash,
            name: data.indexName,
            is_private: true,
            funding: {amount: '0', date: ''}
          });
          let updateUserIndexes = await mongo.updateOne('users_indexes', { user_id: userFromToken }, {indexes: userFromUsersIndexes.data.result.indexes}, includeId=true);
          if (updateUserIndexes.success && updateUserIndexes.data.modifiedCount === 1) {
            res.status(okCode).send();
          } else {
            res.status(serverErrorCode).send();
          }
        } else {
          //index is already created by him
          res.statusMessage = "You have already created this Index.";
          res.status(clientReqHasProblem).send();
        }
      } else {
        //index name already taken
        res.statusMessage = "This Index name is already taken.";
        res.status(clientReqHasProblem).send();
      }
    } else {
      //user not found
      res.statusMessage = "This user has a problem, try to contact us for support.";
      res.status(clientReqHasProblem).send();
    }
  } else {
    /*
      first time creating the index
    */
      let result = await mongo.insertOne('indexes', {
        index_hash: index_hash,
        creator_username: user.data.result.username,
        symbols_weight: data.symbolToPrice
      });  
      if(result.success) {
        //user found and index is not created
        userFromUsersIndexes.data.result.indexes.push({
          index_hash: index_hash,
          name: data.indexName,
          is_private: false,
          funding: {amount: '0', date: ''}
        });
        let updateUserIndexes = await mongo.updateOne('users_indexes', { user_id: userFromToken }, {indexes: userFromUsersIndexes.data.result.indexes}, includeId=true);
        if (updateUserIndexes.success && updateUserIndexes.data.modifiedCount === 1) {
          res.status(okCode).send();
        } else {
          res.status(serverErrorCode).send();
        }
      } else {
        res.status(serverErrorCode).send();
      }
  }
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
  let initialCash = req.query.initialCash;
  if(!!!initialCash) {
    initialCash = 1000;
  }
  if (data) {
    let python = spawn(pythonCommand, ['../CryptoIndexer-Server/BacktestCustomIndex.py', JSON.stringify(data), initialCash]);
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

router.get("/backtest-exist-index", async (req, res, next) => {
  //TODO - get the symbols and weights from the mongo then backtest with the cash from the front
  let indexHash = req.query.data;
  let initialCash = req.query.initialCash;
  if(!!!initialCash) {
    initialCash = 1000;
  }
  if (indexHash) {
    let indexData = await mongo.findOne('indexes', { index_hash: indexHash });
    if(indexData.success) {
      let symbols_weight = []
      for (let i = 0; i < indexData.data.result.symbols_weight.length; i++) {
        symbols_weight.push({symbol: indexData.data.result.symbols_weight[i].symbol, weight: parseFloat(indexData.data.result.symbols_weight[i].weight)})
      }
      let python = spawn(pythonCommand, ['../CryptoIndexer-Server/BacktestExistingCustomIndex.py', JSON.stringify(symbols_weight), initialCash]);
      let backtestResult = null;
      python.stdout.on("data", (data) => { 
       backtestResult = JSON.parse(data); 
      });
      python.on("close", (code) => {
        console.log('Python finished with code ' + code);
        res.send(backtestResult);
      });
    } else {
      res.send({success: false, data: indexData.data});
    }
  } else {
    res.send({success: false, data: 'Error accourd'});
  }
});

/***************** DataBase Utills API *****************/
router.get("/supported-symbols-list", async (req, res, next) => {  
  let python = spawn(pythonCommand, ['../CryptoIndexer-Server/GetAllSymbolsInfo.py']);
  let result = {"success": false, "data": 'Python Error'};
  
  python.stderr.setEncoding('utf-8');
  python.stderr.on("data", (data) =>
  {
    console.log(data.toString())
  });
  
  python.stdout.setEncoding('utf-8');
  python.stdout.on("data", (data) => { 
    result = JSON.parse(data); 
  });

  python.on("close", (code) => {
    console.log('Python finished with code ' + code);
    res.send(result);
  });
});

router.get("/home-page-supported-symbols-list", async (req, res, next) => {  
  let python = spawn(pythonCommand, ['../CryptoIndexer-Server/GetAllSymbolsPrices.py']);
  let result = {"success": false, "data": 'Python Error'};
  
  python.stderr.setEncoding('utf-8');
  python.stderr.on("data", (data) =>
  {
    console.log(data.toString())
  });
  
  python.stdout.setEncoding('utf-8');
  python.stdout.on("data", (data) => { 
    result = JSON.parse(data); 
  });

  python.on("close", (code) => {
    console.log('Python finished with code ' + code);
    res.send(result);
  });
});

router.get("/all-indexes-list", async (req, res, next) => {
  let data = JSON.parse(req.query.data);
  let indexesList = [];
  let symbolWeightForWeeklyGain = []
  let isValid = true;
  let indexesResult = await mongo.findAll('indexes', { creator_username: { $ne: data.userName } });
  if(indexesResult.success) {
    for(let i=0; i < indexesResult.data.count && isValid; i++){
      let creatorUser = await mongo.findOne('users', { username: indexesResult.data.result[i].creator_username }, includeId=true);
      if(creatorUser.success) {
        let creatorId = new ObjectId(creatorUser.data.result._id);
        let creatorUserIndex = await mongo.findOne('users_indexes', { user_id: creatorId });
        if(creatorUserIndex.success) {
          let createdIndexName = creatorUserIndex.data.result.indexes.filter(indexObject => indexObject.index_hash === indexesResult.data.result[i].index_hash);
          let symbols_weight = []
          for (let j = 0; j < indexesResult.data.result[i].symbols_weight.length; j++) {
            symbols_weight.push({symbol: indexesResult.data.result[i].symbols_weight[j].symbol, weight: parseFloat(indexesResult.data.result[i].symbols_weight[j].weight)})
          }
          symbolWeightForWeeklyGain.push(symbols_weight);
          let getInvestingUsers = await mongo.findAll('users_indexes', { indexes: {$elemMatch: { index_hash: indexesResult.data.result[i].index_hash }} });
          if(getInvestingUsers.success) {
            let countInvestingUsers = getInvestingUsers.data.count;
            indexesList.push({
              indexName: createdIndexName[0].name,
              creatorName: indexesResult.data.result[i].creator_username,
              creatorId: creatorUser.data.result._id,
              investingCount: countInvestingUsers,
              indexHash: indexesResult.data.result[i].index_hash,
            });  
          } else {
            isValid = false;
          }
        } else {
          isValid = false;
        }
      } else {
        isValid = false;
      }
    }
    if(isValid) {
      let python = spawn(pythonCommand, ['../CryptoIndexer-Server/IndexesWeeklyGains.py', JSON.stringify(symbolWeightForWeeklyGain)]);
      let weeklyGains = null;
      python.stdout.on("data", (data) => { 
        weeklyGains = JSON.parse(data); 
      });
      python.on("close", (code) => {
        console.log('Python finished with code ' + code);
        indexesList.map((indexObject, i) => indexObject.weeklyGain = weeklyGains.data[i]);
        res.send({success: true, data: { result: indexesList }})
      });
    } else {
      res.send({success: false, data: 'An Error occurred, try again later'});
    }
  } else {
    res.send(result)
  }
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
  let allIndexes = await mongo.findAll('indexes');
  let top10IndexesByUsersCount = [];
  if(allIndexes.data.count > 0) {
    allIndexes.data.result.map(async (indexObject) => {
      let usersCount = await mongo.findAll('users_indexes', {'indexes.index_hash': indexObject.index_hash});
      top10IndexesByUsersCount.push({indexName: indexObject.name, creator_username: indexObject.creatorUsername, countOfUsers: usersCount["data"].count});
    });
    top10IndexesByUsersCount.sort((a, b) => (a.countOfUsers > b.countOfUsers) ? 1 : -1)
    console.log(top10IndexesByUsersCount.slice(0,10));
    // console.log(result.data[0].api_keys['binance']);
    res.send(top10IndexesByUsersCount.slice(0,10))
  } else {
    res.send(allIndexes);
  }
});

router.get("/own-indexes", async (req, res, next) => {
  let data = req.query.data;
  let userTokenTemp = await decriptUserFromToken(data);
  const userFromToken = new ObjectID(userTokenTemp.id);
  let indexesToPass = [];
  let userIndexes = await mongo.findOne('users_indexes', { user_id: userFromToken });
  let user = await mongo.findOne('users', { _id: userFromToken });
  let indexesList = [];
  if(userIndexes.success && user.success) {
    userIndexes = userIndexes.data.result.indexes;
    for (let indexNumber = 0; indexNumber < userIndexes.length; indexNumber++) {
      let indexData = await mongo.findOne('indexes', { index_hash: userIndexes[indexNumber].index_hash });
      let countInvestingUsers = 0;
      let canBePublic = false;
      let investedAmount = 0;
      if(indexData.success) {
        let symbols_weight = []
        for (let i = 0; i < indexData.data.result.symbols_weight.length; i++) {
          symbols_weight.push({symbol: indexData.data.result.symbols_weight[i].symbol, weight: parseFloat(indexData.data.result.symbols_weight[i].weight)})
        }
        indexesList.push(symbols_weight);
        if(indexData.data.result.creator_username === user.data.result.username) {
          if(!userIndexes[indexNumber].is_private) {
            //public index
            getInvestingUsers = await mongo.findAll('users_indexes', { indexes: {$elemMatch: {index_hash: userIndexes[indexNumber].index_hash}} }, includeId=true);
            if(getInvestingUsers.success) {
              countInvestingUsers = getInvestingUsers.data.count;
              investedAmount = parseInt(getInvestingUsers.data.result[0].indexes[0].funding.amount);
            }
          } else {
            //private index but can be public
            canBePublic = true;
          }
        }
        indexesToPass.push({
          indexHash: indexData.data.result.index_hash,
          indexName: userIndexes[indexNumber].name,
          investingUsers: countInvestingUsers,
          isPrivate: userIndexes[indexNumber].is_private,
          canBePublic: canBePublic,
          investedAmount: investedAmount,
        });
      } else {
        res.send({success: false, data: indexData.data});
      }
    }

    let python = spawn(pythonCommand, ['../CryptoIndexer-Server/IndexesWeeklyGains.py', JSON.stringify(indexesList)]);
    let weeklyGains = null;
    python.stdout.on("data", (data) => { 
      weeklyGains = JSON.parse(data); 
    });
    python.on("close", (code) => {
      console.log('Python finished with code ' + code);
      res.send({success: true, data: {result: indexesToPass, weeklyGains: weeklyGains.data}})
    });
  } else {
    res.send({success: false, data: userIndexes.data});
  }
});

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

router.post("/buy-or-sell-index", async (req, res, next) => {
  const data = JSON.parse(req.body.data);
  let userTokenTemp = await decriptUserFromToken(data.userToken);
  const userFromToken = new ObjectID(data.isOwnIndex ? userTokenTemp: data.creatorId);
  let indexFromDB = await mongo.findOne('users_indexes', {
    user_id: userFromToken,
    indexes: {$elemMatch: {name: data.indexName}}
  });
  if(indexFromDB.success) {
    //found the index
    sleep(1000).then(async () => {
      let indexFromUser = indexFromDB.data.result.indexes.find((indexObject) => indexObject.name === data.indexName);
      let isExistTransactionResult = await mongo.findOne('transactions', {
          user_id: userFromToken,
          index_hash: indexFromUser.index_hash,
        });
      if(isExistTransactionResult.success && isExistTransactionResult.data.count > 0) {
        //transaction exist
        let tempFunding = isExistTransactionResult.data.result.funding;
        tempFunding.push(data.transactionData);
        let updateResult = await mongo.updateOne('transactions', {
          user_id: userFromToken,
          index_hash: indexFromUser.index_hash,
        }, { funding: tempFunding });
        if(updateResult.success && updateResult.data.modifiedCount === 1) {
          let sumOfFunding = 0;
          for(let i = 0; i < tempFunding.length; i++) {
            sumOfFunding += parseInt(tempFunding[i].amount);;
          }
          indexFromDB.data.result.indexes.map((indexObject) => {
            if(indexObject.index_hash === indexFromUser.index_hash) {
              indexObject.funding = { amount: `${sumOfFunding}`, date: data.transactionData.date}
            }
          });
          let result = await mongo.updateOne('users_indexes', {user_id: indexFromDB.data.result.user_id }, { indexes: indexFromDB.data.result.indexes });
          if(result.success && result.data.modifiedCount === 1) {
            res.status(okCode).send();
          } else {
            res.statusMessage = result.success ? 'Someting went wrong...' : result.data;
            res.status(serverErrorCode).send();
          }
        } else {
          res.statusMessage = updateResult.data;
          res.status(serverErrorCode).send();
        }
      } else {
        //transaction doesn't exist
        let insertResult = await mongo.insertOne('transactions', {
          user_id: userFromToken,
          index_hash: indexFromUser.index_hash,
          funding: [data.transactionData],
        });
        if (insertResult.success && insertResult.data === "inserted successfully.") {
          let result = await mongo.updateOne('users_indexes', {user_id: indexFromDB.data.result.user_id }, { indexes: [data.transactionData] });
          if(result.success && result.data.modifiedCount === 1) {
            res.status(okCode).send();
          } else {
            res.statusMessage = result.success ? 'Someting went wrong...' : result.data;
            res.status(serverErrorCode).send();
          }
        } else {
          res.statusMessage = insertResult.data;
          res.status(serverErrorCode).send();
        }
      }
    });
  } else {
    //index have not found
    res.statusMessage = "couldn't find the index, try to contact us for support.";
    res.status(clientReqHasProblem).send();
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
router.get("/reported-bugs", async (req, res, next) => {
  let dataToPass = [];
  const bugsList = await mongo.findAll("bugs");
  let isValid = true;
  if(bugsList.success) {
    if(bugsList.data.count) {
      for (let bugNumber = 0; bugNumber < bugsList.data.count && isValid; bugNumber++) {
        let userId = new ObjectID(bugsList.data.result[bugNumber].reporterId);
        let user = await mongo.findOne('users', { _id: userId });
        if(user.success) {
          dataToPass.push({
            reportedName: user.data.result.username,
            insertDate: bugsList.data.result[bugNumber].insertDate,
            title: bugsList.data.result[bugNumber].title,
            description: bugsList.data.result[bugNumber].description,
            isDone: bugsList.data.result[bugNumber].isDone,
          });
        } else {
          isValid = false;
        }
      }
      if(isValid) {
        let doneBugs = await mongo.findAll("bugs", { isDone: true });
        if(doneBugs.success || doneBugs.data.result === "No documents found!") {
          res.send({success: true, data: {result: dataToPass, doneBugsCount: doneBugs.data.count}});
        } else {
          res.send(bugsList);
        }
      } else {
        res.send({success: false, data: 'An Error occurred, try again later'});
      }
    } else {
      res.send(bugsList);
    }
  } else {
    res.send(bugsList);
  }
});

/* INSERT bug to the database. */
router.post("/insert-bug", async (req, res, next) => {
  const data = JSON.parse(req.body.data);
  const user = await decriptUserFromToken(data.reporterToken);
  let userId = new ObjectID(user.id);
  let result = await mongo.insertOne('bugs', {
    title: data.title,
    description: data.description,
    reporterId: userId,
    insertDate: data.insertDate,
    isDone: false,
  });
  if(result.success) {
    res.status(okCode).send();
  } else {
    res.status(serverErrorCode).send();
  }
});

/* DELETE bug from the database. */
router.get("/update-bug", async (req, res, next) => {
  const data = JSON.parse(req.query.data);
  let reportedUser = await mongo.findOne('users', {username: data.reporterName}, includeId=true);
  if(reportedUser.success) {
    let udpateResult = await mongo.updateOne('bugs', {
      title: data.title,
      description: data.description,
      reporterId: reportedUser.data.result._id,
      insertDate: data.insertDate,
      isDone: data.isDone,
    },{isDone: !data.isDone});
    if(udpateResult.success) {
      res.send(udpateResult);
    } else {
      res.send(udpateResult);
    }
  } else {
    res.send(reportedUser);
  }
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
